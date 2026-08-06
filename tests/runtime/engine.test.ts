import { describe, expect, it } from 'vitest';
import { GovernanceContextBuilder } from '../../src/runtime/context.js';
import {
  GateSpec,
  PolicyPort,
  RuleContribution,
  RuleEvaluatorPort,
  RuntimeEngine,
  canonicalStringify,
  sealEntry,
} from '../../src/runtime/engine.js';
import { RuntimeIntegrityError } from '../../src/runtime/errors.js';
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
    producers: [
      { field: 'request', producer: 'envelope-validator', version: '1.0.0', wroteAt: FIXED_NOW },
    ],
    builtAt: FIXED_NOW,
    ...overrides,
  });
}

function evalPort(table: Record<string, 'pass' | 'fail'>): RuleEvaluatorPort {
  return {
    evaluate: (ruleId) => table[ruleId] ?? 'pass',
    ruleName: (ruleId) => `Rule ${ruleId}`,
  };
}

function policyPort(table: Partial<Record<string, RuleDecision>>): PolicyPort {
  return { failAction: (ruleId) => table[ruleId] ?? 'BLOCK' };
}

function makeEngine(
  rules: RuleEvaluatorPort,
  policy: PolicyPort,
  builderOverride?: GovernanceContextBuilder,
) {
  return new RuntimeEngine({
    rules,
    policy,
    clock: { now: () => FIXED_NOW },
    builder: builderOverride ?? new GovernanceContextBuilder({ strictManifest: false }),
  });
}

const gate: GateSpec = { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['E-001', 'S-011'] };

function approvedExperience(ctx: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    approvals: {
      required: [],
      granted: [
        {
          decisionId: 'dec-x', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
          governanceChecks: 'PASS', timestamp: FIXED_NOW, target: 'experience-architecture', authorizedBy: 'h',
        },
      ],
    },
    ...ctx,
  };
}

describe('RuntimeEngine — determinism (RULE 3)', () => {
  it('produces identical output for identical input, including audit hashes', () => {
    const ctx = buildCtx({
      approvals: {
        required: [{ target: 'experience-architecture', requiredByRules: ['E-001'] }],
        granted: [
          {
            decisionId: 'dec-x', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
            governanceChecks: 'PASS', timestamp: FIXED_NOW, target: 'experience-architecture', authorizedBy: 'h',
          },
        ],
      },
      evidence: { architecture: { approved: true, constraints: [], violations: [] } },
    });
    const engine = makeEngine(
      evalPort({ 'E-001': 'pass', 'S-011': 'pass' }),
      policyPort({}),
    );
    const first = engine.stepGate(ctx, gate);
    const second = engine.stepGate(ctx, gate);
    expect(second).toEqual(first);
    expect(second.after.meta.builtAt).toBe(FIXED_NOW);
    expect(second.decision).toBe(first.decision);
  });
});

