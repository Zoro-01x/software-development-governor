import { ConstitutionContext } from '../../src/constitution/types.js';

export function baseContext(overrides: Partial<ConstitutionContext> = {}): ConstitutionContext {
  return {
    request: undefined,
    experienceApproval: undefined,
    requirements: [],
    requirementInterpretations: [],
    assumptions: [],
    decisions: [],
    artifacts: [],
    changes: [],
    claims: [],
    verificationRuns: [],
    build: undefined,
    dependencies: [],
    resolvedDependencyGraph: [],
    architecture: undefined,
    environment: undefined,
    ...overrides,
  };
}

export function governedDecision(overrides: Record<string, unknown> = {}) {
  return {
    decisionId: 'dec-1',
    decision: 'EXECUTE',
    reason: 'evidence validated',
    validationReportId: 'vr-1',
    governanceChecks: 'PASS',
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function approvedRequirement(id: string, text = `Requirement ${id}`) {
  return {
    id,
    text,
    status: 'approved',
    approval: governedDecision({ decisionId: `dec-${id}` }),
  };
}
