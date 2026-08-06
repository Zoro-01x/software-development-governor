import { describe, expect, it } from 'vitest';
import { buildDefaultGraphDefinition } from '../../src/runtime/default-graph.js';
import { validateGraph } from '../../src/runtime/graph-validator.js';
import {
  GovernanceEdge,
  GovernanceGraphDefinition,
  GovernanceNode,
} from '../../src/runtime/graph-types.js';

// COMPONENT-4 spec §4 — the validator proves six obligations and rejects what it
// cannot prove (fail-closed). Each rejection case below mutates one property of a
// minimal valid graph.

function node(overrides: Partial<GovernanceNode> = {}): GovernanceNode {
  return {
    id: 'g',
    phase: 'planning',
    gate: 'pre',
    ruleIds: ['S-001'],
    kind: 'gate',
    ...overrides,
  };
}

function edge(overrides: Partial<GovernanceEdge> = {}): GovernanceEdge {
  return { from: 'g', to: 'completed', ...overrides };
}

function minimalValid(): GovernanceGraphDefinition {
  return {
    nodes: [
      node({ id: 'start', phase: 'request-received', gate: 'pre', ruleIds: [], kind: 'entry' }),
      node({ id: 'g' }),
      { id: 'blocked', kind: 'terminal', ruleIds: [] },
      { id: 'completed', kind: 'terminal', ruleIds: [] },
    ],
    edges: [
      { from: 'start', to: 'g' },
      { from: 'start', to: 'blocked', on: ['BLOCK'] },
      { from: 'g', to: 'blocked', on: ['BLOCK'] },
      { from: 'g', to: 'completed', on: ['ALLOW'] },
      { from: 'g', to: 'completed' },
    ],
    entry: 'start',
    terminals: ['blocked', 'completed'],
    allowances: {},
  };
}

function categories(report: ReturnType<typeof validateGraph>): string[] {
  return report.issues.map((i) => i.category);
}

