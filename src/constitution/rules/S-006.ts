import { RuleDefinition } from '../types.js';
import { isHumanConsent } from '../glossary.js';
import { makeContext } from '../helpers.js';

export const S006Rule: RuleDefinition = {
  id: 'S-006',
  name: 'Human Oversight',
  description:
    'Production deployments, requirement amendments, and architectural decisions require human consent.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);
    const request = ctx.request;
    if (!request) return 'pass';

    if (request.type === 'deployment') {
      if (ctx.environment?.role !== 'production') return 'pass';
      const consent = ctx.decisions.some(
        (d) => d.target === 'deployment' && isHumanConsent(d),
      );
      return consent ? 'pass' : 'fail';
    }

    if (request.proposesRequirementChange) {
      const consent = ctx.decisions.some(
        (d) => d.target === 'requirement-amendment' && isHumanConsent(d),
      );
      if (!consent) return 'fail';
    }

    if (request.proposesArchitecturalDecision) {
      const consent = ctx.decisions.some(
        (d) => d.target === 'architecture-change' && isHumanConsent(d),
      );
      if (!consent) return 'fail';
    }

    return 'pass';
  },
};
