# Governance Runtime Architecture (GRA)

**Status:** DESIGN — implementation is blocked until Step 8 review sign-off.
**Scope:** The runtime is the *governor*. The ConstitutionEngine (`src/constitution/`) is only a rule *evaluator*.
**Rule:** If this architecture changes, rewrite this document before coding. Never code against an outdated design.

---

## 0. Boundary: Engine vs Runtime

| Concern | ConstitutionEngine | Governance Runtime |
|---|---|---|
| Rule evaluation | pure `evaluate(input) → pass/fail` | — |
| When rules execute | — | phase gates |
| What data rules see | the context it is handed | assembles the single Governance Context |
| What state changes | none (pure) | owns all mutation: approvals, audit, memory, retries |
| Conflict resolution | none | deterministic decision lattice |
| Actions | none | performs ALLOW / BLOCK / ASK / APPROVAL / RETRIEVE / RETRY / ARCHIVE |
| Audit | none | hash-chained, nothing silent |

The runtime never evaluates rules itself. The engine never decides anything.
The runtime decides; the engine measures. All rules are pure predicates (`pass|fail`); every rule declares what its failure means; the runtime synthesizes one deterministic decision per gate.

---

## 1. Step 1 — Rule Inventory

Every rule reads ONLY fields of the Governance Context (Step 3). Producers are the named components/phases that populate those fields. **Side effects: none, for every rule** — a rule only contributes a decision.

| Rule | Inputs (context fields) | Outputs (decision contribution) | Required State (non-vacuous) | Side Effects | Dependencies (producers) |
|---|---|---|---|---|---|
| E-001 | `request.type`, `request.requirementIds`, `approvals.granted[experience-architecture]` | fail → `REQUIRE_APPROVAL` | approval record: decision `EXECUTE`, `governanceChecks: PASS`, target `experience-architecture` | none | Human Approval workflow; request classifier |
| S-001 | `request.requirementIds`, `requirements[]` | fail → `BLOCK` | ≥1 unique id; every id resolves to a `status: approved` requirement with a governed approval | none | Requirements registry (Intent Analysis); approval queue |
| S-002 | `claims[]`, `evidence.artifacts[]`, `evidence.verificationRuns[]` | fail → `RETRIEVE_EVIDENCE` (missing run) / `BLOCK` (run failed) | every claim has a run on the same artifact with `pass`, `reproducible`, `sourceVersion` match | none | Claim authors (Execution); Verification harness |
| S-003 | `evidence.artifacts[].conformanceViolations`, `request.proposesRequirementChange`, `decisions[]` | fail → `BLOCK` (violations) / `REQUIRE_APPROVAL` (amendment w/o human consent) | violations arrays populated; decisions populated when an amendment is proposed | none | Compliance scanner; Human Approval |
| S-004 | `claims[]` (`unverifiable`, `owner`, `rationale`), `evidence.verificationRuns[]` | fail → `RETRIEVE_EVIDENCE` (undemonstrated) / `ASK_FOR_CLARIFICATION` (unverifiable w/o owner+rationale) | claims complete; runs present for verifiable claims | none | Claim author metadata; Verification harness |
| S-005 | `requirements[].text`, `interpretations[]`, `assumptions[]`, `evidence.artifacts[].trace` | fail → `ASK_FOR_CLARIFICATION` (material ambiguity w/o approved assumption) / `BLOCK` (empty text, missing trace target) | interpretations collected; assumptions registered; traces resolvable | none | Intent Analysis (interpretation collector); Clarification (assumption register) |
| S-006 | `request.type`, `environment.role`, `decisions[]` | fail → `REQUIRE_APPROVAL` | decisions populated for flagged targets (deployment, requirement-amendment, architecture-change) | none | Human Approval workflow |
| S-007 | `evidence.artifacts[]` (`kind`, `trace`), `requirements[]` | fail → `BLOCK` | artifacts registry complete for the phase; every governed kind (`source`, `test`, `configuration`, `documentation`, `deployment`) traced | none | Execution (artifact registry) |
| S-008 | `evidence.build`, `evidence.dependencies[].version` | fail → `RETRY` (non-determinism / divergent hashes) / `BLOCK` (unpinned dep, absent build) | build record present (absence is a violation in the build phase) | none | Build system |
| S-009 | `claims[]`, `evidence.verificationRuns[]` (`reproducible`, `externalStateDependency`, `environmentFingerprint`, `sourceVersion`), `evidence.artifacts[].sourceVersion` | fail → `RETRY` (re-run reproducibly) / `RETRIEVE_EVIDENCE` (missing fingerprint) | runs complete with fingerprint; source versions recorded | none | Verification harness |
| S-010 | `task.hunks` / `changes[]`, `evidence.artifacts[].trace` | fail → `BLOCK` | change capture complete (task → hunk → artifact → cited requirement) | none | Task Compilation; Execution (change capture) |
| S-011 | `evidence.architecture` | fail → `REQUIRE_APPROVAL` (not approved) / `BLOCK` (unresolved violation, unscoped constraint) | architecture record present in Planning/Execution gates | none | Architecture registry (Planning) |
| S-012 | `evidence.resolvedDependencyGraph`, `evidence.dependencies[]`, `requirements[]` | fail → `BLOCK` | graph and records complete; every resolved dep has pinned version, requirementId, justification, governed approval | none | Dependency resolver; Human Approval |

