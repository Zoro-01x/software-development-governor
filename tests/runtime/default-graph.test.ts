import { describe, expect, it } from 'vitest';
import {
  buildDefaultGraphDefinition,
  DEFAULT_ALLOWANCES,
  KNOWN_RULE_IDS,
} from '../../src/runtime/default-graph.js';
import { GovernanceGraph } from '../../src/runtime/graph.js';
import { validateGraph } from '../../src/runtime/graph-validator.js';
import { GovernanceEdge } from '../../src/runtime/graph-types.js';
import { DECISION_LATTICE, RuleDecision } from '../../src/runtime/types.js';

// COMPONENT-4 spec §5 — the default graph is faithful to the GRA §2 gate table and
// §5 budgets, and passes every proof obligation.
const definition = buildDefaultGraphDefinition();

function nodeById(id: string) {
  const node = definition.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`missing node ${id}`);
  return node;
}

describe('default graph — node table (GRA §2 gate table)', () => {
  it('declares the 17 spec nodes with exact kinds and rule activation', () => {
    expect(definition.nodes).toHaveLength(17);
    expect(definition.nodes.map((n) => n.id)).toEqual([
      'request-received-pre',
      'intent-analysis-post',
      'clarification-pre',
      'clarification-post',
      'planning-pre',
      'planning-post',
      'task-compilation-pre',
      'execution-post',
      'verification-pre',
      'verification-post',
      'build-pre',
      'build-post',
      'memory-update-pre',
      'human-approval-pre',
      'completion-final',
      'blocked',
      'completed',
    ]);
  });

  it('assigns ruleIds per the GRA §2 gate table', () => {
    expect(nodeById('intent-analysis-post').ruleIds).toEqual(['S-005']);
    expect(nodeById('clarification-pre').ruleIds).toEqual(['S-005']);
    expect(nodeById('clarification-post').ruleIds).toEqual(['S-005']);
    expect(nodeById('planning-pre').ruleIds).toEqual(['E-001', 'S-011', 'S-006']);
    expect(nodeById('planning-post').ruleIds).toEqual(['S-005']);
    expect(nodeById('task-compilation-pre').ruleIds).toEqual(['S-001', 'S-010', 'S-012']);
    expect(nodeById('execution-post').ruleIds).toEqual(['S-007', 'S-010', 'S-003', 'S-011']);
    expect(nodeById('verification-pre').ruleIds).toEqual(['S-002', 'S-004', 'S-009']);
    expect(nodeById('verification-post').ruleIds).toEqual(['S-002', 'S-009']);
    expect(nodeById('build-pre').ruleIds).toEqual(['S-008']);
    expect(nodeById('build-post').ruleIds).toEqual(['S-008']);
    expect(nodeById('human-approval-pre').ruleIds).toEqual(['S-006', 'E-001']);
    expect(nodeById('completion-final').ruleIds).toEqual(KNOWN_RULE_IDS);
  });

  it('declares kinds per spec §5 (entry/action/phase/terminals)', () => {
    expect(nodeById('request-received-pre').kind).toBe('entry');
    expect(nodeById('clarification-pre').kind).toBe('action');
    expect(nodeById('human-approval-pre').kind).toBe('action');
    expect(nodeById('memory-update-pre').kind).toBe('phase');
    expect(nodeById('blocked').kind).toBe('terminal');
    expect(nodeById('completed').kind).toBe('terminal');
  });

  it('declares the budgets as data (GRA §5)', () => {
    expect(DEFAULT_ALLOWANCES).toEqual({ clarify: 3, retry: 2, retrieve: 2, archive: 1 });
  });
});

