import { RuleDefinition } from '../types.js';
import { makeContext } from '../helpers.js';

export const S009Rule: RuleDefinition = {
  id: 'S-009',
  name: 'Verification Evidence Reproducibility',
  description:
    'Verification runs offered as claim evidence must be reproducible, free of external state dependencies, fingerprint their environment, and match the artifact source version.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);

    const claimedArtifactIds = new Set(ctx.claims.map((c) => c.targetArtifactId));
    for (const run of ctx.verificationRuns) {
      if (!claimedArtifactIds.has(run.targetArtifactId)) continue;

      if (run.reproducible !== true) return 'fail';
      if (run.externalStateDependency !== false) return 'fail';
      if (!run.environmentFingerprint?.length) return 'fail';

      const artifact = ctx.artifacts.find((a) => a.id === run.targetArtifactId);
      if (
        artifact !== undefined &&
        artifact.sourceVersion !== undefined &&
        run.sourceVersion !== artifact.sourceVersion
      ) {
        return 'fail';
      }
    }

    return 'pass';
  },
};
