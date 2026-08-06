import { createHash } from 'crypto';
import { GovernanceContextBuilder } from './context.js';
import { RuntimeIntegrityError } from './errors.js';
import {
  getRequiredState,
  getRuleInputs,
  isWorkClaimed,
} from './required-state.js';
import {
  AuditAffectedObject,
  AuditEntry,
  AuditEvidenceRef,
  AuditObjectKind,
  DECISION_LATTICE,
  GateKind,
  GovernanceContext,
  PhaseName,
  PHASE_ORDER,
  ProducerManifestEntry,
  RuleDecision,
} from './types.js';

// GRA §0 — the engine is the governor: it decides, it never performs work.
// Deterministic immutable state machine: every gate consumes one immutable context,
// produces a new immutable context plus a complete audit trail (nothing silent, GRA §6).

export interface GateSpec {
  id: string;
  phase: PhaseName;
  gate: GateKind;
  ruleIds: string[];
}

// Ports — the engine has zero knowledge of rule internals or any specific model.
export interface RuleEvaluatorPort {
  evaluate(ruleId: string, ctx: GovernanceContext): 'pass' | 'fail';
  ruleName(ruleId: string): string;
}

export interface PolicyPort {
  // GRA §4 fail-action refinement: what a rule's failure means in this context.
  failAction(ruleId: string, ctx: GovernanceContext): RuleDecision;
}

export interface Clock {
  now(): string;
}

export interface RuleContribution {
  ruleId: string;
  ruleName: string;
  outcome: 'pass' | 'fail' | 'na';
  decision: RuleDecision;
  vacuous: boolean;
}

export interface EngineStepResult {
  decision: RuleDecision;
  contributions: RuleContribution[];
  audit: AuditEntry[];
  after: GovernanceContext;
  nextPhase: PhaseName | null;
}

