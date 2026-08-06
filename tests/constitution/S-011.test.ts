import { describe, expect, it } from 'vitest';
import { S011Rule } from '../../src/constitution/rules/S-011.js';
import { baseContext } from './fixtures.js';

describe('S-011 Architecture Conformity', () => {
  it('passes when there is no architecture record', () => {
    expect(S011Rule.evaluate(baseContext())).toBe('pass');
  });

  it('passes an approved architecture with no violations and scoped constraints', () => {
    const ctx = baseContext({
      architecture: {
        approved: true,
        violations: [],
        constraints: [{ id: 'c-1', scope: 'src/**', kind: 'dependency-direction' }],
      },
    });
    expect(S011Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when the architecture is not approved', () => {
    const ctx = baseContext({ architecture: { approved: false, violations: [], constraints: [] } });
    expect(S011Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when a violation is unresolved', () => {
    const ctx = baseContext({
      architecture: {
        approved: true,
        violations: [{ artifactId: 'a1', constraintId: 'c-1', resolved: false }],
        constraints: [],
      },
    });
    expect(S011Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes when all violations are resolved', () => {
    const ctx = baseContext({
      architecture: {
        approved: true,
        violations: [{ artifactId: 'a1', constraintId: 'c-1', resolved: true }],
        constraints: [],
      },
    });
    expect(S011Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when a constraint has no scope', () => {
    const ctx = baseContext({
      architecture: {
        approved: true,
        violations: [],
        constraints: [{ id: 'c-1', kind: 'dependency-direction' }],
      },
    });
    expect(S011Rule.evaluate(ctx)).toBe('fail');
  });
});
