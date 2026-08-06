import { RuleDefinition } from '../types.js';
import { isApprovedRequirement } from '../glossary.js';
import { makeContext, GOVERNED_ARTIFACT_KINDS } from '../helpers.js';

export const S007Rule: RuleDefinition = {
  id: 'S-007',
  name: 'Traceability',
  description:
    'Every governed artifact (source, test, configuration, documentation, deployment) must trace to an approved requirement.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);

    for (const artifact of ctx.artifacts) {
      if (!GOVERNED_ARTIFACT_KINDS.includes(artifact.kind)) continue;
      if (!artifact.trace?.length) return 'fail';

      const requirement = ctx.requirements.find((r) => r.id === artifact.trace);
      if (!isApprovedRequirement(requirement)) return 'fail';
    }

    return 'pass';
  },
};
