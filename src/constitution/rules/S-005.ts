import { RuleDefinition } from '../types.js';
import { isGovernedDecision } from '../glossary.js';
import { makeContext } from '../helpers.js';

export const S005Rule: RuleDefinition = {
  id: 'S-005',
  name: 'No Ambiguity, No Missing Requirements',
  description:
    'Materially differing interpretations must be recorded as an approved assumption; every trace target must exist; empty requirement text is forbidden.',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);

    for (const requirement of ctx.requirements) {
      if (!requirement.text?.trim()) return 'fail';

      const interpretations = ctx.requirementInterpretations.filter(
        (i) => i.requirementId === requirement.id,
      );
      if (interpretations.length < 2) continue;

      const anyMaterialDifference = interpretations.some((i) => i.materialDifference === true);
      if (!anyMaterialDifference) continue;

      const assumption = ctx.assumptions.find((a) => a.requirementId === requirement.id);
      const validAssumption =
        assumption !== undefined &&
        assumption.recorded === true &&
        assumption.approved === true &&
        assumption.decision !== undefined &&
        isGovernedDecision(assumption.decision) &&
        assumption.decision.decision === 'EXECUTE';
      if (!validAssumption) return 'fail';
    }

    for (const artifact of ctx.artifacts) {
      if (artifact.trace && !ctx.requirements.some((r) => r.id === artifact.trace)) {
        return 'fail';
      }
    }

    return 'pass';
  },
};
