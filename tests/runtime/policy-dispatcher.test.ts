import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { ConstitutionEngine } from '../../src/constitution/constitution-engine.js';
import { GovernanceContextBuilder } from '../../src/runtime/context.js';
import { RuleEvaluatorPort, RuntimeEngine } from '../../src/runtime/engine.js';
import { RuntimeIntegrityError } from '../../src/runtime/errors.js';
import { PolicyDispatcher } from '../../src/runtime/policy-dispatcher.js';
import { PolicyEngine } from '../../src/runtime/policy-engine.js';
import { GovernanceContext, RuleDecision } from '../../src/runtime/types.js';

const FIXED_NOW = '2026-08-02T12:00:00.000Z';
const builder = new GovernanceContextBuilder({ strictManifest: false });

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

function humanConsent(target: string, id = 'dec-1') {
  return {
    decisionId: id,
    decision: 'EXECUTE' as const,
    reason: 'ok',
    validationReportId: 'v',
    governanceChecks: 'PASS',
    timestamp: FIXED_NOW,
    target,
    authorizedBy: 'h',
  };
}

describe('PolicyDispatcher — thin routing (ONTOLOGY §8)', () => {
  it('returns the target policy decision', () => {
    const target = { failAction: (): RuleDecision => 'RETRY' };
    const dispatcher = new PolicyDispatcher(target);
    expect(dispatcher.failAction('S-009', buildCtx())).toBe('RETRY');
  });

  it('passes ruleId and ctx through unchanged', () => {
    const spy = vi.fn((): RuleDecision => 'BLOCK');
    const dispatcher = new PolicyDispatcher({ failAction: spy });
    const base = buildCtx();
    dispatcher.failAction('S-007', base);
    expect(spy).toHaveBeenCalledWith('S-007', base);
  });

  it('does not mask policy errors (unknown rule propagates)', () => {
    const dispatcher = new PolicyDispatcher(new PolicyEngine());
    expect(() => dispatcher.failAction('X-999', buildCtx())).toThrow(RuntimeIntegrityError);
  });

  it('contains zero business logic: no rule-id conditionals, no lattice logic, no branching', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'runtime', 'policy-dispatcher.ts'), 'utf8');
    expect(source).not.toMatch(/\b[ES]-0\d{2}\b/);
    expect(source).not.toMatch(/DECISION_LATTICE/);
    expect(source).not.toMatch(/\bif\b/);
    expect(source).not.toMatch(/\bswitch\b/);
  });
});

// Integration harness: real ConstitutionEngine rules projected onto the GovernanceContext
// (the Adapter Interface, component 9, will own this mapping; here it is test-local),
// routed through PolicyDispatcher → PolicyEngine → RuntimeEngine.
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

describe('RuntimeEngine + real rules + real policy (full chain, C-resolutions)', () => {
  it('C-3: E-001 without experience approval → evaluates → REQUIRE_APPROVAL (not RETRIEVE)', () => {
    const result = makeEngine().stepGate(
      buildCtx({ approvals: { required: [], granted: [] } }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['E-001'] },
    );
    expect(result.contributions[0]).toMatchObject({ outcome: 'fail', vacuous: false });
    expect(result.decision).toBe('REQUIRE_APPROVAL');
  });

  it('C-2: S-006 production deployment without consent → evaluates → REQUIRE_APPROVAL', () => {
    const result = makeEngine().stepGate(
      buildCtx({ request: makeRequest({ type: 'deployment' }), environment: 'production' }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['S-006'] },
    );
    expect(result.contributions[0]).toMatchObject({ outcome: 'fail', vacuous: false });
    expect(result.decision).toBe('REQUIRE_APPROVAL');
  });

  it('C-1: S-003 amendment without consent → evaluates → REQUIRE_APPROVAL', () => {
    const result = makeEngine().stepGate(
      buildCtx({ request: makeRequest({ proposesRequirementChange: true }) }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['S-003'] },
    );
    expect(result.contributions[0]).toMatchObject({ outcome: 'fail', vacuous: false });
    expect(result.decision).toBe('REQUIRE_APPROVAL');
  });

  it('C-4: S-004 unverifiable claim without owner → evaluates → ASK_FOR_CLARIFICATION', () => {
    const result = makeEngine().stepGate(
      buildCtx({ claims: [{ id: 'c1', text: 'intent', targetArtifactId: 'a1', unverifiable: true }] }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['S-004'] },
    );
    expect(result.contributions[0]).toMatchObject({ outcome: 'fail', vacuous: false });
    expect(result.decision).toBe('ASK_FOR_CLARIFICATION');
  });

  it('C-5: S-008 absent build at build gate → RETRIEVE_EVIDENCE (never BLOCK)', () => {
    const result = makeEngine().stepGate(
      buildCtx({ phase: 'build' }),
      { id: 'build-pre', phase: 'build', gate: 'pre', ruleIds: ['S-008'] },
    );
    expect(result.contributions[0]).toMatchObject({ outcome: 'na', vacuous: true });
    expect(result.decision).toBe('RETRIEVE_EVIDENCE');
  });

  it('S-008 evaluated failure: unpinned dependency → BLOCK', () => {
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
    expect(result.contributions[0]).toMatchObject({ outcome: 'fail', vacuous: false });
    expect(result.decision).toBe('BLOCK');
  });

  it('S-011 unapproved architecture → REQUIRE_APPROVAL via policy (not BLOCK)', () => {
    const result = makeEngine().stepGate(
      buildCtx({ evidence: { architecture: { approved: false, constraints: [], violations: [] } } }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['S-011'] },
    );
    expect(result.contributions[0]).toMatchObject({ outcome: 'fail', vacuous: false });
    expect(result.decision).toBe('REQUIRE_APPROVAL');
  });

  it('S-005 missing trace target → BLOCK (hard violation, not clarification)', () => {
    const result = makeEngine().stepGate(
      buildCtx({
        requirements: [{ id: 'R-1', text: 'Do it', status: 'approved' }],
        evidence: { artifacts: [{ id: 'a1', kind: 'source', trace: 'R-9' }] },
      }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['S-005'] },
    );
    expect(result.decision).toBe('BLOCK');
  });

  it('passing gate advances the phase: S-001 with approved requirements → ALLOW', () => {
    const result = makeEngine().stepGate(
      buildCtx({
        requirements: [
          { id: 'R-1', text: 'Do it', status: 'approved', approval: humanConsent('requirement-amendment', 'dec-a') },
        ],
      }),
      { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['S-001'] },
    );
    expect(result.decision).toBe('ALLOW');
    expect(result.nextPhase).toBe('task-compilation');
    expect(result.contributions[0]).toMatchObject({ outcome: 'pass', vacuous: false });
  });
});