describe('validateGraph — proof obligations (COMPONENT-4 spec §4)', () => {
  it('accepts the minimal valid graph with zero issues', () => {
    const report = validateGraph(minimalValid(), { knownRuleIds: ['S-001'] });
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('accepts the default graph with zero issues', () => {
    const definition = buildDefaultGraphDefinition();
    const report = validateGraph(definition, { knownRuleIds: [...definition.nodes.flatMap((n) => n.ruleIds)] });
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
  });

  describe('integrity', () => {
    it('rejects a missing entry node', () => {
      const def = minimalValid();
      def.entry = 'nope';
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects an entry that is not kind entry', () => {
      const def = minimalValid();
      def.entry = 'g';
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects an entry with in-edges', () => {
      const def = minimalValid();
      def.edges.push(edge({ from: 'g', to: 'start' }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects a missing terminal node and a non-terminal kind', () => {
      const def = minimalValid();
      def.terminals = ['ghost'];
      expect(categories(validateGraph(def))).toContain('integrity');

      const def2 = minimalValid();
      def2.nodes.push(node({ id: 't2', kind: 'gate' }));
      def2.terminals = ['t2'];
      def2.nodes[1] = def2.nodes[1]; // keep g
      expect(categories(validateGraph(def2))).toContain('integrity');
    });

    it('rejects a terminal with out-edges', () => {
      const def = minimalValid();
      def.edges.push(edge({ from: 'completed', to: 'g' }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects edges referencing unknown nodes', () => {
      const def = minimalValid();
      def.edges.push(edge({ from: 'g', to: 'ghost' }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects non-canonical decision values in on', () => {
      const def = minimalValid();
      def.edges.push(edge({ on: ['EXECUTE'] }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects an empty on array (can never match)', () => {
      const def = minimalValid();
      def.edges.push(edge({ on: [] }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects two default edges on one node', () => {
      const def = minimalValid();
      def.edges.push(edge({ from: 'g' }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects duplicate node ids', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'g' }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects unknown rule ids when knownRuleIds is given', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'bad', ruleIds: ['X-999'] }));
      expect(categories(validateGraph(def, { knownRuleIds: ['S-001'] }))).toContain('integrity');
    });

    it('rejects duplicate rule ids within a node', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'dup', ruleIds: ['S-001', 'S-001'] }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects undeclared allowance names and non-positive allowances', () => {
      const def = minimalValid();
      def.edges.push(edge({ on: ['RETRY'], budget: 'nope' }));
      expect(categories(validateGraph(def))).toContain('integrity');

      const def2 = minimalValid();
      def2.allowances = { clarify: 0 };
      expect(categories(validateGraph(def2))).toContain('integrity');

      const def3 = minimalValid();
      def3.allowances = { clarify: -1 };
      expect(categories(validateGraph(def3))).toContain('integrity');
    });

    it('rejects missing phase/gate on non-terminal kinds', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'nophase', phase: undefined }));
      expect(categories(validateGraph(def))).toContain('integrity');
    });

    it('rejects ruleIds on entry/phase/terminal and empty ruleIds on gate/action', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'e2', kind: 'entry', ruleIds: ['S-001'] }));
      expect(categories(validateGraph(def))).toContain('integrity');

      const def2 = minimalValid();
      def2.nodes.push(node({ id: 'empty', ruleIds: [] }));
      expect(categories(validateGraph(def2))).toContain('integrity');
    });
  });

  describe('valid transitions', () => {
    it('rejects a non-terminal node without a BLOCK edge to a terminal', () => {
      const def = minimalValid();
      def.edges = def.edges.filter((e) => !(e.on && e.on.includes('BLOCK')));
      expect(categories(validateGraph(def))).toContain('transitions');
    });

    it('rejects a resume edge originating from a non-action node', () => {
      const def = minimalValid();
      def.edges.push(edge({ on: ['ALLOW'], resume: true }));
      expect(categories(validateGraph(def))).toContain('transitions');
    });

    it('rejects a resume edge on a decision other than ALLOW/NO_ACTION_REQUIRED', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'act', kind: 'action' }));
      def.edges.push({ from: 'act', to: 'completed', on: ['BLOCK'], resume: true });
      expect(categories(validateGraph(def))).toContain('transitions');
    });
  });

  describe('determinism / totality', () => {
    it('rejects two explicit edges sharing a decision on one node', () => {
      const def = minimalValid();
      def.edges.push(edge({ on: ['ALLOW'], to: 'blocked' }));
      expect(categories(validateGraph(def))).toContain('determinism');
    });

    it('rejects a node with an uncovered decision and no default edge', () => {
      const def = minimalValid();
      def.edges = def.edges.filter((e) => !(e.from === 'g' && e.on === undefined));
      expect(categories(validateGraph(def))).toContain('determinism');
    });
  });

  describe('reachability', () => {
    it('rejects a node unreachable from the entry', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'lost' }));
      expect(categories(validateGraph(def))).toContain('reachability');
    });
  });

  describe('termination', () => {
    it('rejects a node that cannot reach a terminal', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'dead' }), { id: 'sink', kind: 'terminal', ruleIds: [] });
      def.edges.push({ from: 'dead', to: 'sink', on: ['RETRY'] });
      expect(categories(validateGraph(def))).toContain('termination');
    });
  });

  describe('bounded loops', () => {
    it('rejects an unbudgeted self-loop (no budget/guard in the cycle)', () => {
      const def = minimalValid();
      def.edges.push(edge({ on: ['RETRY'] })); // g -> completed on RETRY, not a loop
      def.edges.push({ from: 'g', to: 'g', on: ['RETRY'] });
      expect(categories(validateGraph(def))).toContain('boundedness');
    });

    it('rejects an unbudgeted multi-node cycle', () => {
      const def = minimalValid();
      def.edges.push({ from: 'g', to: 'start', on: ['RETRY'] }); // start -> g (default) -> start
      expect(categories(validateGraph(def))).toContain('boundedness');
    });

    it('rejects an action node without a budgeted or guarded in-edge', () => {
      const def = minimalValid();
      def.nodes.push(node({ id: 'act', kind: 'action' }));
      def.edges.push({ from: 'g', to: 'act', on: ['ALLOW'] });
      expect(categories(validateGraph(def))).toContain('boundedness');
    });
  });

  it('aggregates issues across categories (fail-closed, nothing silent)', () => {
    const def = minimalValid();
    def.nodes.push(node({ id: 'ghost', ruleIds: ['X-999'] })); // unreachable + unknown rule
    const report = validateGraph(def, { knownRuleIds: ['S-001'] });
    expect(report.valid).toBe(false);
    expect(categories(report)).toContain('reachability');
    expect(categories(report)).toContain('integrity');
  });
});
