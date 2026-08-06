import { describe, expect, it } from 'vitest';
import { E001Rule } from '../../src/constitution/rules/E-001.js';
import { baseContext, governedDecision } from './fixtures.js';

describe('E-001 Experience Prerequisite', () => {
  it('fails an implementation request with no experience approval', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation', requirementIds: ['R-1'] },
    });
    expect(E001Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes an implementation request with an approved experience architecture', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation', requirementIds: ['R-1'] },
      experienceApproval: governedDecision({ target: 'experience-architecture' }),
    });
    expect(E001Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when the approval decision is not EXECUTE', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation', requirementIds: ['R-1'] },
      experienceApproval: governedDecision({ decision: 'ASK_HUMAN', target: 'experience-architecture' }),
    });
    expect(E001Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the approval targets the wrong scope', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation', requirementIds: ['R-1'] },
      experienceApproval: governedDecision({ target: 'infrastructure' }),
    });
    expect(E001Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes non-engineering requests without approval (not applicable)', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'deployment' },
    });
    expect(E001Rule.evaluate(ctx)).toBe('pass');
  });
});