describe('RuntimeEngine — gate invariant (consumes immutable, produces immutable + full trail)', () => {
  it('never mutates the input context', () => {
    const ctx = buildCtx({
      approvals: {
        required: [{ target: 'experience-architecture', requiredByRules: ['E-001'] }],
        granted: [
          {
            decisionId: 'dec-x', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
            governanceChecks: 'PASS', timestamp: FIXED_NOW, target: 'experience-architecture', authorizedBy: 'h',
          },
        ],
      },
    });
    const before = canonicalStringify(ctx);
    const engine = makeEngine(evalPort({}), policyPort({}));
    engine.stepGate(ctx, gate);
    expect(canonicalStringify(ctx)).toBe(before);
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  it('produces a fresh immutable context with the audit trail appended', () => {
    const ctx = buildCtx({
      approvals: {
        required: [],
        granted: [
          {
            decisionId: 'dec-x', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
            governanceChecks: 'PASS', timestamp: FIXED_NOW, target: 'experience-architecture', authorizedBy: 'h',
          },
        ],
      },
    });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, { ...gate, ruleIds: ['E-001'] });

    expect(result.after).not.toBe(ctx);
    expect(Object.isFrozen(result.after)).toBe(true);
    expect(result.after.audit.length).toBe(ctx.audit.length + result.audit.length);
    expect(result.after.meta.producerManifest.some((m) => m.field === 'audit')).toBe(true);
    expect(result.after.meta.phase).toBe('task-compilation'); // ALLOW advances
  });

  it('produces a complete audit trail: one entry per rule plus the synthesis entry', () => {
    const ctx = buildCtx({
      approvals: {
        required: [{ target: 'experience-architecture', requiredByRules: ['E-001'] }],
        granted: [
          {
            decisionId: 'dec-x', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
            governanceChecks: 'PASS', timestamp: FIXED_NOW, target: 'experience-architecture', authorizedBy: 'h',
          },
        ],
      },
      evidence: { architecture: { approved: true, constraints: [], violations: [] } },
    });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, gate);
    expect(result.audit).toHaveLength(gate.ruleIds.length + 1);
    expect(result.audit[result.audit.length - 1].ruleId).toBe('SYNTHESIS');
    for (const entry of result.audit) {
      expect(entry.timestamp).toBe(FIXED_NOW);
      expect(entry.requestId).toBe('req-1');
    }
  });

  it('chains audit entries: prevHash links, hash covers content, tamper breaks the chain', () => {
    const ctx = buildCtx({ approvals: { required: [] } });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, gate);

    for (let i = 0; i < result.audit.length; i++) {
      const entry = result.audit[i];
      const expectedPrev = i === 0 ? null : result.audit[i - 1].hash;
      expect(entry.prevHash).toBe(expectedPrev);
    }

    const tampered = { ...result.audit[0], reason: 'tampered' };
    expect(sealEntry(tampered, null).hash).not.toBe(result.audit[0].hash);
    expect(canonicalStringify({ a: 1, b: 2 })).toBe(canonicalStringify({ b: 2, a: 1 }));
  });
});

describe('RuntimeEngine — decision synthesis (GRA §4)', () => {
  it('BLOCK beats ALLOW regardless of rule order (ADV-10)', () => {
    const ctx = buildCtx(
      approvedExperience({
        evidence: { architecture: { approved: false, constraints: [], violations: [] } },
        requirements: [{ id: 'R-1', text: 'x', status: 'approved' }],
      }),
    );
    const engine = makeEngine(
      evalPort({ 'E-001': 'pass', 'S-011': 'fail' }),
      policyPort({ 'S-011': 'BLOCK' }),
    );
    const forward = engine.stepGate(ctx, gate);
    const reversed = engine.stepGate(ctx, { ...gate, ruleIds: ['S-011', 'E-001'] });
    expect(forward.decision).toBe('BLOCK');
    expect(reversed.decision).toBe('BLOCK');
    // Order of audit entries is chronological (gate order); content per rule is identical.
    // Chain hashes differ by construction (they depend on entry order), so compare content.
    const stripChain = (e: (typeof forward.audit)[number]) => {
      const { hash, prevHash, ...rest } = e;
      return rest;
    };
    const sortByRule = (a: RuleContribution, b: RuleContribution) =>
      a.ruleId.localeCompare(b.ruleId);
    expect([...reversed.contributions].sort(sortByRule)).toEqual(
      [...forward.contributions].sort(sortByRule),
    );
    expect(stripChain(reversed.audit[reversed.audit.length - 1])).toEqual(
      stripChain(forward.audit[forward.audit.length - 1]),
    );
  });

  it('REQUIRE_APPROVAL beats RETRY beats ALLOW (lattice)', () => {
    const ctx = buildCtx(
      approvedExperience({
        evidence: { architecture: { approved: false, constraints: [], violations: [] } },
      }),
    );
    const engine = makeEngine(
      evalPort({ 'E-001': 'fail', 'S-011': 'fail' }),
      policyPort({ 'E-001': 'RETRY', 'S-011': 'REQUIRE_APPROVAL' }),
    );
    expect(engine.stepGate(ctx, gate).decision).toBe('REQUIRE_APPROVAL');
  });

  it('all-NA gate synthesizes NO_ACTION_REQUIRED and advances', () => {
    const ctx = buildCtx({ request: makeRequest({ type: 'requirement-analysis' }), approvals: { required: [] } });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, { ...gate, ruleIds: ['S-001'] });
    expect(result.decision).toBe('NO_ACTION_REQUIRED');
    expect(result.contributions.every((c) => c.decision === 'NO_ACTION_REQUIRED')).toBe(true);
    expect(result.after.meta.phase).toBe('task-compilation');
  });

  it('approval coupling: missing approvals lift decision to REQUIRE_APPROVAL (GRA §4)', () => {
    const ctx = buildCtx({
      approvals: {
        required: [{ target: 'experience-architecture', requiredByRules: ['E-001'] }],
        granted: [],
      },
      evidence: { architecture: { approved: true, constraints: [], violations: [] } },
    });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, gate);
    expect(result.decision).toBe('REQUIRE_APPROVAL');
    expect(result.after.meta.phase).toBe('planning'); // no advance while approval missing
  });
});

