# Architecture Review Gate — Component 1: Governance Context

**Verdict:** ARCHITECTURE STABLE — survives all scenarios without architectural change.
Three refinements are recorded (implementation guidance for later components, not redesigns).
Only after sign-off of this review may Component 2 begin.

---

## STEP 1 — Self Audit

Reviewed as if produced by another team.

### Q1: Is every field necessary?

| Field | Read by rules | Read by process (actions/scheduler/humans) | Necessary |
|---|---|---|---|
| `meta.*` | — | engine, scheduler, audit, approval manager (identity, phase, gate, provenance) | yes |
| `request` | S-001, E-001 (flags), S-003, S-006, S-005 | approval tasks, BLOCK reports, classifier | yes |
| `goal` | — | approval tasks, failure reports, clarification questions | yes (process-facing, not rule-facing) |
| `task` | S-010 (via required state) | RETRY action, change capture | yes |
| `requirements` | S-001, S-005, S-007, S-012 | — | yes |
| `interpretations` / `assumptions` | S-005 | clarification questions | yes |
| `claims` | S-002, S-004, S-009 | work-claimed discriminator (finding R-1) | yes |
| `evidence.artifacts` | S-002, S-003, S-005, S-007, S-009, S-010 | BLOCK reports | yes |
| `evidence.verificationRuns` | S-002, S-004, S-009 | RETRY/RETRIEVE actions | yes |
| `evidence.build` | S-008 | RETRY action | yes |
| `evidence.dependencies` + `resolvedDependencyGraph` | S-008, S-012 | dependency resolver | yes (both — see Q3) |
| `evidence.architecture` | S-011 | — | yes |
| `memory` | — | ARCHIVE action, memory interface | yes (process-facing) |
| `risk` | — (by design: never removes rules) | rule scheduler (adds scrutiny) | yes |
| `approvals.*` | E-001, S-003, S-006, S-012 (`granted`); engine (`missing` coupling) | approval manager | yes |
| `audit` | — | approval evidence, failure reports, memory update | yes (process-facing, bounded snapshot) |
| `environment.role` | S-006 | risk scorer | yes |

**Finding:** `goal`, `task`, `memory`, `risk`, `audit` are process-facing, not rule-facing. They are necessary (GRA §3 mandates them) but they expand the rule-visible surface. See R-3 for the coupling reduction.

### Q2: Is every field produced by exactly one producer?

| Field | Producer | Single? |
|---|---|---|
| `request` | envelope validator / classifier | ✓ |
| `goal` | goal tracker | ✓ |
| `task` | task compiler (change capture) | ✓ |
| `requirements` | requirements registry | ✓ |
| `interpretations` | interpretation collector | ✓ |
| `assumptions` | assumption register | ✓ |
| `claims` | claim registry (multiple authors, one registry) | ✓ |
| `evidence.artifacts` | artifact registry | ✓ |
| `evidence.verificationRuns` | verification harness | ✓ |
| `evidence.build` | build system | ✓ |
| `evidence.dependencies` | dependency resolver | ✓ |
| `evidence.resolvedDependencyGraph` | dependency resolver | ✓ |
| `evidence.architecture` | architecture registry | ✓ |
| `memory` | memory store | ✓ |
| `risk` | runtime risk scorer (engine) | ✓ |
| `approvals.required` | runtime gate table (static per phase+flags) | ✓ |
| `approvals.granted` | approval manager | ✓ |
| `approvals.missing` | **derived** by builder | ✓ (by design, not a producer) |
| `meta.*` | runtime / builder | ✓ |

**Verdict: PASS.** One producer per field; derived fields are explicit (`missing`). `required` vs `granted` are correctly separate fields — they have different producers.

### Q3: Can any field be derived instead of stored?

| Field | Derivable? | Decision |
|---|---|---|
| `approvals.missing` | yes | already derived ✓ |
| `risk` | yes — pure function of context | stored per GRA §3; scorer is the only writer; derivation property makes it deterministic and testable |
| `resolvedDependencyGraph` | superficially (`dependencies.map(name)`) | **keep both.** Deriving the graph from records would make ADV-15 (resolved dependency with no record) undetectable — the threat model requires the graph to be an independent input |
| `request.normalizedIntent` | from rawText via classifier | keep — it IS the classifier's output (a producer result, not a re-derivation) |
| `meta.builtAt`, `revision` | runtime state | keep — process metadata |

**Verdict: PASS.** The one tempting derivation (`graph`) is deliberately rejected for threat-model reasons.

### Q4: Is any field duplicated?

