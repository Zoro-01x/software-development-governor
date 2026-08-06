import { describe, expect, it } from 'vitest';
import { S002Rule } from '../../src/constitution/rules/S-002.js';
import { baseContext } from './fixtures.js';

const artifact = { id: 'a1', kind: 'source' as const, trace: 'R-1', sourceVersion: 'v1' };

function passingRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run-1',
    targetArtifactId: 'a1',
    pass: true,
    reproducible: true,
    externalStateDependency: false,
    sourceVersion: 'v1',
    ...overrides,
  };
}

describe('S-002 No Unverified Claims', () => {
  it('passes when there are no claims', () => {
    expect(S002Rule.evaluate(baseContext())).toBe('pass');
  });

  it('passes when every claim has passing verification', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [passingRun()],
    });
    expect(S002Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when a claim has no verification run', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [],
    });
    expect(S002Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the verification run failed', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [passingRun({ pass: false })],
    });
    expect(S002Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when verification is not reproducible', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [passingRun({ reproducible: false })],
    });
    expect(S002Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when verification source version does not match the artifact', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [passingRun({ sourceVersion: 'v0' })],
    });
    expect(S002Rule.evaluate(ctx)).toBe('fail');
  });
});
