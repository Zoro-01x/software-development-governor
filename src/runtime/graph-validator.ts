import {
  GovernanceEdge,
  GovernanceGraphDefinition,
  GovernanceNode,
  GraphIssue,
  GraphIssueCategory,
  GraphValidationReport,
} from './graph-types.js';
import { DECISION_LATTICE, GateKind, PhaseName, PHASE_ORDER, RuleDecision } from './types.js';

// COMPONENT-4 spec §4 — Graph Validator: six proof obligations.
// Fail-closed: anything the validator cannot prove is an issue.

export interface ValidateGraphOptions {
  knownRuleIds?: readonly string[];
}

const ALL_DECISIONS = Object.keys(DECISION_LATTICE) as RuleDecision[];
const GATE_KINDS: readonly GateKind[] = ['pre', 'post', 'final'];

function issue(
  category: GraphIssueCategory,
  message: string,
  nodeId?: string,
  edge?: string,
): GraphIssue {
  return { category, nodeId, edge, message };
}

function describeEdge(edge: GovernanceEdge): string {
  const on = edge.on ? ` on ${edge.on.join('|')}` : ' default';
  return `${edge.from} -> ${edge.to}${on}`;
}

// Tarjan SCC over the static edge set (resume edges excluded; targets are `to`).
function staticSccs(
  nodes: ReadonlySet<string>,
  edges: readonly GovernanceEdge[],
): Array<ReadonlySet<string>> {
  const adjacency = new Map<string, string[]>();
  for (const id of nodes) adjacency.set(id, []);
  for (const edge of edges) {
    if (edge.resume) continue;
    adjacency.get(edge.from)?.push(edge.to);
  }

  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: Array<ReadonlySet<string>> = [];
  let counter = 0;

  const strongconnect = (v: string): void => {
    index.set(v, counter);
    lowlink.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of adjacency.get(v) ?? []) {
      if (!index.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, lowlink.get(w) ?? 0));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, index.get(w) ?? 0));
      }
    }

    if (lowlink.get(v) === index.get(v)) {
      const component = new Set<string>();
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member === undefined) break;
        onStack.delete(member);
        component.add(member);
      } while (member !== v);
      sccs.push(component);
    }
  };

  for (const id of nodes) {
    if (!index.has(id)) strongconnect(id);
  }
  return sccs;
}

function sccHasSelfLoop(component: ReadonlySet<string>, edges: readonly GovernanceEdge[]): boolean {
  for (const edge of edges) {
    if (edge.resume) continue;
    if (edge.from === edge.to && component.has(edge.from)) return true;
  }
  return false;
}

function sccIsCyclic(
  component: ReadonlySet<string>,
  edges: readonly GovernanceEdge[],
): boolean {
  if (component.size > 1) return true;
  return sccHasSelfLoop(component, edges);
}