- `request.requirementIds` vs `task.requirementIds` — **not duplication**: request-level citations (S-001) vs task-level citations (S-010); different granularity, different phases.
- `resolvedDependencyGraph` vs `dependencies[].name` — deliberate (Q3).
- `approvals.granted` vs `audit` — state vs log; the granted list is the rule-readable view, audit is the append-only record. Standard state/log split; both serve different consumers.
- `risk.factors[].evidence` — references to other ids (claims, runs), not copies.
- `audit` in context vs audit store — bounded read-model snapshot (CQRS-style), documented in GRA §3 ("never the whole store").

**Verdict: PASS.** No unintentional duplication.

### Q5: Is any field leaking implementation details?

- `producerManifest` (producer names, versions) — provenance metadata, transparency by design (§3 "evidence without provenance is not evidence"). Not leakage.
- `AuditEntry.hash/prevHash` — integrity data required by GRA §6. Not leakage.
- `risk.factors[].points` — audited, evidence-cited scoring input. Transparency, not leakage.
- No file paths, class names, model internals, or environment secrets appear in the schema.

**Verdict: PASS.**

### Q6: Is the schema model-agnostic?

- No LLM-specific concepts anywhere in `src/runtime/types.ts`: no tokens, temperatures, model names, providers. `AuditActor`'s `'model'` is generic (any model).
- Record types are plain domain shapes (id, text, status, decision, evidence).
- Model-specific plumbing is deferred to the Adapter Interface (component 9), which is exactly the right boundary.
- The existing `constitution/types.ts` shapes are reused untouched.

**Verdict: PASS — model-agnostic.**

---

## STEP 2 — Dependency Audit

Future components and the context fields they require:

| Component | Required fields | Optional fields | Can coupling be reduced? |
|---|---|---|---|
| 2. Runtime Engine | `meta.phase/gate`, `request`, `claims`, `requirements`, `interpretations`, `assumptions`, `evidence.*`, `approvals.granted`, `approvals.missing`, `environment.role` | `goal`, `audit` | yes — see R-3 (RuleReadView) |
| 3. Policy Dispatcher | `meta.phase/gate`, `request` (flags), `approvals.missing`, rule outcomes | — | minimal already |
| 4. Rule Scheduler | `meta.phase/gate`, `risk`, `evidence` (completeness), required-state results | — | minimal already |
| 5. Action Executor | `request`, `goal`, `task`, `evidence.verificationRuns/build`, `memory`, `approvals`, `audit` | — | needs everything it lists (all are action payloads) |
| 6. Audit Logger | `meta.*`, `producerManifest`, affected-object refs from all sections | — | consumes, never gates |
| 7. Memory Interface | `memory`, `meta.requestId` | — | minimal |
| 8. Approval Manager | `approvals.required/granted/missing`, `request`, `goal`, `audit` | — | minimal |
| 9. Adapter Interface | full context (translation boundary) | — | inherent (it is the bridge) |
| 10. Runtime Integration | everything (wiring) | — | inherent |

**Rule-facing surface** (what the 13 rules actually read): `request`, `requirements`, `interpretations`, `assumptions`, `claims`, `evidence.*`, `approvals.granted`, `environment.role`. That is a strict subset of the context.

**R-3 (recommended coupling reduction):** define a `RuleReadView` — a narrowed, frozen projection of GovernanceContext containing exactly the rule-facing surface. Rules and the constitution engine receive the view; process fields (`goal`, `task`, `memory`, `risk`, `audit`, `meta.producerManifest`) remain invisible to rules at the type level. Effect: rules cannot even *express* access to process state; coupling drops from 14 sections to 8; future process fields won't touch the rule contract.

---

## STEP 3 — Mutation Audit

Every component that *appears* to need mutation — checked against the design:

| Component | Apparent mutation | Resolution |
|---|---|---|
| Engine (audit entries after gate) | append to `audit` | fresh build per gate carries the new slice; store write belongs to Audit Logger |
| Approval Manager (grant) | append to `approvals.granted` | GRA §5: "on grant → write approval record and re-run dependent gates" — re-run = fresh assembly |
| Action Executor (RETRY evidence) | replace `evidence.verificationRuns` | re-run produces new evidence → fresh context for the re-run gate |
| Memory Interface (ARCHIVE) | alter `memory.entries` | snapshot refresh → fresh context |
| Scheduler / Dispatcher | — | read-only by construction |

**Invariant (recorded for the runtime):** *a context is valid only for the gate it was built for; any state change requires a fresh build via the builder. The runtime never mutates a context in place.* No redesign needed — the "fresh context per gate" rule in GRA §3 already provides it.

**Verdict: PASS — no component requires mutation.**

---

## STEP 4 — Simulate Real Work

### Scenario 1 — Simple coding request ("Add a logout button")

