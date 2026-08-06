import { RuleDefinition } from '../types.js';
import { isPinnedVersion } from '../glossary.js';
import { makeContext } from '../helpers.js';

export const S008Rule: RuleDefinition = {
  id: 'S-008',
  name: 'Reproducible Builds',
  description:
    'Builds must declare a deterministic input fingerprint, no declared non-determinism sources, identical output hashes, and pinned dependency versions.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);
    const build = ctx.build;
    if (!build) return 'fail';

    if (!build.inputFingerprint?.length) return 'fail';
    if ((build.nonDeterminismSources ?? []).length > 0) return 'fail';

    const hashes = build.outputHashes ?? [];
    if (hashes.length < 2) return 'fail';
    if (new Set(hashes).size !== 1) return 'fail';

    for (const dependency of ctx.dependencies) {
      if (!isPinnedVersion(dependency.version)) return 'fail';
    }

    return 'pass';
  },
};
