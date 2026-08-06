import { RuleDefinition } from '../types.js';
import { isGovernedDecision, isApprovedRequirement, isPinnedVersion } from '../glossary.js';
import { makeContext } from '../helpers.js';

export const S012Rule: RuleDefinition = {
  id: 'S-012',
  name: 'Dependency Accountability',
  description:
    'Every resolved dependency must be pinned, traceable to an approved requirement, justified with a recorded governed approval, and the graph must contain no duplicates.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);

    const graph = ctx.resolvedDependencyGraph ?? [];
    if (new Set(graph).size !== graph.length) return 'fail';

    for (const name of graph) {
      const record = ctx.dependencies.find((d) => d.name === name);
      if (!record) return 'fail';

      if (!isPinnedVersion(record.version)) return 'fail';
      if (!record.requirementId?.length) return 'fail';
      if (!record.justification?.trim() || !record.justification.includes(record.requirementId)) {
        return 'fail';
      }
      if (!record.approval || !isGovernedDecision(record.approval)) return 'fail';
      if (record.approval.decision !== 'EXECUTE') return 'fail';

      const requirement = ctx.requirements.find((r) => r.id === record.requirementId);
      if (!isApprovedRequirement(requirement)) return 'fail';
    }

    return 'pass';
  },
};