export function validateGraph(
  definition: GovernanceGraphDefinition,
  options: ValidateGraphOptions = {},
): GraphValidationReport {
  const issues: GraphIssue[] = [];
  const { knownRuleIds } = options;
  const known = knownRuleIds ? new Set(knownRuleIds) : null;

  // --- integrity ---------------------------------------------------------

  const nodesById = new Map<string, GovernanceNode>();
  for (const node of definition.nodes) {
    if (nodesById.has(node.id)) {
      issues.push(issue('integrity', `duplicate node id "${node.id}"`, node.id));
    }
    nodesById.set(node.id, node);
  }

  const entryNode = nodesById.get(definition.entry);
  if (!entryNode) {
    issues.push(issue('integrity', `entry "${definition.entry}" does not exist`));
  } else if (entryNode.kind !== 'entry') {
    issues.push(
      issue('integrity', `entry "${definition.entry}" must be kind 'entry'`, definition.entry),
    );
  }

  const terminalSet = new Set(definition.terminals);
  for (const terminalId of definition.terminals) {
    const terminal = nodesById.get(terminalId);
    if (!terminal) {
      issues.push(issue('integrity', `terminal "${terminalId}" does not exist`, terminalId));
      continue;
    }
    if (terminal.kind !== 'terminal') {
      issues.push(
        issue('integrity', `terminal "${terminalId}" must be kind 'terminal'`, terminalId),
      );
    }
  }
  if (terminalSet.has(definition.entry)) {
    issues.push(issue('integrity', 'the entry node cannot also be a terminal'));
  }
  if (new Set(definition.terminals).size !== definition.terminals.length) {
    issues.push(issue('integrity', 'terminals contains duplicates'));
  }

  const outEdges = new Map<string, GovernanceEdge[]>();
  for (const edge of definition.edges) {
    const list = outEdges.get(edge.from) ?? [];
    list.push(edge);
    outEdges.set(edge.from, list);

    if (!nodesById.has(edge.from)) {
      issues.push(issue('integrity', `edge ${describeEdge(edge)} references unknown node "${edge.from}"`, undefined, describeEdge(edge)));
    }
    if (!nodesById.has(edge.to)) {
      issues.push(issue('integrity', `edge ${describeEdge(edge)} references unknown node "${edge.to}"`, undefined, describeEdge(edge)));
    }
    if (edge.on !== undefined) {
      if (edge.on.length === 0) {
        issues.push(
          issue('integrity', `edge ${describeEdge(edge)} has an empty 'on' (cannot match any decision)`, undefined, describeEdge(edge)),
        );
      }
      for (const decision of edge.on) {
        if (!(decision in DECISION_LATTICE)) {
          issues.push(
            issue('integrity', `edge ${describeEdge(edge)} declares non-canonical decision "${decision}"`, undefined, describeEdge(edge)),
          );
        }
      }
      if (new Set(edge.on).size !== edge.on.length) {
        issues.push(
          issue('integrity', `edge ${describeEdge(edge)} repeats a decision in 'on'`, undefined, describeEdge(edge)),
        );
      }
    }
    if (edge.budget !== undefined && !(edge.budget in definition.allowances)) {
      issues.push(
        issue('integrity', `edge ${describeEdge(edge)} consumes undeclared allowance "${edge.budget}"`, undefined, describeEdge(edge)),
      );
    }
  }

  for (const [allowance, amount] of Object.entries(definition.allowances)) {
    if (!Number.isInteger(amount) || amount <= 0) {
      issues.push(
        issue('integrity', `allowance "${allowance}" must be a finite positive integer (got ${amount})`),
      );
    }
  }

  const defaultsByNode = new Map<string, GovernanceEdge[]>();
  for (const edge of definition.edges) {
    if (edge.on === undefined) {
      const list = defaultsByNode.get(edge.from) ?? [];
      list.push(edge);
      defaultsByNode.set(edge.from, list);
    }
  }
  for (const [from, defaults] of defaultsByNode) {
    if (defaults.length > 1) {
      issues.push(
        issue('integrity', `node "${from}" declares ${defaults.length} default edges (at most one)`),
      );
    }
  }

  for (const node of definition.nodes) {
    if (node.kind === 'terminal') {
      if (node.phase !== undefined || node.gate !== undefined) {
        issues.push(
          issue('integrity', `terminal node "${node.id}" must not declare phase/gate`, node.id),
        );
      }
    } else {
      if (node.phase === undefined || !PHASE_ORDER.includes(node.phase)) {
        issues.push(
          issue('integrity', `node "${node.id}" must declare a valid phase`, node.id),
        );
      }
      if (node.gate === undefined || !GATE_KINDS.includes(node.gate)) {
        issues.push(
          issue('integrity', `node "${node.id}" must declare a valid gate`, node.id),
        );
      }
    }

    const isStepped = node.kind === 'gate' || node.kind === 'action';
    if (isStepped && node.ruleIds.length === 0) {
      issues.push(
        issue('integrity', `node "${node.id}" (kind ${node.kind}) must declare ruleIds`, node.id),
      );
    }
    if (!isStepped && node.ruleIds.length > 0) {
      issues.push(
        issue('integrity', `node "${node.id}" (kind ${node.kind}) must not declare ruleIds`, node.id),
      );
    }
    if (new Set(node.ruleIds).size !== node.ruleIds.length) {
      issues.push(issue('integrity', `node "${node.id}" repeats a rule id`, node.id));
    }
    if (known) {
      for (const ruleId of node.ruleIds) {
        if (!known.has(ruleId)) {
          issues.push(
            issue('integrity', `node "${node.id}" references unknown rule "${ruleId}"`, node.id),
          );
        }
      }
    }
  }

  // entry has no in-edges; terminals are sinks
  for (const edge of definition.edges) {
    if (edge.to === definition.entry) {
      issues.push(
        issue('integrity', `entry "${definition.entry}" must have no in-edges (edge ${describeEdge(edge)})`, undefined, describeEdge(edge)),
      );
    }
    if (terminalSet.has(edge.from)) {
      issues.push(
        issue('integrity', `terminal "${edge.from}" must have no out-edges (edge ${describeEdge(edge)})`, edge.from, describeEdge(edge)),
      );
    }
  }

  // --- valid transitions -------------------------------------------------

  for (const node of definition.nodes) {
    if (terminalSet.has(node.id)) continue;
    const blockEdges = (outEdges.get(node.id) ?? []).filter(
      (e) => e.on !== undefined && e.on.includes('BLOCK') && terminalSet.has(e.to),
    );
    if (blockEdges.length === 0) {
      issues.push(
        issue('transitions', `non-terminal node "${node.id}" has no BLOCK edge targeting a terminal`, node.id),
      );
    }
    for (const edge of outEdges.get(node.id) ?? []) {
      if (edge.resume) {
        if (node.kind !== 'action') {
          issues.push(
            issue('transitions', `resume edge ${describeEdge(edge)} originates from kind '${node.kind}' (resume requires 'action')`, node.id, describeEdge(edge)),
          );
        }
        if (edge.on === undefined) {
          issues.push(
            issue('transitions', `resume edge ${describeEdge(edge)} has no 'on' condition`, node.id, describeEdge(edge)),
          );
        } else if (!edge.on.every((d) => d === 'ALLOW' || d === 'NO_ACTION_REQUIRED')) {
          issues.push(
            issue('transitions', `resume edge ${describeEdge(edge)} must only handle ALLOW/NO_ACTION_REQUIRED`, node.id, describeEdge(edge)),
          );
        }
      }
    }
  }

  // --- determinism / totality --------------------------------------------

  for (const node of definition.nodes) {
    if (terminalSet.has(node.id)) continue;
    const edges = outEdges.get(node.id) ?? [];
    const explicit = edges.filter((e) => e.on !== undefined);
    for (const decision of ALL_DECISIONS) {
      const matches = explicit.filter((e) => e.on !== undefined && e.on.includes(decision));
      if (matches.length > 1) {
        issues.push(
          issue('determinism', `node "${node.id}" has ${matches.length} edges handling ${decision}; exactly one must match`, node.id),
        );
      } else if (matches.length === 0 && !defaultsByNode.has(node.id)) {
        issues.push(
          issue('determinism', `node "${node.id}" has no edge for decision ${decision} and no default edge`, node.id),
        );
      }
    }
  }

  // --- reachability -------------------------------------------------------

  const reachable = new Set<string>();
  const queue = [definition.entry];
  reachable.add(definition.entry);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const edge of outEdges.get(current) ?? []) {
      if (!reachable.has(edge.to)) {
        reachable.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  for (const node of definition.nodes) {
    if (!reachable.has(node.id)) {
      issues.push(
        issue('reachability', `node "${node.id}" is not reachable from the entry`, node.id),
      );
    }
  }

  // --- termination --------------------------------------------------------

  const canTerminate = new Set(definition.terminals);
  const reversed = new Map<string, string[]>();
  for (const edge of definition.edges) {
    const list = reversed.get(edge.to) ?? [];
    list.push(edge.from);
    reversed.set(edge.to, list);
  }
  const queue2 = [...definition.terminals];
  while (queue2.length > 0) {
    const current = queue2.shift();
    if (current === undefined) break;
    for (const predecessor of reversed.get(current) ?? []) {
      if (!canTerminate.has(predecessor)) {
        canTerminate.add(predecessor);
        queue2.push(predecessor);
      }
    }
  }
  for (const node of definition.nodes) {
    if (!canTerminate.has(node.id)) {
      issues.push(
        issue('termination', `node "${node.id}" cannot reach a terminal`, node.id),
      );
    }
  }

  // --- bounded loops ------------------------------------------------------

  const nonTerminals = new Set(
    [...nodesById.values()].filter((n) => !terminalSet.has(n.id)).map((n) => n.id),
  );
  const sccs = staticSccs(nonTerminals, definition.edges);
  for (const component of sccs) {
    if (!sccIsCyclic(component, definition.edges)) continue;
    const cyclicEdges = definition.edges.filter(
      (e) =>
        !e.resume &&
        component.has(e.from) &&
        component.has(e.to) &&
        (e.budget !== undefined || e.guarded === true),
    );
    if (cyclicEdges.length === 0) {
      issues.push(
        issue(
          'boundedness',
          `cycle [${[...component].join(', ')}] contains no budget or guarded edge`,
          [...component][0],
        ),
      );
    }
  }

  for (const node of definition.nodes) {
    if (node.kind !== 'action') continue;
    const boundedIn = definition.edges.some(
      (e) => e.to === node.id && (e.budget !== undefined || e.guarded === true),
    );
    if (!boundedIn) {
      issues.push(
        issue(
          'boundedness',
          `action node "${node.id}" has no budgeted or guarded in-edge`,
          node.id,
        ),
      );
    }
  }

  return { valid: issues.length === 0, issues };
}
