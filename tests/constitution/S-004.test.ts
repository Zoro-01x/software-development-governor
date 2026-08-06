import { describe, expect, it } from 'vitest';
import { S004Rule } from '../../src/constitution/rules/S-004.js';
import { baseContext } from './fixtures.js';

const artifact = { id: 'a1', kind: 'source' as const, trace: 'R-1', sourceVersion: 'v1' };
const passingRun = {
  id: 'run-1',
  targetArtifactId: 'a1',
  pass: true,
  reproducible: true,
  externalStateDependency: false,
  sourceVersion: 'v1',
};

describe('S-004 No Unverifiable Claims', () => {
  it('passes when there are no claims', () => {
    expect(S004Rule.evaluate(baseContext())).toBe('pass');
  });

  it('passes when verifiable claims are demonstrated', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [passingRun],
    });
    expect(S004Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails an unverifiable claim without owner or rationale', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'design intent', targetArtifactId: 'a1', unverifiable: true }],
    });
    expect(S004Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes an unverifiable claim with owner and rationale', () => {
    const ctx = baseContext({
      claims: [
        {
          id: 'c1',
          text: 'design intent',
          targetArtifactId: 'a1',
          unverifiable: true,
          owner: 'architect@org',
          rationale: 'aesthetic judgment, documented in ADR-7',
        },
      ],
    });
    expect(S004Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails an unverifiable claim missing only the owner', () => {
    const ctx = baseContext({
      claims: [
        { id: 'c1', text: 'design intent', targetArtifactId: 'a1', unverifiable: true, rationale: 'reason' },
      ],
    });
    expect(S004Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails a verifiable claim that was not demonstrated', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [],
    });
    expect(S004Rule.evaluate(ctx)).toBe('fail');
  });
});
