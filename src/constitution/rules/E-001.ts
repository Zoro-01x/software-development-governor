import { RuleDefinition } from '../types.js';
import { isGovernedDecision } from '../glossary.js';
import { makeContext, ENGINEERING_REQUEST_TYPES } from '../helpers.js';

export const E001Rule: RuleDefinition = {
  id: 'E-001',
  name: 'Experience Prerequisite',
  description:
    'No engineering work may begin without an approved Experience Architecture (governed decision, EXECUTE, target experience-architecture).',
  severity: 'error',
  evaluate(input: unknown): 'pass' | 'fail' {
    const ctx = makeContext(input);
    const request = ctx.request;
    if (!request || !ENGINEERING_REQUEST_TYPES.includes(request.type)) return 'pass';

    const approval = ctx.experienceApproval;
    const approved =
      approval !== undefined &&
      isGovernedDecision(approval) &&
      approval.decision === 'EXECUTE' &&
      approval.target === 'experience-architecture';

    return approved ? 'pass' : 'fail';
  },
};
