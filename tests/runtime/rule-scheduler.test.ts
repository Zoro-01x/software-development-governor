import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConstitutionEngine } from '../../src/constitution/constitution-engine.js';
import { buildDefaultGraphDefinition, DEFAULT_ALLOWANCES, KNOWN_RULE_IDS } from '../../src/runtime/default-graph.js';
import { GovernanceContextBuilder } from '../../src/runtime/context.js';
import { RuleEvaluatorPort, RuntimeEngine } from '../../src/runtime/engine.js';
import { RuntimeIntegrityError } from '../../src/runtime/errors.js';
import { GovernanceGraph } from '../../src/runtime/graph.js';
import { PolicyDispatcher } from '../../src/runtime/policy-dispatcher.js';
import { PolicyEngine } from '../../src/runtime/policy-engine.js';
import { RuleScheduler } from '../../src/runtime/rule-scheduler.js';
import { GovernanceContext } from '../../src/runtime/types.js';

const FIXED_NOW = '2026-08-02T12:00:00.000Z';
const builder = new GovernanceContextBuilder({ strictManifest: false });
const graph = new GovernanceGraph(buildDefaultGraphDefinition(), { knownRuleIds: KNOWN_RULE_IDS });
const scheduler = new RuleScheduler(graph);

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    type: 'implementation',
    rawText: 'Implement the login flow',
    normalizedIntent: 'implementation:login',
    requirementIds: ['R-1'],
    ...overrides,
  };
}

function buildCtx(overrides: Record<string, unknown> = {}): GovernanceContext {
  return builder.build({
    requestId: 'req-1',
    phase: 'planning',
    gate: 'pre',
    request: makeRequest(),
    producers: [],
    builtAt: FIXED_NOW,
    ...overrides,
  });
}

describe('RuleScheduler — activate() (COMPONENT-4 spec §6)', () => {
  it('returns the GateSpec for gate nodes', () => {
    expect(scheduler.activate('planning-pre')).toEqual({
      id: 'planning-pre',
      phase: 'planning',
      gate: 'pre',
      ruleIds: ['E-001', 'S-011', 'S-006'],
    });
    expect(scheduler.activate('completion-final').ruleIds).toHaveLength(KNOWN_RULE_IDS.length);
  });

  it('returns the GateSpec for action nodes', () => {
    expect(scheduler.activate('clarification-pre')).toEqual({
      id: 'clarification-pre',
      phase: 'clarification',
      gate: 'pre',
      ruleIds: ['S-005'],
    });
  });

  it('throws RuntimeIntegrityError for entry, phase, terminal, and unknown nodes', () => {
    expect(() => scheduler.activate('request-received-pre')).toThrow(RuntimeIntegrityError);
    expect(() => scheduler.activate('memory-update-pre')).toThrow(RuntimeIntegrityError);
    expect(() => scheduler.activate('blocked')).toThrow(RuntimeIntegrityError);
    expect(() => scheduler.activate('ghost')).toThrow(RuntimeIntegrityError);
  });

  it('next() is pure delegation to the graph', () => {
    expect(scheduler.next('planning-pre', 'ALLOW')).toBe(graph.next('planning-pre', 'ALLOW'));
    expect(scheduler.next('human-approval-pre', 'ALLOW', 'planning-pre')).toBe(
      graph.next('human-approval-pre', 'ALLOW', 'planning-pre'),
    );
  });
});

describe('RuleScheduler — zero workflow logic (source conformance)', () => {
  it('contains no rule-id conditionals, lattice logic, phase knowledge, or decision conditionals', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'runtime', 'rule-scheduler.ts'), 'utf8');
    expect(source).not.toMatch(/\b[ES]-0\d{2}\b/);
    expect(source).not.toMatch(/DECISION_LATTICE/);
    expect(source).not.toMatch(/PHASE_ORDER/);
    expect(source).not.toMatch(/'(BLOCK|RETRY|ARCHIVE|ALLOW|RETRIEVE_EVIDENCE|ASK_FOR_CLARIFICATION|REQUIRE_APPROVAL|NO_ACTION_REQUIRED)'/);
  });
});

// Full-chain routing: real ConstitutionEngine rules → PolicyDispatcher → PolicyEngine
// → RuntimeEngine produce a decision; the RuleScheduler routes it on the default graph.
const constitution = new ConstitutionEngine();

function constitutionInput(ctx: GovernanceContext) {
  return {
    request: ctx.request,
    experienceApproval: ctx.approvals.granted.find((g) => g.target === 'experience-architecture'),
    requirements: ctx.requirements,
    requirementInterpretations: ctx.interpretations,
    assumptions: ctx.assumptions,
    decisions: ctx.approvals.granted,
    artifacts: ctx.evidence.artifacts,
    changes:
      ctx.task.id.length > 0
        ? [{ id: ctx.task.id, requirementIds: ctx.task.requirementIds, hunks: ctx.task.hunks }]
        : [],
    claims: ctx.claims,
    verificationRuns: ctx.evidence.verificationRuns,
    build: ctx.evidence.build,
    dependencies: ctx.evidence.dependencies,
    resolvedDependencyGraph: ctx.evidence.resolvedDependencyGraph,
    architecture: ctx.evidence.architecture,
    environment: ctx.environment,
  };
}

