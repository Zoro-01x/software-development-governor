import { describe, expect, it } from 'vitest';
import { S003Rule } from '../../src/constitution/rules/S-003.js';
import { baseContext, governedDecision } from './fixtures.js';

describe('S-003 Compliance Verification', () => {
  it('passes when no artifacts have violations and no change is proposed', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1' }],
    });
    expect(S003Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when an artifact has recorded conformance violations', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1', conformanceViolations: ['S-008'] }],
    });
    expect(S003Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes with empty conformance violations array', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1', conformanceViolations: [] }],
    });
    expect(S003Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails a requirement change without human consent', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'change', proposesRequirementChange: true },
      decisions: [],
    });
    expect(S003Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes a requirement change with human consent', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'change', proposesRequirementChange: true },
      decisions: [
        governedDecision({
          decisionId: 'dec-h',
          target: 'requirement-amendment',
          authorizedBy: 'human-1',
        }),
      ],
    });
    expect(S003Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when the decision exists but is not human-authorized', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'change', proposesRequirementChange: true },
      decisions: [governedDecision({ target: 'requirement-amendment' })],
    });
    expect(S003Rule.evaluate(ctx)).toBe('fail');
  });
});
