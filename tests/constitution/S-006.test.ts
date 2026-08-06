import { describe, expect, it } from 'vitest';
import { S006Rule } from '../../src/constitution/rules/S-006.js';
import { baseContext, governedDecision } from './fixtures.js';

describe('S-006 Human Oversight', () => {
  it('passes when there is no request', () => {
    expect(S006Rule.evaluate(baseContext())).toBe('pass');
  });

  it('passes routine implementation requests', () => {
    const ctx = baseContext({ request: { id: 'r1', type: 'implementation', requirementIds: ['R-1'] } });
    expect(S006Rule.evaluate(ctx)).toBe('pass');
  });

  it('passes a production deployment with human consent', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'deployment' },
      environment: { role: 'production' },
      decisions: [governedDecision({ decisionId: 'dec-d', target: 'deployment', authorizedBy: 'human-1' })],
    });
    expect(S006Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails a production deployment without human consent', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'deployment' },
      environment: { role: 'production' },
      decisions: [],
    });
    expect(S006Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes a non-production deployment without consent', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'deployment' },
      environment: { role: 'staging' },
      decisions: [],
    });
    expect(S006Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails an architectural decision without human consent', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'technical-design', proposesArchitecturalDecision: true },
      decisions: [],
    });
    expect(S006Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes an architectural decision with human consent', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'technical-design', proposesArchitecturalDecision: true },
      decisions: [
        governedDecision({ decisionId: 'dec-a', target: 'architecture-change', authorizedBy: 'human-1' }),
      ],
    });
    expect(S006Rule.evaluate(ctx)).toBe('pass');
  });
});
