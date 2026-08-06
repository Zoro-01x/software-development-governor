import { describe, expect, it } from 'vitest';
import { S009Rule } from '../../src/constitution/rules/S-009.js';
import { baseContext } from './fixtures.js';

const artifact = { id: 'a1', kind: 'source' as const, trace: 'R-1', sourceVersion: 'v1' };
const claimedRun = {
  id: 'run-1',
  targetArtifactId: 'a1',
  pass: true,
  reproducible: true,
  externalStateDependency: false,
  sourceVersion: 'v1',
  environmentFingerprint: 'fp-env-1',
};

describe('S-009 Verification Evidence Reproducibility', () => {
  it('passes when verification runs are reproducible and match the artifact', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [claimedRun],
    });
    expect(S009Rule.evaluate(ctx)).toBe('pass');
  });

  it('passes when a verification run is not claimed as evidence', () => {
    const ctx = baseContext({
      verificationRuns: [{ ...claimedRun, reproducible: false, environmentFingerprint: '' }],
    });
    expect(S009Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when the run is not reproducible', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [{ ...claimedRun, reproducible: false }],
    });
    expect(S009Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the run depends on external state', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [{ ...claimedRun, externalStateDependency: true }],
    });
    expect(S009Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the environment fingerprint is missing', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [{ ...claimedRun, environmentFingerprint: '' }],
    });
    expect(S009Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the run source version differs from the artifact', () => {
    const ctx = baseContext({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      artifacts: [artifact],
      verificationRuns: [{ ...claimedRun, sourceVersion: 'v0' }],
    });
    expect(S009Rule.evaluate(ctx)).toBe('fail');
  });
});
