import { RuleDefinition } from '../types.js';
import { isApprovedRequirement } from '../glossary.js';
import { makeContext } from '../helpers.js';

export const S001Rule: RuleDefinition = {
  id: 'S-001',
  name: 'Requirements Foundation',
  description:
    'Implementation work must reference approved requirements only — no requirementIds, no duplicates, every id resolves to an approved requirement.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);
    const request = ctx.request;
    if (!request || request.type !== 'implementation') return 'pass';

    const ids = request.requirementIds ?? [];
    if (ids.length === 0) return 'fail';
    if (new Set(ids).size !== ids.length) return 'fail';

    for (const id of ids) {
      const requirement = ctx.requirements.find((r) => r.id === id);
      if (!isApprovedRequirement(requirement)) return 'fail';
    }

    return 'pass';
  },
};
