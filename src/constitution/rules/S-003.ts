import { RuleDefinition } from '../types.js';
import { isHumanConsent } from '../glossary.js';
import { makeContext } from '../helpers.js';

export const S003Rule: RuleDefinition = {
  id: 'S-003',
  name: 'Compliance Verification',
  description:
    'No artifacts with recorded conformance violations may ship, and any proposed requirement change needs human consent.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);

    for (const artifact of ctx.artifacts) {
      if ((artifact.conformanceViolations ?? []).length > 0) return 'fail';
    }

    if (ctx.request?.proposesRequirementChange) {
      const humanConsent = ctx.decisions.some(
        (d) => d.target === 'requirement-amendment' && isHumanConsent(d),
      );
      if (!humanConsent) return 'fail';
    }

    return 'pass';
  },
};