// Deterministic canonical serialization (sorted keys) so equal entries seal to equal hashes.
export function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalStringify((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

// GRA §6 — seal an entry into the request's hash chain.
export function sealEntry(
  entry: Omit<AuditEntry, 'hash' | 'prevHash'>,
  prevHash: string | null,
): AuditEntry {
  const sealed: AuditEntry = {
    ...entry,
    prevHash,
    hash: '',
  };
  const payload = canonicalStringify({ ...sealed, hash: undefined });
  sealed.hash = createHash('sha256').update(payload).digest('hex');
  return sealed;
}

function synthesize(contributions: RuleContribution[]): RuleDecision {
  if (contributions.length === 0) return 'ALLOW';
  let max: RuleDecision = 'NO_ACTION_REQUIRED';
  for (const c of contributions) {
    if (DECISION_LATTICE[c.decision] > DECISION_LATTICE[max]) max = c.decision;
  }
  return max;
}

function nextPhaseOf(phase: PhaseName): PhaseName | null {
  const index = PHASE_ORDER.indexOf(phase);
  if (index === -1 || index === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[index + 1];
}

function phaseAdvances(decision: RuleDecision): boolean {
  return decision === 'ALLOW' || decision === 'NO_ACTION_REQUIRED';
}

function manifestForField(manifest: ProducerManifestEntry[], field: string): ProducerManifestEntry[] {
  return manifest.filter((m) => m.field === field);
}

function affectedObjectsFor(ctx: GovernanceContext, ruleId: string): AuditAffectedObject[] {
  const objects: AuditAffectedObject[] = [];
  const push = (kind: AuditObjectKind, id: string) => objects.push({ kind, id });

  for (const input of getRuleInputs(ruleId)) {
    switch (input) {
      case 'request':
        push('request', ctx.request.id);
        break;
      case 'requirements':
        for (const r of ctx.requirements) push('requirement', r.id);
        break;
      case 'claims':
        for (const c of ctx.claims) push('artifact', c.targetArtifactId);
        break;
      case 'evidence.artifacts':
        for (const a of ctx.evidence.artifacts) push('artifact', a.id);
        break;
      case 'evidence.verificationRuns':
        for (const run of ctx.evidence.verificationRuns) push('artifact', run.targetArtifactId);
        break;
      case 'evidence.dependencies':
        for (const d of ctx.evidence.dependencies) push('dependency', d.name);
        break;
      case 'evidence.resolvedDependencyGraph':
        for (const name of ctx.evidence.resolvedDependencyGraph) push('dependency', name);
        break;
      case 'approvals.granted':
        for (const g of ctx.approvals.granted) push('approval', g.decisionId);
        break;
      case 'task':
        if (ctx.task.id.length > 0) push('change', ctx.task.id);
        break;
      default:
        break;
    }
  }
  return objects;
}

function evidenceRefsFor(ctx: GovernanceContext, ruleId: string): AuditEvidenceRef[] {
  const refs: AuditEvidenceRef[] = [];
  for (const input of getRuleInputs(ruleId)) {
    for (const entry of manifestForField(ctx.meta.producerManifest, input)) {
      refs.push({ kind: 'producer-manifest', id: input, version: entry.version, reference: entry.producer });
    }
  }
  return refs;
}

export class RuntimeEngine {
  private readonly rules: RuleEvaluatorPort;
  private readonly policy: PolicyPort;
  private readonly clock: Clock;
  private readonly builder: GovernanceContextBuilder;

  constructor(deps: {
    rules: RuleEvaluatorPort;
    policy: PolicyPort;
    clock?: Clock;
    builder?: GovernanceContextBuilder;
  }) {
    this.rules = deps.rules;
    this.policy = deps.policy;
    this.clock = deps.clock ?? { now: () => new Date().toISOString() };
    this.builder = deps.builder ?? new GovernanceContextBuilder();
  }

  // GRA §2/§4 — execute one gate against one immutable context.
  stepGate(ctx: GovernanceContext, gate: GateSpec): EngineStepResult {
    if (gate.ruleIds.length === 0) {
      throw new RuntimeIntegrityError(`RuntimeEngine: gate "${gate.id}" has no rules assigned`);
    }

    const contributions: RuleContribution[] = [];
    const seen = new Set<string>();

    for (const ruleId of gate.ruleIds) {
      if (seen.has(ruleId)) {
        throw new RuntimeIntegrityError(`RuntimeEngine: duplicate rule "${ruleId}" in gate "${gate.id}"`);
      }
      seen.add(ruleId);

      let ruleName: string;
      try {
        ruleName = this.rules.ruleName(ruleId);
      } catch {
        throw new RuntimeIntegrityError(`RuntimeEngine: unknown rule "${ruleId}" in gate "${gate.id}"`);
      }

      // GRA §4 vacuous-pass policy: work-claimed discriminator first.
      if (!isWorkClaimed(ctx, ruleId)) {
        contributions.push({
          ruleId,
          ruleName,
          outcome: 'na',
          decision: 'NO_ACTION_REQUIRED',
          vacuous: true,
        });
        continue;
      }

      const required = getRequiredState(ctx, ruleId);
      if (!required.present) {
        contributions.push({
          ruleId,
          ruleName,
          outcome: 'na',
          decision: 'RETRIEVE_EVIDENCE',
          vacuous: true,
        });
        continue;
      }

      const outcome = this.rules.evaluate(ruleId, ctx);
      const decision: RuleDecision =
        outcome === 'pass' ? 'ALLOW' : this.policy.failAction(ruleId, ctx);
      contributions.push({ ruleId, ruleName, outcome, decision, vacuous: false });
    }

    // GRA §4 merge: max over the lattice, order-independent.
    let decision = synthesize(contributions);

    // GRA §4 approval coupling: missing approvals force at least REQUIRE_APPROVAL.
    if (ctx.approvals.missing.length > 0) {
      if (DECISION_LATTICE[decision] < DECISION_LATTICE.REQUIRE_APPROVAL) {
        decision = 'REQUIRE_APPROVAL';
      }
    }

    // GRA §6 — audit: nothing silent.
    const timestamp = this.clock.now();
    const entries: AuditEntry[] = [];
    let prevHash: string | null =
      ctx.audit.length > 0 ? ctx.audit[ctx.audit.length - 1].hash : null;
    let seq = 1;

    for (const contribution of contributions) {
      entries.push(
        sealEntry(
          {
            id: `${ctx.meta.requestId}:${gate.id}:${seq++}`,
            requestId: ctx.meta.requestId,
            revision: ctx.meta.revision,
            phase: gate.phase,
            gate: gate.gate,
            timestamp,
            ruleId: contribution.ruleId,
            ruleName: contribution.ruleName,
            outcome: contribution.outcome,
            decision: contribution.decision,
            vacuous: contribution.vacuous,
            evidence: evidenceRefsFor(ctx, contribution.ruleId),
            reason: contributionReason(contribution),
            affectedObjects: affectedObjectsFor(ctx, contribution.ruleId),
            actor: 'runtime',
          },
          prevHash,
        ),
      );
      prevHash = entries[entries.length - 1].hash;
    }

    entries.push(
      sealEntry(
        {
          id: `${ctx.meta.requestId}:${gate.id}:${seq}`,
          requestId: ctx.meta.requestId,
          revision: ctx.meta.revision,
          phase: gate.phase,
          gate: gate.gate,
          timestamp,
          ruleId: 'SYNTHESIS',
          ruleName: 'gate decision synthesis',
          outcome: decision === 'ALLOW' || decision === 'NO_ACTION_REQUIRED' ? 'pass' : 'fail',
          decision,
          vacuous: false,
          evidence: [],
          reason: synthesizeReason(contributions, decision),
          affectedObjects: [{ kind: 'request', id: ctx.request.id }],
          actor: 'runtime',
        },
        prevHash,
      ),
    );

    // GRA §3 invariant — produce a NEW immutable context (never mutate the input).
    const nextPhase = phaseAdvances(decision) ? nextPhaseOf(gate.phase) : null;
    const after = this.builder.build({
      requestId: ctx.meta.requestId,
      revision: ctx.meta.revision,
      phase: nextPhase ?? gate.phase,
      gate: gate.gate,
      request: ctx.request,
      goal: ctx.goal,
      task: ctx.task,
      requirements: ctx.requirements,
      interpretations: ctx.interpretations,
      assumptions: ctx.assumptions,
      claims: ctx.claims,
      evidence: ctx.evidence,
      memory: ctx.memory.entries,
      risk: ctx.risk,
      approvals: { required: ctx.approvals.required, granted: ctx.approvals.granted },
      audit: [...ctx.audit, ...entries],
      environment: ctx.environment.role,
      builtAt: timestamp,
      producers: [
        ...ctx.meta.producerManifest,
        { field: 'audit', producer: 'runtime-engine', version: '1.0.0', wroteAt: timestamp },
      ],
    });

    return { decision, contributions, audit: entries, after, nextPhase };
  }
}

function contributionReason(contribution: RuleContribution): string {
  switch (contribution.decision) {
    case 'NO_ACTION_REQUIRED':
      return `nothing to verify for ${contribution.ruleId}`;
    case 'RETRIEVE_EVIDENCE':
      return `work claimed for ${contribution.ruleId} but required state absent`;
    default:
      return `${contribution.ruleId} ${contribution.outcome}`;
  }
}

function synthesizeReason(
  contributions: RuleContribution[],
  decision: RuleDecision,
): string {
  const failing = contributions.filter((c) => c.outcome === 'fail');
  if (failing.length > 0) {
    return `decision ${decision} from failing rules: ${failing
      .map((c) => `${c.ruleId}(${c.decision})`)
      .join(', ')}`;
  }
  const retrieving = contributions.filter((c) => c.decision === 'RETRIEVE_EVIDENCE');
  if (retrieving.length > 0) {
    return `decision ${decision}: evidence expected but missing for ${retrieving
      .map((c) => c.ruleId)
      .join(', ')}`;
  }
  if (contributions.every((c) => c.decision === 'NO_ACTION_REQUIRED')) {
    return 'decision NO_ACTION_REQUIRED: nothing to verify at this gate';
  }
  return `decision ${decision} synthesized from ${contributions.length} rule contributions`;
}