**Dataflow:** producers → context fields → rules. The runtime's gate wiring (Step 2) is a pure function of this table: a rule may only run at gates where all its producers have already run.

---

## 2. Step 2 — Execution Points

Request lifecycle with phase gates. `PRE` = before work, `POST` = after work. The build sub-phase sits inside Verification (existing pipeline has a build stage; the mission phase list does not, so it is declared here as an extension).

```
Request Received
  → Intent Analysis
  → Clarification
  → Planning
  → Task Compilation
  → Execution
  → Verification [BUILD]
  → Memory Update
  → Human Approval
  → Completion
```

| Phase | PRE gate | POST gate | Producers invoked | Notes |
|---|---|---|---|---|
| Request Received | — (runtime integrity only) | — | envelope validator | well-formedness; no constitution rules yet; audit: request accepted |
| Intent Analysis | — | S-005 | interpretation collector, requirement registry, classifier | ambiguity detected here; `request.type` and flags set; S-001 preliminary (cites requirements?) |
| Clarification | S-005 | S-005 | assumption register | ambiguity → ASK; answers become approved assumptions; budget 3 rounds |
| Planning | **E-001**, S-011, S-006 | S-005 | architecture registry, approval queue | E-001 first rule of engineering: experience must be approved before planning begins |
| Task Compilation | S-001, S-010, S-012 | — | change capture, dependency resolver | every compiled task cites approved requirements; deps justified+approved |
| Execution | — | S-007, S-010, S-003, S-011 | artifact registry, compliance scanner, change capture | POST: everything produced is traced, conformant, no new violations |
| Verification | S-002, S-004, S-009 | S-002, S-009 | verification harness | evidence runs produced then re-checked (claims → runs → run quality) |
| BUILD (sub-phase) | S-008 | S-008 | build system | reproducible build, pinned deps |
| Memory Update | — | — | memory store | no rules gate writes; writes are audited; conflict detection → `ARCHIVE` action |
| Human Approval | S-006, E-001 (deferred approvals) | — | approval queue | approvals granted here become `approvals.granted`; re-run dependent gates |
| Completion | **FULL BATTERY (all 13)** | — | all producers | release gate: every rule against the final context; then audit seal |

**Rules that run at multiple gates:** S-005 (Intent, Clarification), S-006 (Planning, Human Approval, and any gate where flags fire), S-002/S-009 (Verification PRE+POST), E-001 (Planning; also Completion via full battery).

**Rule activation is phase-determined, not rule-determined.** No rule decides whether it runs; the runtime's gate table decides. This is an anti-bypass property (Step 7, threat 12). *(Superseded in form, not intent, by Amendment 2026-08-02, §9: rule activation is node-determined — the Governance Graph declares each node's rules as verified data.)*

---

## 3. Step 3 — Governance Context

Every rule receives exactly one object: the **Governance Context**. Rules never read globals, `process.env`, files, or external state — the `evaluate(input)` signature is the enforcement boundary, and the runtime freezes the object before handing it out.

