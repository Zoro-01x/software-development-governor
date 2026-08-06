import { RuleDefinition } from '../types.js';
import { makeContext } from '../helpers.js';

export const S011Rule: RuleDefinition = {
  id: 'S-011',
  name: 'Architecture Conformity',
  description:
    'The architecture must be approved, all recorded violations resolved, and every constraint scoped.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);
    const architecture = ctx.architecture;
    if (!architecture) return 'pass';

    if (architecture.approved !== true) return 'fail';

    for (const violation of architecture.violations ?? []) {
      if (violation.resolved !== true) return 'fail';
    }

    for (const constraint of architecture.constraints ?? []) {
      if (!constraint.scope?.length) return 'fail';
    }

    return 'pass';
  },
};
