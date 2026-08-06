import { describe, expect, it } from 'vitest';
import { S005Rule } from '../../src/constitution/rules/S-005.js';
import { baseContext, governedDecision, approvedRequirement } from './fixtures.js';

describe('S-005 No Ambiguity, No Missing Requirements', () => {
  it('passes with no requirements at all', () => {
    expect(S005Rule.evaluate(baseContext())).toBe('pass');
  });

  it('fails a requirement with empty text', () => {
    const ctx = baseContext({
      requirements: [{ id: 'R-1', text: '   ', status: 'approved' }],
    });
    expect(S005Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes with a single interpretation (no ambiguity)', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      requirementInterpretations: [{ requirementId: 'R-1', interpretation: 'A', materialDifference: false }],
    });
    expect(S005Rule.evaluate(ctx)).toBe('pass');
  });

  it('passes with multiple interpretations but no material difference', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      requirementInterpretations: [
        { requirementId: 'R-1', interpretation: 'A', materialDifference: false },
        { requirementId: 'R-1', interpretation: 'B', materialDifference: false },
      ],
    });
    expect(S005Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when material ambiguity has no recorded approved assumption', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      requirementInterpretations: [
        { requirementId: 'R-1', interpretation: 'A', materialDifference: true },
        { requirementId: 'R-1', interpretation: 'B', materialDifference: true },
      ],
      assumptions: [],
    });
    expect(S005Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes when material ambiguity has an approved assumption', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      requirementInterpretations: [
        { requirementId: 'R-1', interpretation: 'A', materialDifference: true },
        { requirementId: 'R-1', interpretation: 'B', materialDifference: true },
      ],
      assumptions: [
        {
          requirementId: 'R-1',
          text: 'assume A',
          recorded: true,
          approved: true,
          decision: governedDecision({ decisionId: 'dec-ass' }),
        },
      ],
    });
    expect(S005Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when the recorded assumption was not approved', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      requirementInterpretations: [
        { requirementId: 'R-1', interpretation: 'A', materialDifference: true },
        { requirementId: 'R-1', interpretation: 'B', materialDifference: true },
      ],
      assumptions: [{ requirementId: 'R-1', text: 'assume A', recorded: true, approved: false }],
    });
    expect(S005Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when an artifact traces to a non-existent requirement', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'source', trace: 'R-99' }],
    });
    expect(S005Rule.evaluate(ctx)).toBe('fail');
  });
});