describe('RuntimeEngine — NO_ACTION_REQUIRED vs RETRIEVE_EVIDENCE (amended GRA §4)', () => {
  it('no work claimed → NO_ACTION_REQUIRED (nothing to verify)', () => {
    const ctx = buildCtx({ request: makeRequest({ type: 'requirement-analysis' }), approvals: { required: [] } });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, { ...gate, ruleIds: ['S-001'] });
    expect(result.contributions[0].decision).toBe('NO_ACTION_REQUIRED');
    expect(result.contributions[0].outcome).toBe('na');
    expect(result.contributions[0].vacuous).toBe(true);
  });

  it('work claimed but required state absent → RETRIEVE_EVIDENCE (missing evidence)', () => {
    const ctx = buildCtx({
      request: makeRequest({ requirementIds: ['R-1'] }),
      approvals: { required: [] },
      requirements: [],
    });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, { ...gate, ruleIds: ['S-001'] });
    expect(result.contributions[0].decision).toBe('RETRIEVE_EVIDENCE');
    expect(result.contributions[0].outcome).toBe('na');
    expect(result.contributions[0].vacuous).toBe(true);
    expect(result.decision).toBe('RETRIEVE_EVIDENCE');
  });

  it('no dependencies introduced → S-012 is NO_ACTION_REQUIRED, not RETRIEVE (R-1 resolution)', () => {
    const ctx = buildCtx({
      request: makeRequest({ type: 'implementation', requirementIds: ['R-1'] }),
      approvals: { required: [] },
      task: { id: 't1', requirementIds: ['R-1'], hunks: [{ artifactId: 'a1', requiredByRequirement: true }], introducedDependencies: [] },
    });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, { id: 'tc-pre', phase: 'task-compilation', gate: 'pre', ruleIds: ['S-012'] });
    expect(result.contributions[0].decision).toBe('NO_ACTION_REQUIRED');
    expect(result.decision).toBe('NO_ACTION_REQUIRED');
  });

  it('dependencies introduced but graph missing → RETRIEVE_EVIDENCE', () => {
    const ctx = buildCtx({
      approvals: { required: [] },
      task: { id: 't1', requirementIds: ['R-1'], hunks: [], introducedDependencies: ['lodash'] },
      evidence: { dependencies: [], resolvedDependencyGraph: [] },
    });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, { id: 'tc-pre', phase: 'task-compilation', gate: 'pre', ruleIds: ['S-012'] });
    expect(result.contributions[0].decision).toBe('RETRIEVE_EVIDENCE');
    expect(result.decision).toBe('RETRIEVE_EVIDENCE');
  });
});

describe('RuntimeEngine — phase advancement', () => {
  it('BLOCK does not advance the phase', () => {
    const ctx = buildCtx(
      approvedExperience({
        evidence: { architecture: { approved: true, constraints: [], violations: [] } },
      }),
    );
    const engine = makeEngine(
      evalPort({ 'E-001': 'fail', 'S-011': 'pass' }),
      policyPort({ 'E-001': 'BLOCK' }),
    );
    const result = engine.stepGate(ctx, gate);
    expect(result.decision).toBe('BLOCK');
    expect(result.nextPhase).toBeNull();
    expect(result.after.meta.phase).toBe('planning');
  });

  it('completion is terminal', () => {
    const ctx = builder.build({
      requestId: 'req-1',
      phase: 'completion',
      gate: 'final',
      request: makeRequest(),
      producers: [],
      builtAt: FIXED_NOW,
    });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, { id: 'completion-final', phase: 'completion', gate: 'final', ruleIds: ['S-001'] });
    expect(result.nextPhase).toBeNull();
  });
});

