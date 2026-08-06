import { GateKind, PhaseName, RuleDecision } from './types.js';

// COMPONENT-4 spec §3 (approved 2026-08-02) — Governance Graph schema.
// The graph is the authoritative data for execution order and valid transitions:
// nodes (gates, with rule activation), decision-conditioned edges, allowances.

export type NodeKind = 'entry' | 'gate' | 'action' | 'phase' | 'terminal';

export interface GovernanceNode {
  id: string; // canonical: '<phase>-<gate>' e.g. 'planning-pre', 'completion-final'
  phase?: PhaseName; // required for all kinds except 'terminal'
  gate?: GateKind; // required for all kinds except 'terminal'
  ruleIds: string[]; // non-empty for 'gate' | 'action'; empty for 'entry' | 'phase' | 'terminal'
  kind: NodeKind; // 'action' = gate with resume-capable re-entry (clarification, human-approval)
}

export interface GovernanceEdge {
  from: string; // existing node id
  to: string; // existing node id (resume fallback target when origin absent)
  on?: RuleDecision[]; // decisions this edge handles; absent = default edge (matches any uncovered decision)
  budget?: string; // allowance name consumed per traversal (GRA §5 budgets)
  guarded?: boolean; // approval-guarded: re-entry requires a fresh governed decision (ADV-09)
  resume?: boolean; // when resolved with an origin, target = origin; else target = `to`
}

export interface AllowanceMap {
  [name: string]: number; // finite positive integers only
}

export interface GovernanceGraphDefinition {
  nodes: GovernanceNode[];
  edges: GovernanceEdge[];
  entry: string; // exactly one; no in-edges
  terminals: string[]; // sinks: no out-edges; never stepped as gates
  allowances: AllowanceMap;
}

export type GraphIssueCategory =
  | 'integrity'
  | 'transitions'
  | 'determinism'
  | 'reachability'
  | 'termination'
  | 'boundedness';

export interface GraphIssue {
  category: GraphIssueCategory;
  nodeId?: string;
  edge?: string;
  message: string;
}

export interface GraphValidationReport {
  valid: boolean;
  issues: GraphIssue[];
}
