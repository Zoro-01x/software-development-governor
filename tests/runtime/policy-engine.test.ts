import { describe, expect, it } from 'vitest';
import { GovernanceContextBuilder } from '../../src/runtime/context.js';
import { RuntimeIntegrityError } from '../../src/runtime/errors.js';
import { POLICY_TABLE, PolicyEngine } from '../../src/runtime/policy-engine.js';
import { GovernanceContext, RuleDecision } from '../../src/runtime/types.js';

const builder = new GovernanceContextBuilder({ strictManifest: false });

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    type: 'implementation',
    rawText: 'Implement',
    normalizedIntent: 'implementation',
    requirementIds: ['R-1'],
    ...overrides,
  };
}

function ctx(overrides: Record<string, unknown> = {}): GovernanceContext {
  return builder.build({
    requestId: 'req-1',
    phase: 'planning',
    gate: 'pre',
    request: makeRequest(),
    producers: [],
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
    timestamp: 't',
    target,
    authorizedBy: 'h',
  };
}

const engine = new PolicyEngine();

// ONTOLOGY §8 — rules whose failAction is a constant (no context branch).
const CONSTANT_POLICIES: Record<string, RuleDecision> = {
  'E-001': 'REQUIRE_APPROVAL',
  'S-001': 'BLOCK',
  'S-002': 'BLOCK',
  'S-004': 'ASK_FOR_CLARIFICATION',
  'S-006': 'REQUIRE_APPROVAL',
  'S-007': 'BLOCK',
  'S-009': 'RETRY',
  'S-010': 'BLOCK',
  'S-012': 'BLOCK',
};

describe('PolicyEngine — ONTOLOGY §8 table coverage', () => {
  it('covers all 13 rules exactly', () => {
    expect(Object.keys(POLICY_TABLE).sort()).toEqual(
      ['E-001', 'S-001', 'S-002', 'S-003', 'S-004', 'S-005', 'S-006', 'S-007', 'S-008', 'S-009', 'S-010', 'S-011', 'S-012'],
    );
  });

  it('constant failActions match the declared table on a neutral context', () => {
    const base = ctx();
    for (const [ruleId, decision] of Object.entries(CONSTANT_POLICIES)) {
      expect(engine.failAction(ruleId, base), ruleId).toBe(decision);
    }
  });

  it('declarations expose name and description for every rule (documentation/audit)', () => {
    const declarations = engine.declarations();
    expect(declarations).toHaveLength(13);
    for (const declaration of declarations) {
      expect(declaration.ruleId.length).toBeGreaterThan(0);
      expect(declaration.name.length).toBeGreaterThan(0);
      expect(declaration.description.length).toBeGreaterThan(0);
    }
    expect(engine.declaration('S-008').name).toBe('Reproducible Builds');
  });
});

describe('PolicyEngine — context branches (ONTOLOGY §8)', () => {
  it('S-003: amendment without human consent → REQUIRE_APPROVAL; consent → BLOCK; violations → BLOCK', () => {
    const amendment = ctx({ request: makeRequest({ proposesRequirementChange: true }) });
    expect(engine.failAction('S-003', amendment)).toBe('REQUIRE_APPROVAL');

    const consented = ctx({
      request: makeRequest({ proposesRequirementChange: true }),
      approvals: { granted: [humanConsent('requirement-amendment')] },
    });
    expect(engine.failAction('S-003', consented)).toBe('BLOCK');

    const violations = ctx({
      evidence: {
        artifacts: [{ id: 'a1', kind: 'source', conformanceViolations: ['v1'] }],
      },
    });
    expect(engine.failAction('S-003', violations)).toBe('BLOCK');
  });

  it('S-005: empty requirement text or missing trace target → BLOCK; ambiguity → ASK_FOR_CLARIFICATION', () => {
    const emptyText = ctx({ requirements: [{ id: 'R-1', text: '   ', status: 'approved' }] });
    expect(engine.failAction('S-005', emptyText)).toBe('BLOCK');

    const missingTrace = ctx({
      requirements: [{ id: 'R-1', text: 'Do it', status: 'approved' }],
      evidence: { artifacts: [{ id: 'a1', kind: 'source', trace: 'R-9' }] },
    });
    expect(engine.failAction('S-005', missingTrace)).toBe('BLOCK');

    const ambiguity = ctx({ requirements: [{ id: 'R-1', text: 'Do it', status: 'approved' }] });
    expect(engine.failAction('S-005', ambiguity)).toBe('ASK_FOR_CLARIFICATION');
  });

  it('S-008: unpinned dependency → BLOCK; pinned with non-determinism → RETRY', () => {
    const unpinned = ctx({
      evidence: { dependencies: [{ name: 'lodash', version: '^4.17.0' }] },
    });
    expect(engine.failAction('S-008', unpinned)).toBe('BLOCK');

    const pinned = ctx({
      evidence: { dependencies: [{ name: 'lodash', version: '4.17.21' }] },
    });
    expect(engine.failAction('S-008', pinned)).toBe('RETRY');
  });

  it('S-011: unapproved architecture → REQUIRE_APPROVAL; approved with unresolved violation → BLOCK', () => {
    const unapproved = ctx({
      evidence: { architecture: { approved: false, constraints: [], violations: [] } },
    });
    expect(engine.failAction('S-011', unapproved)).toBe('REQUIRE_APPROVAL');

    const unresolved = ctx({
      evidence: {
        architecture: {
          approved: true,
          constraints: [],
          violations: [{ artifactId: 'a1', constraintId: 'c1', resolved: false }],
        },
      },
    });
    expect(engine.failAction('S-011', unresolved)).toBe('BLOCK');
  });
});

describe('PolicyEngine — determinism and integrity', () => {
  it('produces identical decisions for identical input (all rules)', () => {
    const scenarios = [
      ctx(),
      ctx({ request: makeRequest({ proposesRequirementChange: true }) }),
      ctx({
        requirements: [{ id: 'R-1', text: ' ', status: 'draft' }],
        evidence: { architecture: { approved: false, constraints: [], violations: [] } },
      }),
    ];
    for (const scenario of scenarios) {
      for (const ruleId of Object.keys(POLICY_TABLE)) {
        expect(engine.failAction(ruleId, scenario), ruleId).toBe(
          engine.failAction(ruleId, scenario),
        );
      }
    }
  });

  it('throws on an unknown rule id', () => {
    expect(() => engine.failAction('X-999', ctx())).toThrow(RuntimeIntegrityError);
    expect(() => engine.declaration('X-999')).toThrow(RuntimeIntegrityError);
  });
});