describe('RuntimeEngine — integrity failures (RULE 7)', () => {
  it('rejects an empty gate', () => {
    const engine = makeEngine(evalPort({}), policyPort({}));
    expect(() => engine.stepGate(buildCtx({ approvals: { required: [] } }), { ...gate, ruleIds: [] })).toThrow(
      RuntimeIntegrityError,
    );
  });

  it('rejects unknown rules in a gate', () => {
    const engine = makeEngine(evalPort({}), policyPort({}));
    expect(() =>
      engine.stepGate(buildCtx({ approvals: { required: [] } }), { ...gate, ruleIds: ['X-999'] }),
    ).toThrow(RuntimeIntegrityError);
  });

  it('rejects duplicate rules in a gate', () => {
    const engine = makeEngine(evalPort({}), policyPort({}));
    expect(() =>
      engine.stepGate(buildCtx({ approvals: { required: [] } }), { ...gate, ruleIds: ['E-001', 'E-001'] }),
    ).toThrow(RuntimeIntegrityError);
  });

  it('never loops: a gate always terminates and returns', () => {
    const ctx = buildCtx({ approvals: { required: [] } });
    const engine = makeEngine(evalPort({}), policyPort({}));
    for (let i = 0; i < 100; i++) {
      const result = engine.stepGate(ctx, gate);
      expect(result.decision).toBeDefined();
    }
  });
});

describe('RuntimeEngine — audit evidence and affected objects', () => {
  it('cites producer-manifest evidence and affected objects per rule', () => {
    const ctx = buildCtx({
      approvals: {
        required: [{ target: 'experience-architecture', requiredByRules: ['E-001'] }],
        granted: [
          {
            decisionId: 'dec-x', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
            governanceChecks: 'PASS', timestamp: FIXED_NOW, target: 'experience-architecture', authorizedBy: 'h',
          },
        ],
      },
    });
    const engine = makeEngine(evalPort({}), policyPort({}));
    const result = engine.stepGate(ctx, { ...gate, ruleIds: ['E-001'] });
    const ruleEntry = result.audit[0];
    expect(ruleEntry.evidence.length).toBeGreaterThan(0);
    expect(ruleEntry.affectedObjects).toContainEqual({ kind: 'request', id: 'req-1' });
    expect(ruleEntry.affectedObjects).toContainEqual({ kind: 'approval', id: 'dec-x' });
    expect(ruleEntry.reason).toContain('E-001');
  });
});

describe('RuntimeEngine — contributions shape', () => {
  it('reports pass/fail/na with the right vacuous flags', () => {
    const ctx = buildCtx({
      approvals: {
        required: [{ target: 'experience-architecture', requiredByRules: ['E-001'] }],
        granted: [
          {
            decisionId: 'dec-x', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
            governanceChecks: 'PASS', timestamp: FIXED_NOW, target: 'experience-architecture', authorizedBy: 'h',
          },
        ],
      },
      evidence: { architecture: { approved: false, constraints: [], violations: [] } },
    });
    const engine = makeEngine(
      evalPort({ 'E-001': 'pass', 'S-011': 'fail' }),
      policyPort({ 'S-011': 'BLOCK' }),
    );
    const result = engine.stepGate(ctx, gate);
    const e001 = result.contributions.find((c: RuleContribution) => c.ruleId === 'E-001');
    const s011 = result.contributions.find((c: RuleContribution) => c.ruleId === 'S-011');
    expect(e001).toMatchObject({ outcome: 'pass', decision: 'ALLOW', vacuous: false });
    expect(s011).toMatchObject({ outcome: 'fail', decision: 'BLOCK', vacuous: false });
  });
});