const rulesPort: RuleEvaluatorPort = {
  evaluate: (ruleId, ctx) => {
    const outcome = constitution.execute(constitutionInput(ctx), [ruleId]).results[0].outcome;
    return outcome === 'fail' ? 'fail' : 'pass';
  },
  ruleName: (ruleId) => constitution.rule(ruleId)?.name ?? `Rule ${ruleId}`,
};

function makeEngine() {
  return new RuntimeEngine({
    rules: rulesPort,
    policy: new PolicyDispatcher(new PolicyEngine()),
    clock: { now: () => FIXED_NOW },
    builder: new GovernanceContextBuilder({ strictManifest: false }),
  });
}

describe('default graph routing with real decisions (Component 10 integration shape)', () => {
  it('E-001 → REQUIRE_APPROVAL routes to human-approval-pre (guarded)', () => {
    const result = makeEngine().stepGate(buildCtx(), {
      id: 'planning-pre',
      phase: 'planning',
      gate: 'pre',
      ruleIds: ['E-001'],
    });
    expect(result.decision).toBe('REQUIRE_APPROVAL');
    expect(scheduler.next('planning-pre', result.decision)).toBe('human-approval-pre');
  });

  it('S-004 → ASK_FOR_CLARIFICATION routes to clarification-pre (budget clarify)', () => {
    const result = makeEngine().stepGate(
      buildCtx({ claims: [{ id: 'c1', text: 'intent', targetArtifactId: 'a1', unverifiable: true }] }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['S-004'] },
    );
    expect(result.decision).toBe('ASK_FOR_CLARIFICATION');
    expect(scheduler.next('planning-pre', result.decision)).toBe('clarification-pre');
  });

  it('S-008 absent build → RETRIEVE_EVIDENCE routes to self (budget retrieve)', () => {
    const result = makeEngine().stepGate(buildCtx({ phase: 'build' }), {
      id: 'build-pre',
      phase: 'build',
      gate: 'pre',
      ruleIds: ['S-008'],
    });
    expect(result.decision).toBe('RETRIEVE_EVIDENCE');
    expect(scheduler.next('build-pre', result.decision)).toBe('build-pre');
  });

  it('S-008 unpinned → BLOCK routes to the blocked terminal', () => {
    const result = makeEngine().stepGate(
      buildCtx({
        phase: 'build',
        evidence: {
          build: { inputFingerprint: 'f', outputHashes: ['a', 'a'], nonDeterminismSources: [] },
          dependencies: [{ name: 'lodash', version: '^4.17.0' }],
        },
      }),
      { id: 'build-pre', phase: 'build', gate: 'pre', ruleIds: ['S-008'] },
    );
    expect(result.decision).toBe('BLOCK');
    expect(scheduler.next('build-pre', result.decision)).toBe('blocked');
  });

  it('ALLOW advances along the default chain (PHASE_ORDER as data)', () => {
    const result = makeEngine().stepGate(
      buildCtx({
        requirements: [
          {
            id: 'R-1',
            text: 'Do it',
            status: 'approved',
            approval: {
              decisionId: 'dec-a',
              decision: 'EXECUTE',
              reason: 'ok',
              validationReportId: 'v',
              governanceChecks: 'PASS',
              timestamp: FIXED_NOW,
              target: 'requirement-amendment',
              authorizedBy: 'h',
            },
          },
        ],
      }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['S-001'] },
    );
    expect(result.decision).toBe('ALLOW');
    expect(scheduler.next('planning-pre', result.decision)).toBe('planning-post');
  });

  it('human-approval-pre resumes to origin on approval, else completes (linear fallback)', () => {
    expect(scheduler.next('human-approval-pre', 'ALLOW', 'planning-pre')).toBe('planning-pre');
    expect(scheduler.next('human-approval-pre', 'ALLOW')).toBe('completion-final');
    expect(scheduler.next('human-approval-pre', 'REQUIRE_APPROVAL')).toBe('human-approval-pre');
  });

  it('the full decision lattice resolves exactly one node per (node, decision) on the default graph', () => {
    const decisions = [
      'ALLOW',
      'BLOCK',
      'REQUIRE_APPROVAL',
      'ASK_FOR_CLARIFICATION',
      'RETRIEVE_EVIDENCE',
      'RETRY',
      'ARCHIVE',
      'NO_ACTION_REQUIRED',
    ] as const;
    for (const node of [
      'planning-pre',
      'build-pre',
      'memory-update-pre',
      'clarification-pre',
      'human-approval-pre',
      'completion-final',
    ]) {
      for (const decision of decisions) {
        expect(typeof scheduler.next(node, decision)).toBe('string');
      }
    }
  });

  it('declares the GRA §5 budgets as data', () => {
    expect(DEFAULT_ALLOWANCES).toEqual({ clarify: 3, retry: 2, retrieve: 2, archive: 1 });
  });
});
