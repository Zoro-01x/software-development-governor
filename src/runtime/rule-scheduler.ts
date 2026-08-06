import { GateSpec } from './engine.js';
import { RuntimeIntegrityError } from './errors.js';
import { GovernanceGraph } from './graph.js';
import { NodeKind } from './graph-types.js';
import { GateKind, PhaseName, RuleDecision } from './types.js';

// COMPONENT-4 spec §6 — Rule Scheduler: thin read-only adapter with zero workflow
// logic. No decision conditionals, no lattice logic, no phase knowledge, no rule
// ids in code. All behavior lives in the graph data; the scheduler only reads it.
export class RuleScheduler {
  readonly graph: GovernanceGraph;

  constructor(graph: GovernanceGraph) {
    this.graph = graph;
  }

  activate(nodeId: string): GateSpec {
    const node = this.graph.node(nodeId);
    const steppable: ReadonlySet<NodeKind> = new Set(['gate', 'action']);
    if (!steppable.has(node.kind)) {
      throw new RuntimeIntegrityError(
        `RuleScheduler: node "${nodeId}" (kind ${node.kind}) is not a gate step`,
      );
    }
    return {
      id: node.id,
      phase: node.phase as PhaseName,
      gate: node.gate as GateKind,
      ruleIds: [...node.ruleIds],
    };
  }

  next(nodeId: string, decision: RuleDecision, origin?: string): string {
    return this.graph.next(nodeId, decision, origin);
  }
}
