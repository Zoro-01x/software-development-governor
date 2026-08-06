# Component 4 — Governance Graph (spec)

**Status:** DESIGNED — implementation of Component 4 is blocked until this spec is approved (sign-off required: this is an amendment to the frozen GRA, recorded in RUNTIME-ARCHITECTURE.md §9).
**Rule:** Derived strictly from the GRA (§2 execution points, §5 actions/budgets, §7 threats) + ONTOLOGY §5 (request revision state machine). No new governance concepts — the graph makes the GRA's gate table, transition rules, and budgets *data*, verifiable by construction.

---

## 1. Problem

The GRA Step 8 implementation order lists Component 4 as "gate table + runtime state machine + budgets". As designed, that component would encode workflow logic in code: which gates follow which, which decisions route where, which rules activate when. Workflow logic in code is:
- unverifiable by construction (ADV-12: "gate table is code" — the anti-bypass property depends on the wiring being right),
- entangled with the engine (order authority, transition authority, and rule activation all live in different places),
- unamenable to proof (termination, boundedness of retry/clarify/approval loops, reachability of every gate).

## 2. Redesign

Component 4 becomes three pieces:

| Piece | Role |
|---|---|
| **Governance Graph** | The *authoritative data*: nodes (gates), edges (valid transitions, decision-conditioned), rule activation per node, allowances (budgets). It is the single source of execution order and valid transitions. |
| **Graph Validator** | Proves the graph is well-formed: integrity, valid transitions, determinism/totality, reachability, termination, bounded loops. Invalid graphs are rejected at construction — the wiring itself is verified, not trusted. |
| **Rule Scheduler** | A *thin adapter* with zero workflow logic: it activates rules for the current graph node and resolves the next node from the graph. Any behavior change happens in the graph data, never in scheduler code. |

Workflow logic = graph data. Scheduler = read-only adapter. Engine = unchanged (Component 2; graph resolution supersedes its linear `nextPhaseOf` at Component 10 integration).

## 3. Schema (src/runtime/graph-types.ts)

```ts
export type NodeKind = 'entry' | 'gate' | 'action' | 'phase' | 'terminal';

export interface GovernanceNode {
  id: string;                 // canonical: '<phase>-<gate>' e.g. 'planning-pre', 'completion-final'
  phase?: PhaseName;          // required for all kinds except 'terminal'
  gate?: GateKind;            // required for all kinds except 'terminal'
  ruleIds: string[];          // non-empty for 'gate' | 'action'; empty for 'entry' | 'phase' | 'terminal'
  kind: NodeKind;             // 'action' = gate with resume-capable re-entry (clarification, human-approval)
}

export interface GovernanceEdge {
  from: string;               // existing node id
  to: string;                 // existing node id (resume fallback target when origin absent)
  on?: RuleDecision[];        // decisions this edge handles; absent = default edge (matches any uncovered decision)
  budget?: string;            // allowance name consumed per traversal (GRA §5 budgets)
  guarded?: boolean;          // approval-guarded: re-entry requires a fresh governed decision (ADV-09)
  resume?: boolean;           // when resolved with an origin, target = origin; else target = `to`
}

export interface AllowanceMap { [name: string]: number }   // finite positive integers only

export interface GovernanceGraphDefinition {
  nodes: GovernanceNode[];
  edges: GovernanceEdge[];
  entry: string;              // exactly one; no in-edges
  terminals: string[];        // sinks: no out-edges; never stepped as gates
  allowances: AllowanceMap;
}

export type GraphIssueCategory =
  | 'integrity' | 'transitions' | 'determinism' | 'reachability' | 'termination' | 'boundedness';

export interface GraphIssue {
  category: GraphIssueCategory;
  nodeId?: string;
  edge?: string;
  message: string;
}

export interface GraphValidationReport { valid: boolean; issues: GraphIssue[]; }
```