```ts
interface GovernanceContext {
  meta: {
    requestId: string;
    revision: number;          // BLOCK/revision increments
    phase: PhaseName;
    gate: 'pre' | 'post' | 'final';
    builtAt: string;           // UTC ISO
    producerManifest: Array<{ field: string; producer: string; version: string; wroteAt: string }>;
  };
  request: RequestRecord;      // validated: id, raw text, normalized intent, type, requirementIds, flags
  goal: GoalRecord;            // id, text, status
  task: TaskRecord;            // id, requirementIds, planned hunks, introduced dependencies
  requirements: RequirementRecord[];
  interpretations: InterpretationRecord[];
  assumptions: AssumptionRecord[];
  claims: ClaimRecord[];
  evidence: {
    artifacts: ArtifactRecord[];
    verificationRuns: VerificationRunRecord[];
    build?: BuildRecord;
    dependencies: DependencyRecord[];
    resolvedDependencyGraph: string[];
    architecture?: ArchitectureRecord;
  };
  memory: MemorySnapshot;      // BOUNDED: relevant entries only
                               // [{ id, content, provenance, confidence, source, writtenAt, archived }]
  risk: RiskScore;             // { score: 0..100, factors: [{ factor, points, evidence }] }
  approvals: {
    required: Array<{ target: string; requiredByRules: string[] }>;
    granted: GovernedDecisionRecord[];   // includes authorizedBy / issuerId
    missing: string[];                   // derived
  };
  audit: AuditEntry[];         // prior history of THIS request (never the whole store)
  environment: { role: 'production' | 'staging' | 'development' };
}
```

**Assembly contract**
1. Producers are the only writers: interpretation collector, requirement registry, artifact registry, compliance scanner, verification harness, build system, dependency resolver, memory store, approval queue, classifier.
2. The runtime assembles a fresh context at every gate; fields are taken from producer output + prior audit + bounded memory snapshot.
3. Context is immutable to rules (frozen). The runtime is the only mutator.
4. `producerManifest` makes every field's origin auditable — evidence without provenance is not evidence.
5. Vacuous-pass detection: the runtime compares each applicable rule's *Required State* (Step 1 table) against the context; if required state is absent and the rule would pass, the pass is flagged `vacuous` (Step 4).

**Risk Score** — computed by the runtime from verified context only (request type, environment role, ambiguity count, unverified claim count, missing approvals, dependency graph size). Deterministic, audited factor-by-factor. **Risk never removes rules.** It only adds scrutiny (e.g., high risk forces the full battery at intermediate gates and mandates reproducibility checks). Because it cannot subtract checks, lowering it is not a bypass (Step 7, threat 17).

---

## 4. Step 4 — Conflict Resolution

### Decision set

```
ALLOW | BLOCK | REQUIRE_APPROVAL | ASK_FOR_CLARIFICATION | RETRIEVE_EVIDENCE | RETRY | ARCHIVE | NO_ACTION_REQUIRED
```

> **Amendment (human-approved, 2026-08-02):** `NO_ACTION_REQUIRED` added to the decision set — semantically distinct from `RETRIEVE_EVIDENCE`: it means "nothing to verify" (rule not applicable; no work claimed for its subject), while `RETRIEVE_EVIDENCE` means "evidence expected but missing". The two must never be conflated.

### Lattice (total order, descending)

```
BLOCK (7) > REQUIRE_APPROVAL (6) > ASK_FOR_CLARIFICATION (5)
  > RETRIEVE_EVIDENCE (4) > RETRY (3) > ARCHIVE (2) > ALLOW (1) > NO_ACTION_REQUIRED (0)
```

### Merge function

For a gate with rule results `R₁…Rₙ`, each contributing decision `dᵢ` (from `pass → ALLOW`; `fail → rule.failAction(ctx)`; not applicable → `NO_ACTION_REQUIRED`):

```
finalDecision = max({ d₁ … dₙ })     // by lattice rank
```

- `max` is commutative and associative → **the outcome never depends on execution order**. This is the deterministic precedence the architecture requires: if A blocks and B allows, `max(BLOCK, ALLOW) = BLOCK`, regardless of which rule ran first or last.
- Ties (two rules with the same rank) change nothing; both are recorded in the audit with their evidence.
- Rule ID is used only for audit sorting, never for decision-making.
- A gate whose contributions are ALL `NO_ACTION_REQUIRED` synthesizes `NO_ACTION_REQUIRED` (nothing to verify — audited, non-blocking, advances the phase like `ALLOW`).

### Fail-action refinement

