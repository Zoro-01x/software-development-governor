import { RuleDefinition } from '../types.js';
import { isPassingAutomatedVerification } from '../glossary.js';
import { makeContext } from '../helpers.js';

export const S004Rule: RuleDefinition = {
  id: 'S-004',
  name: 'No Unverifiable Claims',
  description:
    'Claims that cannot be verified must carry an owner and rationale; all other claims must be demonstrated by passing automated verification.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);
    if (ctx.claims.length === 0) return 'pass';

    for (const claim of ctx.claims) {
      if (claim.unverifiable) {
        if (!claim.owner?.length || !claim.rationale?.length) return 'fail';
        continue;
      }

      const artifact = ctx.artifacts.find((a) => a.id === claim.targetArtifactId);
      const demonstrated = ctx.verificationRuns.some(
        (run) =>
          run.targetArtifactId === claim.targetArtifactId &&
          isPassingAutomatedVerification(run, artifact),
      );
      if (!demonstrated) return 'fail';
    }

    return 'pass';
  },
};
