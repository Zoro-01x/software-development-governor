import { RuleDefinition } from '../types.js';
import { makeContext } from '../helpers.js';

export const S010Rule: RuleDefinition = {
  id: 'S-010',
  name: 'Every Change Traces Back',
  description:
    'Every change must cite at least one requirement, and every hunk must belong to an artifact whose trace is among the cited requirements, marked as required.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);
    if (ctx.changes.length === 0) return 'pass';

    for (const change of ctx.changes) {
      const ids = change.requirementIds ?? [];
      if (ids.length === 0) return 'fail';

      for (const hunk of change.hunks ?? []) {
        const artifact = ctx.artifacts.find((a) => a.id === hunk.artifactId);
        if (!artifact) return 'fail';
        if (!ids.includes(artifact.trace ?? '')) return 'fail';
        if (hunk.requiredByRequirement !== true) return 'fail';
      }
    }

    return 'pass';
  },
};
