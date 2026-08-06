import { describe, expect, it } from 'vitest';
import { S008Rule } from '../../src/constitution/rules/S-008.js';
import { baseContext } from './fixtures.js';

const goodBuild = {
  inputFingerprint: 'sha256:abc',
  outputHashes: ['sha256:xyz', 'sha256:xyz'],
  nonDeterminismSources: [],
};

describe('S-008 Reproducible Builds', () => {
  it('fails when there is no build record', () => {
    expect(S008Rule.evaluate(baseContext())).toBe('fail');
  });

  it('passes a deterministic build with pinned dependencies', () => {
    const ctx = baseContext({
      build: goodBuild,
      dependencies: [{ name: 'lodash', version: '4.17.21' }],
    });
    expect(S008Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when the input fingerprint is missing', () => {
    const ctx = baseContext({ build: { ...goodBuild, inputFingerprint: '' } });
    expect(S008Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when non-determinism sources are declared', () => {
    const ctx = baseContext({
      build: { ...goodBuild, nonDeterminismSources: ['timestamp'] },
    });
    expect(S008Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when output hashes differ', () => {
    const ctx = baseContext({
      build: { ...goodBuild, outputHashes: ['sha256:xyz', 'sha256:abc'] },
    });
    expect(S008Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when fewer than two output hashes are recorded', () => {
    const ctx = baseContext({ build: { ...goodBuild, outputHashes: ['sha256:xyz'] } });
    expect(S008Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when a dependency version is unpinned', () => {
    const ctx = baseContext({
      build: goodBuild,
      dependencies: [{ name: 'lodash', version: '^4.17.21' }],
    });
    expect(S008Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when a dependency version is missing', () => {
    const ctx = baseContext({
      build: goodBuild,
      dependencies: [{ name: 'lodash' }],
    });
    expect(S008Rule.evaluate(ctx)).toBe('fail');
  });
});
