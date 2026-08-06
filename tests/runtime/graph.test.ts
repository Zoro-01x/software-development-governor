import { describe, expect, it } from 'vitest';
import { buildDefaultGraphDefinition } from '../../src/runtime/default-graph.js';
import { RuntimeIntegrityError } from '../../src/runtime/errors.js';
import { GovernanceGraph } from '../../src/runtime/graph.js';
import {
  GovernanceEdge,
  GovernanceGraphDefinition,
  GovernanceNode,
} from '../../src/runtime/graph-types.js';

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

describe('GovernanceGraph — construction', () => {
  it('rejects an invalid definition with RuntimeIntegrityError listing issues', () => {
    const def = minimalValid();
    def.edges = def.edges.filter((e) => !(e.on && e.on.includes('BLOCK')));
    expect(() => new GovernanceGraph(def)).toThrow(RuntimeIntegrityError);
    expect(() => new GovernanceGraph(def)).toThrow(/invalid graph definition/);
  });

  it('accepts a valid definition and exposes entry/terminals/allowances', () => {
    const graph = new GovernanceGraph(minimalValid());
    expect(graph.entry).toBe('start');
    expect(graph.terminals).toEqual(['blocked', 'completed']);
    expect(graph.allowances).toEqual({});
  });

  it('accepts the default graph', () => {
    const def = buildDefaultGraphDefinition();
    expect(() => new GovernanceGraph(def)).not.toThrow();
  });

  it('deep-freezes nodes, edges, and allowances', () => {
    const graph = new GovernanceGraph(minimalValid());
    expect(Object.isFrozen(graph.node('g'))).toBe(true);
    expect(Object.isFrozen(graph.outEdgesOf('g')[0])).toBe(true);
    expect(Object.isFrozen(graph.allowances)).toBe(true);
  });
});

describe('GovernanceGraph — next() resolution (spec §3)', () => {
  it('matches an explicit edge by decision', () => {
    const graph = new GovernanceGraph(minimalValid());
    expect(graph.next('g', 'ALLOW')).toBe('completed');
    expect(graph.next('g', 'BLOCK')).toBe('blocked');
  });

  it('falls back to the default edge for uncovered decisions', () => {
    const graph = new GovernanceGraph(minimalValid());
    expect(graph.next('g', 'RETRY')).toBe('completed');
    expect(graph.next('g', 'NO_ACTION_REQUIRED')).toBe('completed');
  });

  it('is order-independent: edge list order never decides (ADV-10 for transitions)', () => {
    const def = minimalValid();
    const shuffled: GovernanceEdge[] = [...def.edges].reverse();
    const graph = new GovernanceGraph({ ...def, edges: shuffled });
    for (const decision of ['ALLOW', 'BLOCK', 'RETRY', 'ARCHIVE'] as const) {
      expect(graph.next('g', decision)).toBe(new GovernanceGraph(def).next('g', decision));
    }
  });

  it('throws RuntimeIntegrityError for unknown nodes and terminals', () => {
    const graph = new GovernanceGraph(minimalValid());
    expect(() => graph.next('ghost', 'ALLOW')).toThrow(RuntimeIntegrityError);
    expect(() => graph.next('completed', 'ALLOW')).toThrow(/terminal/);
    expect(() => graph.node('ghost')).toThrow(RuntimeIntegrityError);
  });
});

describe('GovernanceGraph — resume/origin semantics', () => {
  function resumeGraph(): GovernanceGraph {
    return new GovernanceGraph({
      nodes: [
        node({ id: 'start', phase: 'request-received', gate: 'pre', ruleIds: [], kind: 'entry' }),
        node({ id: 'act', kind: 'action' }),
        node({ id: 'after', phase: 'planning', gate: 'post', ruleIds: ['S-001'] }),
        { id: 'blocked', kind: 'terminal', ruleIds: [] },
        { id: 'completed', kind: 'terminal', ruleIds: [] },
      ],
      edges: [
        { from: 'start', to: 'act' },
        { from: 'start', to: 'blocked', on: ['BLOCK'] },
        { from: 'act', to: 'after', on: ['ALLOW', 'NO_ACTION_REQUIRED'], resume: true },
        { from: 'act', to: 'blocked', on: ['BLOCK'] },
        { from: 'act', to: 'act', on: ['RETRY'], budget: 'retry' },
        { from: 'act', to: 'after' },
        { from: 'after', to: 'blocked', on: ['BLOCK'] },
        { from: 'after', to: 'completed', on: ['ALLOW'] },
        { from: 'after', to: 'completed' },
      ],
      entry: 'start',
      terminals: ['blocked', 'completed'],
      allowances: { retry: 2 },
    });
  }

  it('resumes to the origin when supplied, else to the linear fallback', () => {
    const graph = resumeGraph();
    expect(graph.next('act', 'ALLOW', 'start')).toBe('start');
    expect(graph.next('act', 'ALLOW')).toBe('after');
    expect(graph.next('act', 'NO_ACTION_REQUIRED', 'start')).toBe('start');
  });

  it('ignores origin on non-resume edges', () => {
    const graph = resumeGraph();
    expect(graph.next('act', 'BLOCK', 'start')).toBe('blocked');
    expect(graph.next('act', 'RETRY', 'start')).toBe('act');
  });

  it('throws RuntimeIntegrityError when a resume edge targets an unknown origin', () => {
    const graph = resumeGraph();
    expect(() => graph.next('act', 'ALLOW', 'ghost')).toThrow(RuntimeIntegrityError);
  });
});