Each rule declares `failAction: RuleDecision | ((ctx) => RuleDecision)` — pure, context-readable, never order-sensitive. Examples already listed in Step 1 (S-002: missing run → `RETRIEVE_EVIDENCE`, failed run → `BLOCK`).

### Vacuous-pass policy (amended 2026-08-02)

At a gate where a rule is **mandatory** (gate table marks it required), the rule's Required State (Step 1 table) may be absent. The runtime distinguishes two cases via the **work-claimed discriminator** (derivable from `request`, `claims`, `task` — no new context fields):

1. **No work claimed** for the rule's subject → the rule contributes `NO_ACTION_REQUIRED` ("nothing to verify"). Recorded in audit, not a failure, never a block.
2. **Work claimed but Required State absent** → `RETRIEVE_EVIDENCE` (evidence was expected and is missing; absence of evidence is not compliance).

Never `BLOCK` on missing evidence alone. The audit entry carries `vacuous: true` in both cases, and the `outcome` is `'na'` (rule not evaluated).

### Approval coupling

If `approvals.missing` is non-empty and any rule's required state lists an approval target that is missing, the decision is at least `REQUIRE_APPROVAL`. The lattice handles it: any `BLOCK` still wins.

### Completeness rule

A decision is only valid if every rule the gate table assigned to the phase actually executed and produced an audited result. A gate that "forgot" a rule is an integrity error, not a pass (Step 6).

---

## 5. Step 5 — Actions

Rules never perform work. The runtime maps the final decision to exactly one action, executes it, and audits it. All actions are idempotent-safe and bounded by budgets.

| Decision | Runtime action | State transition | Budget |
|---|---|---|---|
| `ALLOW` | proceed to next phase | phase += 1; gate state advanced | — |
| `BLOCK` | halt the revision; emit failure report (rules, evidence, reason, affected objects); route to planner/human; request may be resubmitted as a new revision | revision += 1 on resubmission; request paused | terminal for this revision |
| `ASK_FOR_CLARIFICATION` | compile question set from rule evidence (e.g., S-005 interpretation list); pause; on answer → re-assemble context, re-run the SAME gate | no state change until answered | 3 rounds, then escalate to `REQUIRE_APPROVAL` (if answerable by human) else `BLOCK` |
| `REQUIRE_APPROVAL` | create approval task (target, scope, evidence, requester); route to human queue; on grant → write approval record (`authorizedBy`, timestamp) and re-run dependent gates | `approvals.granted` grows | deny or timeout → `BLOCK` (fail-safe: no auto-approve, ever) |
| `RETRIEVE_EVIDENCE` | invoke evidence producers (verification harness, memory search, model substantiation with provenance) | evidence fields refreshed; re-run gate | 2 rounds, then `BLOCK` (cannot confirm compliance) |
| `RETRY` | re-run the failing operation (build/verify) preserving input fingerprint | attempt counter audited; re-run gate | 2 attempts, then `BLOCK` |
| `ARCHIVE` | move conflicting/stale memory entries to archive; refresh memory snapshot; re-run affected rules | memory snapshot updated | 1 sweep per gate |

**Action exclusivity:** exactly one action per gate. Secondary needs are folded into the action payload (e.g., `BLOCK` message may list the questions that would have been asked), never executed.

---

## 6. Step 6 — Audit Records

Nothing happens silently. Every gate, every decision, every action, every vacuous pass, and every context assembly produces an entry.

```ts
interface AuditEntry {
  id: string;                    // requestId:gate:seq
  requestId: string;
  revision: number;
  phase: PhaseName;
  gate: 'pre' | 'post' | 'final';
  timestamp: string;             // UTC ISO, monotonic
  ruleId: string;                // rule that produced this result
  ruleName: string;
  outcome: 'pass' | 'fail' | 'na'; // 'na' = not evaluated (NO_ACTION_REQUIRED / missing evidence)
  decision: RuleDecision;        // contribution or synthesized final
  vacuous: boolean;              // pass with zero required-state subjects
  evidence: Array<{ kind: 'verification-run' | 'approval' | 'memory' | 'context-field' | 'producer-manifest'; id: string; version?: string; reference?: string }>;
  reason: string;                // rule message / action reason
  affectedObjects: Array<{ kind: 'artifact' | 'requirement' | 'change' | 'dependency' | 'memory' | 'request' | 'approval'; id: string }>;
  actor: 'runtime' | 'human' | 'model' | 'system';
  actionTaken?: string;          // what the runtime did, if this is an action entry
  prevHash: string | null;
  hash: string;                  // sha256(prevHash + canonical JSON of entry sans hash)
}
```

