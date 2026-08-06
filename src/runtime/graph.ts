import { RuntimeIntegrityError } from './errors.js';
import { validateGraph, ValidateGraphOptions } from './graph-validator.js';
import {
  AllowanceMap,
  GovernanceEdge,
  GovernanceGraphDefinition,
  GovernanceNode,
} from './graph-types.js';
import { RuleDecision } from './types.js';

// COMPONENT-4 spec §3/§4 — GovernanceGraph: the authoritative, immutable graph data.
// Invalid definitions are rejected at construction (the wiring itself is verified).
// Resolution (spec §3): per node, per decision — explicit edge match else default;
// order never decides. Resume edges target the caller-supplied origin, else `to`.

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.getOwnPropertyNames(value)) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== null && typeof child === 'object') deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export class GovernanceGraph {
  readonly entry: string;
  readonly terminals: ReadonlyArray<string>;
  readonly allowances: Readonly<AllowanceMap>;

  private readonly nodesById: ReadonlyMap<string, GovernanceNode>;
  private readonly outEdges: ReadonlyMap<string, ReadonlyArray<GovernanceEdge>>;
  private readonly defaultEdges: ReadonlyMap<string, GovernanceEdge>;

  constructor(
    definition: GovernanceGraphDefinition,
    options: ValidateGraphOptions = {},
  ) {
    const report = validateGraph(definition, options);
    if (!report.valid) {
      const detail = report.issues
        .map((i) => `[${i.category}]${i.nodeId ? ` node ${i.nodeId}` : ''}${i.edge ? ` edge ${i.edge}` : ''} ${i.message}`)
        .join('; ');
      throw new RuntimeIntegrityError(
        `GovernanceGraph: invalid graph definition (${report.issues.length} issue(s)): ${detail}`,
      );
    }

    this.entry = definition.entry;
    this.terminals = deepFreeze([...definition.terminals]);
    this.allowances = deepFreeze({ ...definition.allowances });

    const nodesById = new Map<string, GovernanceNode>();
    for (const node of definition.nodes) nodesById.set(node.id, deepFreeze(node));
    this.nodesById = nodesById;

    const outEdges = new Map<string, GovernanceEdge[]>();
    const defaultEdges = new Map<string, GovernanceEdge>();
    for (const edge of definition.edges) {
      const frozenEdge = deepFreeze(edge);
      const list = outEdges.get(edge.from) ?? [];
      list.push(frozenEdge);
      outEdges.set(edge.from, list);
      if (edge.on === undefined) defaultEdges.set(edge.from, frozenEdge);
    }
    this.outEdges = outEdges;
    this.defaultEdges = defaultEdges;
  }

  node(nodeId: string): GovernanceNode {
    const node = this.nodesById.get(nodeId);
    if (!node) {
      throw new RuntimeIntegrityError(`GovernanceGraph: unknown node "${nodeId}"`);
    }
    return node;
  }

  outEdgesOf(nodeId: string): ReadonlyArray<GovernanceEdge> {
    this.node(nodeId);
    return this.outEdges.get(nodeId) ?? [];
  }

  // spec §3 — resolution: explicit edge whose `on` includes the decision, else the
  // node's default edge. A validated graph guarantees exactly one match per decision.
  next(nodeId: string, decision: RuleDecision, origin?: string): string {
    const node = this.node(nodeId);
    if (node.kind === 'terminal') {
      throw new RuntimeIntegrityError(
        `GovernanceGraph: terminal node "${nodeId}" is never stepped`,
      );
    }

    const explicit = (this.outEdges.get(nodeId) ?? []).filter(
      (e) => e.on !== undefined && e.on.includes(decision),
    );
    if (explicit.length > 1) {
      // Unreachable in a validated graph — fail-closed.
      throw new RuntimeIntegrityError(
        `GovernanceGraph: node "${nodeId}" has ${explicit.length} edges for ${decision}`,
      );
    }

    const chosen = explicit[0] ?? this.defaultEdges.get(nodeId);
    if (!chosen) {
      throw new RuntimeIntegrityError(
        `GovernanceGraph: node "${nodeId}" has no edge for ${decision} (invalid graph)`,
      );
    }

    if (chosen.resume === true && origin !== undefined) {
      if (!this.nodesById.has(origin)) {
        throw new RuntimeIntegrityError(
          `GovernanceGraph: resume edge from "${nodeId}" targets unknown origin "${origin}"`,
        );
      }
      return origin;
    }
    return chosen.to;
  }
}