describe('default graph — edges (spec §5)', () => {
  it('declares the PHASE_ORDER default chain (default edges have no on)', () => {
    const chain = definition.edges.filter((e) => e.on === undefined && !e.resume);
    const expectedPairs: Array<[string, string]> = [
      ['request-received-pre', 'intent-analysis-post'],
      ['intent-analysis-post', 'clarification-pre'],
      ['clarification-pre', 'clarification-post'],
      ['clarification-post', 'planning-pre'],
      ['planning-pre', 'planning-post'],
      ['planning-post', 'task-compilation-pre'],
      ['task-compilation-pre', 'execution-post'],
      ['execution-post', 'verification-pre'],
      ['verification-pre', 'verification-post'],
      ['verification-post', 'build-pre'],
      ['build-pre', 'build-post'],
      ['build-post', 'memory-update-pre'],
      ['memory-update-pre', 'human-approval-pre'],
      ['human-approval-pre', 'completion-final'],
      ['completion-final', 'completed'],
    ];
    expect(chain.map((e) => [e.from, e.to])).toEqual(expectedPairs);
    expect(chain).toHaveLength(15); // one default edge per non-terminal node
  });

  it('gives every non-terminal node exactly one default edge', () => {
    const nonTerminals = definition.nodes.filter((n) => n.kind !== 'terminal');
    const defaults = definition.edges.filter((e) => e.on === undefined);
    for (const node of nonTerminals) {
      const own = defaults.filter((e) => e.from === node.id);
      expect(own).toHaveLength(1);
    }
  });

  it('routes every uniform decision per spec §5 (BLOCK terminal, guarded approval, budgeted loops)', () => {
    for (const node of definition.nodes) {
      if (node.kind === 'terminal') continue;
      const block = definition.edges.find((e) => e.from === node.id && e.on?.includes('BLOCK'));
      expect(block?.to).toBe('blocked');

      const approval = definition.edges.find(
        (e) => e.from === node.id && e.on?.includes('REQUIRE_APPROVAL'),
      );
      expect(approval?.to).toBe('human-approval-pre');
      expect(approval?.guarded).toBe(true);

      const clarify = definition.edges.find(
        (e) => e.from === node.id && e.on?.includes('ASK_FOR_CLARIFICATION'),
      );
      expect(clarify?.to).toBe('clarification-pre');
      expect(clarify?.budget).toBe('clarify');

      const retrieve = definition.edges.find(
        (e) => e.from === node.id && e.on?.includes('RETRIEVE_EVIDENCE'),
      );
      expect(retrieve?.to).toBe(node.id);
      expect(retrieve?.budget).toBe('retrieve');

      const retry = definition.edges.find((e) => e.from === node.id && e.on?.includes('RETRY'));
      expect(retry?.to).toBe(node.id);
      expect(retry?.budget).toBe('retry');
    }
  });

  it('declares the action specials (resume on ALLOW/NA) and memory/completion specials', () => {
    const resumeEdges = definition.edges.filter((e) => e.resume);
    expect(resumeEdges).toHaveLength(2);
    expect(resumeEdges.map((e) => e.from).sort()).toEqual(['clarification-pre', 'human-approval-pre']);
    for (const edge of resumeEdges) {
      expect(edge.on).toEqual(['ALLOW', 'NO_ACTION_REQUIRED']);
      expect(nodeById(edge.from).kind).toBe('action');
    }

    const archive = definition.edges.find(
      (e) => e.from === 'memory-update-pre' && e.on?.includes('ARCHIVE'),
    );
    expect(archive?.to).toBe('memory-update-pre');
    expect(archive?.budget).toBe('archive');

    const completion = definition.edges.find(
      (e) => e.from === 'completion-final' && e.on?.includes('ALLOW'),
    );
    expect(completion?.to).toBe('completed');
  });

  it('contains no two explicit edges sharing a decision on one node', () => {
    for (const node of definition.nodes) {
      const explicit = definition.edges.filter((e) => e.from === node.id && e.on !== undefined);
      const seen = new Set<string>();
      for (const edge of explicit) {
        for (const decision of edge.on ?? []) {
          expect(seen.has(decision)).toBe(false);
          seen.add(decision);
        }
      }
    }
  });
});

describe('default graph — proof obligations (spec §4/§5)', () => {
  it('passes all six validator obligations with the known rule set', () => {
    const report = validateGraph(definition, { knownRuleIds: KNOWN_RULE_IDS });
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('every node is reachable from the entry and can reach a terminal', () => {
    const graph = new GovernanceGraph(definition, { knownRuleIds: KNOWN_RULE_IDS });
    const edges: GovernanceEdge[] = definition.edges;
    const reachable = new Set<string>();
    const queue = [definition.entry];
    reachable.add(definition.entry);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      for (const edge of edges.filter((e) => e.from === current)) {
        if (!reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    for (const node of definition.nodes) expect(reachable.has(node.id)).toBe(true);

    const reversed = new Map<string, string[]>();
    for (const edge of edges) {
      const list = reversed.get(edge.to) ?? [];
      list.push(edge.from);
      reversed.set(edge.to, list);
    }
    const canTerminate = new Set(definition.terminals);
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
    for (const node of definition.nodes) expect(canTerminate.has(node.id)).toBe(true);

    expect(reachable.size).toBe(definition.nodes.length);
    expect(() => graph.next('completion-final', 'ALLOW')).not.toThrow();
  });

  it('every cycle is budgeted or guarded (bounded loops, ADV-13 structurally impossible)', () => {
    const nonResume = definition.edges.filter((e) => !e.resume);
    const loops = nonResume.filter((e) => e.from === e.to);
    expect(loops.length).toBeGreaterThan(0);
    for (const loop of loops) {
      expect(loop.budget !== undefined || loop.guarded === true).toBe(true);
    }
  });

  it('every non-terminal node resolves exactly one edge per decision', () => {
    const graph = new GovernanceGraph(definition, { knownRuleIds: KNOWN_RULE_IDS });
    const decisions = Object.keys(DECISION_LATTICE) as RuleDecision[];
    for (const node of definition.nodes) {
      if (node.kind === 'terminal') continue;
      for (const decision of decisions) {
        const explicit = definition.edges.filter(
          (e) => e.from === node.id && e.on !== undefined && e.on.includes(decision),
        );
        expect(explicit.length).toBeLessThanOrEqual(1);
        expect(() => graph.next(node.id, decision)).not.toThrow();
      }
    }
  });
});
