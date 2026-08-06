import { RuleDefinition } from '../types.js';
import { isPassingAutomatedVerification } from '../glossary.js';
import { makeContext } from '../helpers.js';

export const S002Rule: RuleDefinition = {
  id: 'S-002',
  name: 'No Unverified Claims',
  description:
    'Every claim offered as evidence must be backed by a passing, reproducible, source-matched automated verification run.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);
    if (ctx.claims.length === 0) return 'pass';

    for (const claim of ctx.claims) {
      const artifact = ctx.artifacts.find((a) => a.id === claim.targetArtifactId);
      const passing = ctx.verificationRuns.some(
        (run) =>
          run.targetArtifactId === claim.targetArtifactId &&
          isPassingAutomatedVerification(run, artifact),
      );
      if (!passing) return 'fail';
    }

    return 'pass';
  },
};