**Semantics:**
- **Resolution** (per node, per decision): the node's explicit edges whose `on` includes the decision; exactly one must match — else the node's *default* edge (no `on`); exactly one default per node. One matching edge or the graph is invalid (determinism/totality). Order never decides: this is the lattice principle (ADV-10) extended to transitions — no edge list order matters.
- **Resume**: chosen edge with `resume: true` → target = `origin` when the caller supplies one, else `to` (the linear fallback). Origin is runtime state recorded when entering the action node via a budgeted/guarded edge (Component 10). This keeps re-entry origin-aware ("re-run the same gate", GRA §5) while every statically-declared edge remains total.
- **Budget**: traversals consume the named allowance (finite). Budgets are the GRA §5 constants, declared as data.
- **Guard**: approval-guarded edges are accepted in the boundedness proof; their semantic boundedness (fresh governed decision per re-entry, deny/timeout → BLOCK, finite approval targets) is enforced by the runtime (Approval Manager/Executor) and covered by adversarial tests — the validator proves structure, the runtime proves semantics, tests prove both.
- **Stepping**: only `gate` and `action` nodes are stepped by the engine (they carry ruleIds; the engine's empty-gate integrity error is preserved). `entry`/`phase` nodes are traversal points (producers run, no gate step). `terminal` nodes are sinks (BLOCK → `blocked`; completion → `completed`).

## 4. Graph Validator — proof obligations

`validateGraph(definition, { knownRuleIds })` returns a report; the `GovernanceGraph` constructor rejects invalid definitions (throws `RuntimeIntegrityError` with the issue list). Fail-closed: anything the validator cannot prove is an issue.

1. **Integrity**: exactly one entry; entry has no in-edges; every terminal exists, is a sink (no out-edges), and is `kind: 'terminal'`; every edge references existing nodes; `on` values are canonical decisions; at most one default edge per node; no duplicate node ids; node ruleIds reference known rules (when `knownRuleIds` given) and contain no duplicates; `budget` names resolve to declared allowances; allowances are finite positive integers; `phase`/`gate` present exactly for non-terminal kinds; ruleIds non-empty for `gate`/`action` and empty for `entry`/`phase`/`terminal`.
2. **Valid transitions**: every non-terminal node has a `BLOCK` edge targeting a terminal (GRA §5: BLOCK is terminal for the revision — this can never be omitted); `resume` edges only from `action` nodes and only on `ALLOW`/`NO_ACTION_REQUIRED`.
3. **Determinism/totality**: every node resolves exactly one edge per decision (explicit match or default); no two explicit edges on the same node share a decision.
4. **Reachability**: every node is reachable from the entry via static edges (resume edges followed to their `to` fallback — conservative).
5. **Termination**: every node reaches a terminal via static edges (BLOCK edges guarantee this in any valid graph, verified anyway).
6. **Bounded loops**: 
   - static SCCs computed with resume edges excluded (a resume traversal without origin falls back to `to` and can never close a cycle; with origin it requires a budgeted/guarded entry — rule 6b);
   - every SCC containing a cycle (size > 1 or self-loop) contains at least one `budget` or `guarded` edge;
   - every `action` node (resume-capable) has at least one budgeted or guarded in-edge;
   - otherwise the graph is rejected (fail-closed; e.g., an unbudgeted self-loop fails the proof).

## 5. Default graph (from GRA §2 + §5)

### Nodes

| Node id | Kind | ruleIds (GRA §2 gate table) |
|---|---|---|
| `request-received-pre` | entry | — |
| `intent-analysis-post` | gate | S-005 |
| `clarification-pre` | action | S-005 |
| `clarification-post` | gate | S-005 |
| `planning-pre` | gate | E-001, S-011, S-006 |
| `planning-post` | gate | S-005 |
| `task-compilation-pre` | gate | S-001, S-010, S-012 |
| `execution-post` | gate | S-007, S-010, S-003, S-011 |
| `verification-pre` | gate | S-002, S-004, S-009 |
| `verification-post` | gate | S-002, S-009 |
| `build-pre` | gate | S-008 |
| `build-post` | gate | S-008 |
| `memory-update-pre` | phase | — |
| `human-approval-pre` | action | S-006, E-001 |
| `completion-final` | gate | all 13 (full battery) |
| `blocked` | terminal | — |
| `completed` | terminal | — |

### Edges (families; the factory declares them explicitly as data)

- **Default chain** (default edges along PHASE_ORDER — the declared linear order): `request-received-pre → intent-analysis-post → clarification-pre → clarification-post → planning-pre → planning-post → task-compilation-pre → execution-post → verification-pre → verification-post → build-pre → build-post → memory-update-pre → human-approval-pre → completion-final → completed`.
- **Uniform per non-terminal node** (explicit): `BLOCK → blocked`; `REQUIRE_APPROVAL → human-approval-pre` (guarded); `ASK_FOR_CLARIFICATION → clarification-pre` (budget `clarify`); `RETRIEVE_EVIDENCE → self` (budget `retrieve`); `RETRY → self` (budget `retry`).
- **Action-node specials**: `clarification-pre`: `ALLOW`/`NO_ACTION_REQUIRED → clarification-post` (resume), `ASK_FOR_CLARIFICATION → self` (budget `clarify`), `REQUIRE_APPROVAL → human-approval-pre` (guarded). `human-approval-pre`: `ALLOW`/`NO_ACTION_REQUIRED → completion-final` (resume), `REQUIRE_APPROVAL → self` (guarded).
- **Memory phase**: `memory-update-pre`: `ARCHIVE → self` (budget `archive`).
- `completion-final`: `ALLOW`/`NO_ACTION_REQUIRED → completed` (explicit), rest uniform.

### Allowances (GRA §5, declared as data)

```
clarify: 3    retry: 2    retrieve: 2    archive: 1
```

### Why the default graph passes the proof

- Integrity/transitions/determinism: enforced by construction in the factory; verified by the validator and tests.
- Reachability/termination: the default chain reaches every node; every node has `BLOCK → blocked`.
- Bounded loops: static SCCs (resume excluded) are exactly the self-loops — `RETRY`/`RETRIEVE`/`ARCHIVE`/`ASK` (budgeted) and `REQUIRE_APPROVAL` (guarded). Every action node's in-edges include budgeted `ASK` edges (clarification) or guarded `REQUIRE_APPROVAL` edges (human-approval). No unbudgeted cycle exists. ADV-13 (endless retry/clarify loop) is structurally impossible: every loop consumes a declared allowance and exhausts to `BLOCK`.

## 6. Rule Scheduler — thin adapter (src/runtime/rule-scheduler.ts)

```ts
class RuleScheduler {
  constructor(graph: GovernanceGraph);
  activate(nodeId: string): GateSpec;   // { id, phase, gate, ruleIds } from the graph node; throws for entry/phase/terminal
  next(nodeId: string, decision: RuleDecision, origin?: string): string;  // delegates to graph.next
  readonly graph: GovernanceGraph;
}
```

- Zero workflow logic: no decision conditionals, no lattice logic, no phase knowledge, no rule ids in code. All behavior is graph data; the scheduler only reads it (source-conformance tested, like the Policy Dispatcher).
- Errors: unknown node → `RuntimeIntegrityError`; unresolvable decision → `RuntimeIntegrityError` (cannot happen in a validated graph).

## 7. Integration boundary

- Component 4 ships the graph + validator + scheduler standalone (data, proof, adapter). The engine is untouched.
- Component 10 (Runtime Integration) resolves the next node via the scheduler instead of linear `nextPhaseOf`; `PHASE_ORDER` remains the declared order that the default edges encode. Origin tracking for resume edges is runtime state, recorded at Component 10.
- Threat mapping: ADV-10 — transitions are order-independent data (determinism proof); ADV-12 — wiring is validated data, not code; ADV-13 — allowances + bounded-loops proof; ADV-16 — guarded approval edges + runtime enforcement.

## 8. Review checklist

1. Graph is the sole authority for execution order and valid transitions?
2. Scheduler contains zero workflow logic (only adapter reads)?
3. Validator proves all six obligations (integrity, transitions, determinism, reachability, termination, bounded loops) and rejects what it cannot prove?
4. Default graph faithful to GRA §2 table and §5 budgets?
5. Resume/origin semantics and guarded-edge enforcement boundary (validator = structure, runtime = semantics) accepted?

**Approval status:** PENDING. Implementation of Component 4 (graph-types, graph, graph-validator, rule-scheduler + tests) is blocked on sign-off.