**Store properties**
- Append-only; runtime is the only writer; entries are never edited or deleted.
- Hash chain per request; the Completion seal is the chain tail.
- Gate completeness entries: a gate run logs one entry per rule executed, plus one synthesized-decision entry, plus one action entry — even when zero rules were applicable (vacuous gate log).
- Context assembly entries: `producerManifest` is recorded so every decision cites where its data came from.
- Cross-request: approvals and memory writes are audited globally (they outlive one request).

---

## 7. Step 7 — Threat Analysis

Adversary model: *any input* — user prompt, model output, memory content, verification results, dependency metadata. Goals: ungoverned execution (bypass), fake compliance, denial, memory/audit poisoning.

| # | Attack | Vector | Rules engaged | Defense | Adversarial test (expect) |
|---|---|---|---|---|---|
| ADV-01 | Ambiguous prompt smuggling | one request that reads as both deploy and no-op | S-005, S-006 | interpretation collector flags material divergence | `ASK_FOR_CLARIFICATION` |
| ADV-02 | Conflicting memories | old "approved" vs new "revoked" record | (memory gate) | snapshot carries provenance+confidence; conflict → `ARCHIVE` | `ARCHIVE` then re-run, not `ALLOW` |
| ADV-03 | Hallucinated evidence | model claims passing run that doesn't exist | S-002, S-009 | runs keyed by artifact source version + environment fingerprint | `RETRIEVE_EVIDENCE` → `BLOCK` |
| ADV-04 | Missing approval | approval record absent or not human-authorized | S-006, E-001, S-012 | `isGovernedDecision` requires governanceChecks PASS + authorizedBy/issuerId | `REQUIRE_APPROVAL` / `BLOCK` |
| ADV-05 | Model disagreement | two models give conflicting risk/intent | classifier, risk scorer | disagreement → clarification/approval; risk factors audited | `ASK_FOR_CLARIFICATION` |
| ADV-06 | Vacuous pass | attacker empties claims/changes arrays | all rules | vacuous-pass policy → `RETRIEVE_EVIDENCE` | `RETRIEVE_EVIDENCE` |
| ADV-07 | Context flooding | 10k claims hiding one invalid | S-002 | context budgets and caps; sampled then full re-check | bounded context; decision unchanged |
| ADV-08 | Evidence replay/staleness | old run reused for new source version | S-002, S-009 | `sourceVersion` match enforced | fail → `RETRIEVE_EVIDENCE` |
| ADV-09 | Approval replay | approval copied to a different request/scope | S-006, S-012 | approvals bound to requestId+target+scope | `REQUIRE_APPROVAL` |
| ADV-10 | Rule shadowing / order dependence | exploit rule ordering | runtime | lattice `max`, order-independent merge | shuffle rule order → identical decision |
| ADV-11 | Audit tampering | edit a prior entry | audit store | hash chain; store write-only | chain break detected; integrity error |
| ADV-12 | Action injection | prompt text says "skip governance" | runtime | raw prompt is data, never instructions; gate table is code | request still gated |
| ADV-13 | Unbounded retry/clarification loop | endless failure for denial of service | runtime | budgets (3 clarify / 2 retry / 2 retrieve) | `BLOCK` after budget exhausted |
| ADV-14 | False unverifiable claims | mark claim unverifiable to dodge S-002 | S-004 | owner+rationale mandatory; unverifiable allowed only for declared kinds | fail → `ASK_FOR_CLARIFICATION` |
| ADV-15 | Dependency smuggling | resolved dep with no record/approval | S-012 | graph-vs-records completeness | `BLOCK` |
| ADV-16 | Deferred-approval dodge | defer approval past its gate | S-006, E-001 | approvals bound to gate; missing at mandatory gate → `REQUIRE_APPROVAL` | `REQUIRE_APPROVAL` |
| ADV-17 | Risk-sandbagging | actor lowers risk to skip checks | risk scorer | risk adds scrutiny, never removes rules | high-scrutiny path intact |

