import { PolicyPort } from './engine.js';
import { GovernanceContext, RuleDecision } from './types.js';

// ONTOLOGY §8 (approved 2026-08-02) — Policy Dispatcher: thin routing only.
// Given (ruleId, ctx) it routes to the target Policy Engine's declared failAction
// and returns the decision. It contains no rule-id conditionals, no lattice logic,
// and no context branching of its own — any policy change happens only in the
// Policy Engine, and any routing change happens only here.
export class PolicyDispatcher implements PolicyPort {
  private readonly target: PolicyPort;

  constructor(target: PolicyPort) {
    this.target = target;
  }

  failAction(ruleId: string, ctx: GovernanceContext): RuleDecision {
    return this.target.failAction(ruleId, ctx);
  }
}
