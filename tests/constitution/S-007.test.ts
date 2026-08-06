import { describe, expect, it } from 'vitest';
import { S007Rule } from '../../src/constitution/rules/S-007.js';
import { baseContext, approvedRequirement } from './fixtures.js';

describe('S-007 Traceability', () => {
  it('passes with no artifacts', () => {
    expect(S007Rule.evaluate(baseContext())).toBe('pass');
  });

  it('passes non-governed artifact kinds without trace', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'other' }],
    });
    expect(S007Rule.evaluate(ctx)).toBe('pass');
  });

  it('passes when every governed artifact traces to an approved requirement', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      artifacts: [
        { id: 'a1', kind: 'source', trace: 'R-1' },
        { id: 'a2', kind: 'test', trace: 'R-1' },
        { id: 'a3', kind: 'configuration', trace: 'R-1' },
        { id: 'a4', kind: 'documentation', trace: 'R-1' },
      ],
    });
    expect(S007Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails a governed artifact with no trace', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'source' }],
    });
    expect(S007Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the trace target is not approved', () => {
    const ctx = baseContext({
      requirements: [{ id: 'R-1', text: 'draft', status: 'draft' }],
      artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1' }],
    });
    expect(S007Rule.evaluate(ctx)).toBe('fail');
  });
});