| Phase | Context trace | Finding |
|---|---|---|
| request-received | request (rawText, intent=implementation), goal set; empty else | none |
| intent-analysis | type=implementation, requirementIds=[R-1], interpretations=[single], requirements=[R-1 approved] | S-005 pass, non-vacuous ✓ |
| clarification | no ambiguity → trivially passes | none |
| planning | E-001: approvals.required=[experience-architecture]; missing → REQUIRE_APPROVAL; after grant → re-run passes | expected — the constitution's intent, not a defect |
| task-compilation | S-001 ✓; S-010 (hunks) ✓; S-012: **no dependencies introduced** → graph empty → required state absent → vacuous-pass policy would emit RETRIEVE_EVIDENCE for a harmless dependency-free task | **R-1 (defect in policy application, not architecture):** vacuous-pass needs a *work-claimed discriminator* — if the task claims no dependency work, S-012's vacuous pass is true compliance, not missing evidence. Discriminator is derivable from `request` + `claims` + `task` (no new context fields needed). Implementation guidance for Component 2. |
| execution | artifacts traced (S-007 ✓), changes traced (S-010 ✓) | none |
| verification | runs for claims (S-002 ✓, S-009 ✓) | none |
| completion | full battery passes | none |

### Scenario 2 — Ambiguous request ("Make the login work better")

- intent-analysis: two materially different interpretations recorded → S-005 fail → ASK_FOR_CLARIFICATION.
- clarification: answers → assumptions registered (approved) → re-run passes.
- **Trace clean.** Context carries exactly the two pieces the flow needs (`interpretations`, `assumptions`). Nothing missing.

### Scenario 3 — Multi-agent collaboration (designer, implementer, verifier)

- Producers are agents; `producerManifest` records which agent wrote which field. ✓
- Claim authorship: `ClaimRecord.owner` is optional in the schema (required only for unverifiable claims by S-004). For multi-agent auditability, every claim should be attributed. **R-2:** enforce claim ownership at the Adapter boundary (component 9) — schema stays optional (model-agnostic), the boundary enforces.
- Disagreement: see scenario 6.

### Scenario 4 — Failed verification

- runs with `pass: false` → S-002 fail → BLOCK (failed run) or RETRY (non-reproducible). RETRY re-runs, fresh evidence, fresh context, gate re-runs. ✓
- **R-2 (minor):** `VerificationRunRecord` has no failure-detail field — BLOCK reports and audit "reason" come only from rule messages. Failure output belongs on the audit entry via evidence refs, mapped by the Adapter. Not a context change.

### Scenario 5 — Human approval required (production deployment)

- S-006 flags production deployment → approvals.required=[deployment], missing → REQUIRE_APPROVAL.
- Approval Manager task: target, scope (request.rawText), evidence (audit slice), requester. Grant → `granted` grows → dependent gates re-run with fresh build → `missing` recomputed empty. ✓
- **Trace clean.** Nothing missing or unnecessary.

### Scenario 6 — Model disagreement

- Two models diverge on intent → two interpretations → scenario 2 path (ASK).
- Two models diverge on verification → conflicting runs/claims → S-002 fail → RETRIEVE/BLOCK.
- Two models diverge on risk → risk scorer records both factors with evidence (ADV-05) → scheduler forces full battery; engine can ASK. ✓
- **Trace clean.**

### STEP 4 findings summary

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| R-1 | guidance (component 2) | Vacuous-pass policy needs a work-claimed discriminator; otherwise dependency-free/change-free tasks get spurious RETRIEVE_EVIDENCE | **RESOLVED by amendment (2026-08-02, human-approved):** `NO_ACTION_REQUIRED` decision (rank 0) added to GRA §4; work-claimed discriminator separates "nothing to verify" (→ `NO_ACTION_REQUIRED`) from "evidence expected but missing" (→ `RETRIEVE_EVIDENCE`). Implemented in Component 2. |
| R-2 | guidance (component 9) | Claim ownership + verification failure detail enforced at the Adapter boundary | Boundary enforcement — **no schema change** |
| R-3 | optional (components 2/9) | `RuleReadView` projection narrows rule-visible surface | Reduces coupling — **no architecture change** |

No missing information and no unnecessary information found in the schema itself.

---

## STEP 5 — Review

Governance Context survives every scenario **without architectural change**:

1. Schema: every field necessary, single-producer, derivable fields either derived or deliberately stored (ADV-15), no duplication, no implementation leakage, model-agnostic.
2. Coupling: rule-facing surface is a strict subset; R-3 reduces it further (optional).
3. Mutation: zero components require in-place mutation; "fresh context per gate" invariant holds.
4. Simulation: all six scenarios trace cleanly; three refinements recorded as implementation guidance.

## Marked: ARCHITECTURE STABLE

Component 2 (Runtime Engine) may begin on sign-off, with R-1 incorporated into the vacuous-pass policy implementation.
