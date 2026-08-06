import { RuleDefinition, RuleOutcome } from './types.js';
import { E001Rule } from './rules/E-001.js';
import { S001Rule } from './rules/S-001.js';
import { S002Rule } from './rules/S-002.js';
import { S003Rule } from './rules/S-003.js';
import { S004Rule } from './rules/S-004.js';
import { S005Rule } from './rules/S-005.js';
import { S006Rule } from './rules/S-006.js';
import { S007Rule } from './rules/S-007.js';
import { S008Rule } from './rules/S-008.js';
import { S009Rule } from './rules/S-009.js';
import { S010Rule } from './rules/S-010.js';
import { S011Rule } from './rules/S-011.js';
import { S012Rule } from './rules/S-012.js';

export const CONSTITUTION_RULES: ReadonlyArray<RuleDefinition> = [
  E001Rule,
  S001Rule,
  S002Rule,
  S003Rule,
  S004Rule,
  S005Rule,
  S006Rule,
  S007Rule,
  S008Rule,
  S009Rule,
  S010Rule,
  S011Rule,
  S012Rule,
];

export interface ConstitutionRuleResult {
  rule: RuleDefinition;
  outcome: RuleOutcome;
}

export interface ConstitutionExecution {
  results: ConstitutionRuleResult[];
  failures: ConstitutionRuleResult[];
  allPass: boolean;
  passed: ReadonlyArray<string>;
}

export class ConstitutionEngine {
  private readonly rules: Map<string, RuleDefinition>;

  constructor(rules: ReadonlyArray<RuleDefinition> = CONSTITUTION_RULES) {
    this.rules = new Map(rules.map((rule) => [rule.id, rule]));
  }

  register(rule: RuleDefinition): void {
    this.rules.set(rule.id, rule);
  }

  rule(id: string): RuleDefinition | undefined {
    return this.rules.get(id);
  }

  get ruleIds(): ReadonlyArray<string> {
    return [...this.rules.keys()];
  }

  execute(input: unknown, ruleIds?: ReadonlyArray<string>): ConstitutionExecution {
    const targets = ruleIds ?? this.ruleIds;
    const results: ConstitutionRuleResult[] = [];
    const failures: ConstitutionRuleResult[] = [];

    for (const id of targets) {
      const rule = this.rules.get(id);
      if (!rule) throw new Error(`Unknown constitution rule: ${id}`);
      const outcome = rule.evaluate(input);
      results.push({ rule, outcome });
      if (outcome === 'fail') failures.push({ rule, outcome });
    }

    return {
      results,
      failures,
      allPass: failures.length === 0,
      passed: results.filter((r) => r.outcome === 'pass').map((r) => r.rule.id),
    };
  }
}
