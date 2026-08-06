# Runtime Components

Component manifest for LOOP 4 — Governance Runtime Implementation.
Each component exposes: Purpose, Inputs, Outputs, Dependencies, Failure Modes, Tests, Future Extension Points (RULE 6).
Every component cites the RUNTIME-ARCHITECTURE.md (GRA) sections it satisfies (RULE 4).

| # | Component | Status |
|---|-----------|--------|
| 1 | Governance Context | COMPLETE — ARCHITECTURE STABLE (review gate passed, see [COMPONENT-1-REVIEW.md](COMPONENT-1-REVIEW.md)) |
| 2 | Runtime Engine | COMPLETE |
| 3 | Policy Dispatcher | COMPLETE (Policy Engine first, then thin dispatcher — see [ONTOLOGY.md](ONTOLOGY.md) §8/§9) |
| 4 | Rule Scheduler | REDESIGNED as Governance Graph + Graph Validator + thin Rule Scheduler — spec [COMPONENT-4-GOVERNANCE-GRAPH.md](COMPONENT-4-GOVERNANCE-GRAPH.md), awaiting sign-off |
| 5 | Action Executor | PENDING |
| 6 | Audit Logger | PENDING |
| 7 | Memory Interface | PENDING |
| 8 | Approval Manager | PENDING |
| 9 | Adapter Interface | PENDING |
| 10 | Runtime Integration | PENDING |

---

## Component 1 — Governance Context

**Architecture references:** GRA §0 (runtime owns context assembly — never rules), §3 (Governance Context schema, assembly contract, producer manifest, immutability, vacuous-pass detection inputs), §4 (vacuous-pass policy — required-state registry), §6 (AuditEntry type referenced by `context.audit`).

**Purpose**
The single object every rule receives. Immutable, self-describing (producer manifest), with derived approval state and per-rule required-state detection so the engine can apply the vacuous-pass policy without guessing.

**Inputs** (`ContextBuildOptions`)
- `requestId`, `phase` (11-phase lifecycle), `gate` (`pre|post|final`), `request` (validated, with `rawText`/`normalizedIntent`), `producers` (manifest)
- Optional: `revision`, `goal`, `task`, `requirements`, `interpretations`, `assumptions`, `claims`, `evidence` (partial), `memory`, `risk`, `approvals`, `audit`, `environment`
- `REQUIRED_STATE` registry input: a `GovernanceContext`

**Outputs**
- A deeply frozen `GovernanceContext` (GRA §3 schema)
- `approvals.missing` derived from `required` vs `granted`
- `getRequiredState(ctx, ruleId) → { present, subjects }` per rule (Step 1 table)

**Dependencies**
- `constitution/types.ts` record types (requirements, artifacts, decisions, …)
- `constitution/glossary.ts` (`isGovernedDecision` — approval validity)
- `constitution/helpers.ts` (`GOVERNED_ARTIFACT_KINDS`)
- Node `structuredClone` (deep isolation)

**Failure Modes**
- `RuntimeIntegrityError`: missing `requestId`/`request`/`producers`, unknown phase/gate/environment, negative revision, empty `rawText`/`normalizedIntent`, non-cloneable input, populated field without producer manifest (strict mode), unknown rule id in `getRequiredState`
- `TypeError` on any mutation of the frozen context (rules violating immutability)
- Strict-manifest is bypassable via `{ strictManifest: false }` — runtime engine will use strict only

**Tests**
- `tests/runtime/context.test.ts` — assembly, defaults, derived `missing`, manifest coverage, input isolation, deep freeze, mutation rejection, 8 invalid-input cases
- `tests/runtime/required-state.test.ts` — all 13 rules' present/subjects, unknown-rule error
- `tests/runtime/context-architecture.test.ts` — GRA conformance: §2 phases/gates, §3 schema keys, §4 lattice, §6 audit schema
- Regression: full suite green (266 + 52 new)

**Future Extension Points**
- `GoalRecord`/`TaskRecord` presence at early phases (currently synthesized empty defaults to satisfy the non-optional schema; may become truly optional)
- Risk scorer (component 2) writes `risk`; builder only carries it
- New rules register a required-state check alongside their rule definition

---

## Component 2 � Runtime Engine

**Architecture references:** GRA �0 (engine is the governor: decides, never performs work), �2 (phase/gate execution), �3 (fresh-context-per-gate invariant, risk score), �4 (lattice merge, fail-action refinement, approval coupling, amended vacuous-pass policy), �6 (nothing silent, hash chain).

**Purpose**
Deterministic, immutable state machine. Consumes one frozen Governance Context and a gate specification, synthesizes one decision via the order-independent lattice, seals a complete audit trail, and produces a new frozen context for the next gate. Zero knowledge of rules' internals and of any AI model/provider (conformance-scanned).

**Inputs**
- A frozen `GovernanceContext` (component 1)
- A `GateSpec` (id, phase, gate kind, rule ids)
- Ports: `RuleEvaluatorPort` (evaluate/ruleName), `PolicyPort` (failAction refinement, GRA �4), `Clock` (injectable for determinism)
- `WORK_CLAIMED` discriminator + `REQUIRED_STATE` + `RULE_INPUTS` registries (Step 1 table data)

