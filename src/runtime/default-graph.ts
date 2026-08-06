import {
  GovernanceEdge,
  GovernanceGraphDefinition,
  GovernanceNode,
} from './graph-types.js';
import { RuleDecision } from './types.js';

// COMPONENT-4 spec §5 (approved 2026-08-02) — default graph, from GRA §2 gate table
// + §5 budgets. Workflow logic is data: nodes (with rule activation), the PHASE_ORDER
// default chain, uniform decision edges, action specials, allowances.

export const DEFAULT_ALLOWANCES: GovernanceGraphDefinition['allowances'] = {
  clarify: 3,
  retry: 2,
  retrieve: 2,
  archive: 1,
};

export const KNOWN_RULE_IDS: readonly string[] = [
  'E-001',
  'S-001',
  'S-002',
  'S-003',
  'S-004',
  'S-005',
  'S-006',
  'S-007',
  'S-008',
  'S-009',
  'S-010',
  'S-011',
  'S-012',
];

const APPROVE: readonly RuleDecision[] = ['ALLOW', 'NO_ACTION_REQUIRED'];

const NODES: GovernanceNode[] = [
  { id: 'request-received-pre', phase: 'request-received', gate: 'pre', ruleIds: [], kind: 'entry' },
  { id: 'intent-analysis-post', phase: 'intent-analysis', gate: 'post', ruleIds: ['S-005'], kind: 'gate' },
  { id: 'clarification-pre', phase: 'clarification', gate: 'pre', ruleIds: ['S-005'], kind: 'action' },
  { id: 'clarification-post', phase: 'clarification', gate: 'post', ruleIds: ['S-005'], kind: 'gate' },
  { id: 'planning-pre', phase: 'planning', gate: 'pre', ruleIds: ['E-001', 'S-011', 'S-006'], kind: 'gate' },
  { id: 'planning-post', phase: 'planning', gate: 'post', ruleIds: ['S-005'], kind: 'gate' },
  { id: 'task-compilation-pre', phase: 'task-compilation', gate: 'pre', ruleIds: ['S-001', 'S-010', 'S-012'], kind: 'gate' },
  { id: 'execution-post', phase: 'execution', gate: 'post', ruleIds: ['S-007', 'S-010', 'S-003', 'S-011'], kind: 'gate' },
  { id: 'verification-pre', phase: 'verification', gate: 'pre', ruleIds: ['S-002', 'S-004', 'S-009'], kind: 'gate' },
  { id: 'verification-post', phase: 'verification', gate: 'post', ruleIds: ['S-002', 'S-009'], kind: 'gate' },
  { id: 'build-pre', phase: 'build', gate: 'pre', ruleIds: ['S-008'], kind: 'gate' },
  { id: 'build-post', phase: 'build', gate: 'post', ruleIds: ['S-008'], kind: 'gate' },
  { id: 'memory-update-pre', phase: 'memory-update', gate: 'pre', ruleIds: [], kind: 'phase' },
  { id: 'human-approval-pre', phase: 'human-approval', gate: 'pre', ruleIds: ['S-006', 'E-001'], kind: 'action' },
  { id: 'completion-final', phase: 'completion', gate: 'final', ruleIds: [...KNOWN_RULE_IDS], kind: 'gate' },
  { id: 'blocked', kind: 'terminal', ruleIds: [] },
  { id: 'completed', kind: 'terminal', ruleIds: [] },
];

// Default chain along PHASE_ORDER — the declared linear order (default edges have no `on`).
const CHAIN: ReadonlyArray<readonly [string, string]> = [
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

function chainEdges(): GovernanceEdge[] {
  return CHAIN.map(([from, to]) => ({ from, to }));
}

// Uniform decision edges per non-terminal node (spec §5): BLOCK terminal, guarded
// approval, budgeted clarify/retrieve/retry loops. The entry keeps its BLOCK/approval/
// clarify edges but never self-loops (spec §3: entry has no in-edges).
function uniformEdges(): GovernanceEdge[] {
  const edges: GovernanceEdge[] = [];
  for (const node of NODES) {
    if (node.kind === 'terminal') continue;
    edges.push(
      { from: node.id, to: 'blocked', on: ['BLOCK'] },
      { from: node.id, to: 'human-approval-pre', on: ['REQUIRE_APPROVAL'], guarded: true },
      { from: node.id, to: 'clarification-pre', on: ['ASK_FOR_CLARIFICATION'], budget: 'clarify' },
    );
    if (node.kind === 'entry') continue;
    edges.push(
      { from: node.id, to: node.id, on: ['RETRIEVE_EVIDENCE'], budget: 'retrieve' },
      { from: node.id, to: node.id, on: ['RETRY'], budget: 'retry' },
    );
  }
  return edges;
}

// Action-node specials + memory phase + completion explicit (spec §5). Uniform edges
// already cover the shared decisions; only the new ones are declared here.
function specialEdges(): GovernanceEdge[] {
  return [
    { from: 'clarification-pre', to: 'clarification-post', on: [...APPROVE], resume: true },
    { from: 'human-approval-pre', to: 'completion-final', on: [...APPROVE], resume: true },
    { from: 'memory-update-pre', to: 'memory-update-pre', on: ['ARCHIVE'], budget: 'archive' },
    { from: 'completion-final', to: 'completed', on: [...APPROVE] },
  ];
}

export function buildDefaultGraphDefinition(): GovernanceGraphDefinition {
  return {
    nodes: NODES,
    edges: [...chainEdges(), ...uniformEdges(), ...specialEdges()],
    entry: 'request-received-pre',
    terminals: ['blocked', 'completed'],
    allowances: { ...DEFAULT_ALLOWANCES },
  };
}