**Design rules derived from the table**
1. Never trust a decision the gate table didn't produce (completeness rule, Step 4).
2. Never trust evidence without provenance (`producerManifest`, Step 3).
3. Never auto-grant an approval (Step 5).
4. Absence ≠ compliance (vacuous-pass policy).
5. Order never decides (lattice).
6. Nothing unlogged (Step 6).

---

## 8. Step 8 — Review

**Implementation is blocked until this section is accepted.** Review checklist:

1. Rule inventory (Step 1) — any missing input/state/dependency for a rule?
2. Phase mapping (Step 2) — is every rule at the right gate(s)? Correct PRE/POST?
3. Context shape (Step 3) — complete? Are `goal`, `task`, `risk`, `memory` shaped right?
4. Lattice ranks (Step 4) — is `BLOCK > REQUIRE_APPROVAL > ASK > RETRIEVE > RETRY > ARCHIVE > ALLOW` correct? Should `ARCHIVE` rank higher?
5. Actions + budgets (Step 5) — 3 clarify / 2 retry / 2 retrieve / deny-on-timeout: acceptable?
6. Audit schema (Step 6) — complete? Should the runtime also write a global chain across requests?
7. Threat table (Step 7) — missing attack vectors? Missing adversarial tests?
8. Integration stance — the runtime will eventually *wrap* the existing `GovernancePipeline` stages as gates (designer, experience-governor, compiler, eng-governor, EAT, implementation-engine) plus the constitution rules; confirm this is the intended shape.

**Open questions for sign-off**
- Q1: Does the runtime replace `GovernancePipeline` orchestration, or sit alongside it as a new outer loop?
- Q2: Should `ARCHIVE` be a request-level decision at all, or memory-phase-only (current design: memory-phase-only)?
- Q3: Approval timeout — confirm fail-safe deny-on-timeout.
- Q4: Should the Completion battery also require a human sign-off for production release, or is `ALLOW` sufficient with a full audit trail?
- Q5: Risk factors list — request type, environment role, ambiguity count, unverified claim count, missing approvals, dependency graph size. Add/remove any?

**Implementation order (post sign-off)**
1. `GovernanceContext` + assembly contract + producer manifest
2. Decision lattice + merge + vacuous-pass policy
3. Gate table + runtime state machine + budgets — *redesigned 2026-08-02 as the Governance Graph (Amendment §9): see [COMPONENT-4-GOVERNANCE-GRAPH.md](runtime/COMPONENT-4-GOVERNANCE-GRAPH.md)*
4. Audit store (hash chain) + nothing-silent logs
5. Rule `failAction` declarations (13 rules)
6. ADv-01…17 adversarial suite (acceptance: full pass)
7. Wrap existing pipeline stages as gates; wire `ConstitutionEngine` as evaluator

---

## 9. Amendment (human-approved 2026-08-02) — Governance Graph

**Status:** DESIGNED — implementation of Component 4 is blocked until sign-off of [COMPONENT-4-GOVERNANCE-GRAPH.md](runtime/COMPONENT-4-GOVERNANCE-GRAPH.md).

Step 8 implementation order item 3 ("gate table + runtime state machine + budgets") is replaced by the **Governance Graph**:

1. **Governance Graph** — authoritative data for execution order and valid transitions: nodes (gates, with rule activation), decision-conditioned edges, allowances (GRA §5 budgets: clarify 3 / retry 2 / retrieve 2 / archive 1), entry and terminals. Workflow logic becomes data, not code.
2. **Graph Validator** — proves well-formedness before the graph may be used: integrity, valid transitions (BLOCK is always terminal), determinism/totality (exactly one edge per node per decision; order never decides), reachability from entry, termination (every node reaches a terminal), and bounded loops (every static cycle contains a budgeted or guarded edge; every resume-capable action node has a budgeted/guarded in-edge; unprovable graphs are rejected).
3. **Rule Scheduler** — thin adapter with zero workflow logic: `activate(nodeId)` returns the gate's rules; `next(nodeId, decision, origin?)` resolves the transition from graph data.

**Scope notes:** rule activation is now node-determined (supersedes §2's phase-determined wording in form; the anti-bypass property is unchanged). `PHASE_ORDER` remains the declared linear order; the default edges encode it. The engine (Component 2) is unchanged; graph-based next-node resolution and resume-origin tracking replace the linear `nextPhaseOf` at Component 10 integration. The ontology (ONTOLOGY §5 request revision state machine) is formalized by the graph's decision-conditioned edges.