**Outputs**
- `EngineStepResult`: synthesized `RuleDecision`, per-rule contributions (pass/fail/na + vacuous), sealed `AuditEntry[]` (rule entries + SYNTHESIS entry), `after` context (immutable, audit appended), `nextPhase` (advances only on ALLOW / NO_ACTION_REQUIRED)
- `sealEntry` / `canonicalStringify` � pure chain helpers reused by the Audit Logger
- `computeRisk` / `isHighRisk` � GRA �3 risk scorer (factors: request type, environment, ambiguity, unverified claims, missing approvals, dependency graph size)

**Dependencies**
- `context.ts` (builder), `required-state.ts` (REQUIRED_STATE / WORK_CLAIMED / RULE_INPUTS), `types.ts` (lattice)
- Node `crypto` (sha256 chain) � no other runtime dependencies

**Failure Modes**
- `RuntimeIntegrityError`: empty gate, unknown rule in gate, duplicate rule in gate, port failure on unknown rule
- Missing evidence (work claimed, required state absent) ? `RETRIEVE_EVIDENCE` � never BLOCK
- Nothing to verify (no work claimed) ? `NO_ACTION_REQUIRED` � never conflated with missing evidence
- Context mutation impossible: inputs frozen, outputs frozen

**Tests**
- `tests/runtime/engine.test.ts` � determinism (identical input ? identical output incl. hashes), gate invariant (no mutation, fresh frozen after-context, complete trail), lattice synthesis, ADV-10 order independence, approval coupling, NO_ACTION_REQUIRED vs RETRIEVE_EVIDENCE (R-1 resolution), phase advancement, integrity failures, audit evidence/affected objects
- `tests/runtime/risk.test.ts` � factor scoring, determinism, caps, monotonicity, high-risk threshold
- `tests/runtime/model-agnostic.test.ts` � conformance scan: no provider/model tokens in src/runtime
- Architecture validation: `context-architecture.test.ts` updated for the amended decision set
- Regression: full suite green (344 tests)

**Future Extension Points**
- Rule Scheduler (4) supplies `GateSpec`s from the gate table; engine stays scheduler-agnostic
- Policy Dispatcher (3) supplies the real `PolicyPort` (failAction declarations for the 13 rules) — DONE, see Component 3
- Audit Logger (6) reuses `sealEntry`/`canonicalStringify` and owns the append-only store

---

## Component 3 — Policy Engine + Policy Dispatcher

**Architecture references:** GRA §4 (fail-action refinement), ONTOLOGY §8 (Policy Model, approved 2026-08-02), §9 (contradiction resolutions C-1..C-5, approved).

**Purpose**
The Policy Engine owns the canonical mapping `ruleId → failAction` (pure, context-reading): it defines what an *evaluated failure* of each rule means. The Policy Dispatcher is a thin routing seam with zero business logic — given `(ruleId, ctx)` it delegates to the Policy Engine and returns the decision. Any policy change happens only in the Policy Engine; any routing change happens only in the dispatcher.

**Inputs**
- A frozen `GovernanceContext` and a `ruleId` (engine calls the ports during `stepGate`)

**Outputs**
- `PolicyEngine implements PolicyPort`: `failAction(ruleId, ctx) → RuleDecision` (13 policies, 4 context-branched: S-003, S-005, S-008, S-011; 9 constants)
- `POLICY_TABLE` / `declarations()` — every policy's semantics exposed for documentation and audit
- `PolicyDispatcher implements PolicyPort`: pure delegation to its target policy engine

**Dependencies**
- `engine.ts` (`PolicyPort`), `types.ts` (`RuleDecision`), `errors.ts` (`RuntimeIntegrityError` on unknown rule)
- `constitution/glossary.ts` (`isHumanConsent`, `isPinnedVersion`) for the context branches

**Failure Modes**
- `RuntimeIntegrityError`: unknown rule id (never silently defaulted)
- Dispatcher must not mask policy errors — it propagates them (tested)

**Contradiction resolutions implemented (ONTOLOGY §9, approved)**
- C-1: `S-003` required-state = work present; consent absence evaluates → `REQUIRE_APPROVAL`
- C-2: `S-006` flagged ⇒ always evaluates ⇒ `REQUIRE_APPROVAL`
- C-3: `E-001` engineering work claimed ⇒ evaluates ⇒ `REQUIRE_APPROVAL`
- C-4: `S-004` required-state covers only verifiable claims; unverifiable claims evaluate → `ASK_FOR_CLARIFICATION`
- C-5: `S-008` absent build at build gate → `RETRIEVE_EVIDENCE` (amended policy supersedes Step 1 BLOCK)

**Tests**
- `tests/runtime/policy-engine.test.ts` — §8 table coverage (all 13), constant failActions, context branches (S-003/S-005/S-008/S-011), determinism, unknown-rule integrity
- `tests/runtime/policy-dispatcher.test.ts` — thin routing (delegation, pass-through, error propagation), zero-business-logic source conformance (no rule-id conditionals, no lattice, no branching), and full-chain integration: real `ConstitutionEngine` rules (test-local projection adapter) + PolicyEngine + dispatcher + `RuntimeEngine` covering C-1..C-5 and policy-routed BLOCK/REQUIRE_APPROVAL/ASK/RETRIEVE outcomes
- `tests/runtime/required-state.test.ts` — updated to C-1..C-4 semantics
- Regression: full suite green (366 tests, 34 files)
