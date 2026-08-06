# Core Domain Model — Ontology

**Status:** APPROVED 2026-08-02 (human sign-off, in session). Component 3 was blocked until this ontology was approved; it now proceeds.
**Rule:** Derived strictly from RUNTIME-ARCHITECTURE.md (GRA) + the constitution specs. No new governance concepts may be added. Contradictions discovered during derivation are listed in §9 with resolutions.

Every governance decision, policy, memory entry, and audit record must reference the canonical object definitions below.

---

## 1. Canonical Entities

Entity = has canonical identity (stable id, producer-assigned) and may be referenced. Value object = embedded, no independent identity.

| Entity | Identity | Canonical fields | Single producer | State machine |
|---|---|---|---|---|
| Request | `requestId` | type, rawText, normalizedIntent, requirementIds[], proposesRequirementChange?, proposesArchitecturalDecision? | envelope validator / classifier | Revision lifecycle (§6) |
| Goal | `goal.id` | text, status | goal tracker | §6 |
| Task | `task.id` | requirementIds[], hunks[], introducedDependencies[] | task compiler | — |
| Requirement | `requirement.id` | text, status, approval | requirements registry | §6 |
| Interpretation | `interpretation.requirementId` (child of requirement) | interpretation, materialDifference | interpretation collector | — |
| Assumption | `assumption.requirementId` (child of requirement) | text, recorded, approved, decision | assumption register | — |
| Claim | `claim.id` | text, targetArtifactId, unverifiable?, owner?, rationale? | claim registry | — |
| Artifact | `artifact.id` | kind, trace?, sourceVersion?, conformanceViolations[] | artifact registry | — |
| VerificationRun | `verificationRun.id` | targetArtifactId, pass, reproducible, externalStateDependency, sourceVersion?, environmentFingerprint? | verification harness | — |
| Build | `build` (single per gate; no id) | inputFingerprint, outputHashes[], nonDeterminismSources[] | build system | — |
| Dependency | `dependency.name` | version, requirementId, justification, approval | dependency resolver | — |
| DependencyGraph | `resolvedDependencyGraph` (ordered names) | — | dependency resolver | — |
| Architecture | `architecture` (single per gate; no id) | approved, constraints[], violations[] | architecture registry | — |
| Hunk | value object (in Task) | artifactId, requiredByRequirement | change capture | — |
| MemoryEntry | `memory.id` | content, provenance, confidence, source, writtenAt, archived | memory store | §6 |
| GovernedDecision | `decisionId` | decision, reason, validationReportId, governanceChecks, timestamp, target?, authorizedBy?, issuerId? | approval manager / runtime | §6 |
| Rule | `ruleId` (`E-001`, `S-001`…`S-012`) | name, description, severity, evaluate | constitution (static set) | — |
| Policy | `policyId` = ruleId | failAction (pure; may read context) | Policy Engine (§8) | — |
| Gate | `gate.id` | phase, gateKind, ruleIds[] | gate table (Rule Scheduler) | — |
| RiskScore | value object | score, factors[] | risk scorer | — |
| AuditEntry | `audit.id` (`requestId:gate:seq`) | requestId, revision, phase, gate, timestamp, ruleId, ruleName, outcome, decision, vacuous, evidence[], reason, affectedObjects[], actor, prevHash, hash | Runtime Engine (sealed); store: Audit Logger | append-only |
| EvidenceRef | value object | kind, id, version?, reference? | derived from producer manifest | — |
| AffectedObjectRef | value object | kind, id | derived from rule inputs | — |
| Context | `requestId` (envelope) | meta + all sections | GovernanceContextBuilder | — |

## 2. Identity & Id Spaces

| Id space | Assigned by | Shape |
|---|---|---|
| `requestId` | envelope validator / classifier | unique per governed unit; audit entries and approvals bind to it |
| requirement id | requirements registry | project-scoped (e.g. `R-1`) |
| artifact id | artifact registry | project-scoped |
| verificationRun id | verification harness | project-scoped |
| `decisionId` | approval manager / runtime | unique; approval records carry it |
| memory entry id | memory store | unique |
| `ruleId` | constitution | fixed set: `E-001`, `S-001`…`S-012` |
| audit entry id | engine | `requestId:gate.id:seq` |
| approval target | gate table / rules | canonical scope strings: `experience-architecture`, `deployment`, `requirement-amendment`, `architecture-change` |

**Reference integrity:** a reference must always resolve to an existing entity of the declared kind at the time the referencing record is sealed. Unresolvable references are integrity errors (ADV-11 audit tampering; ADV-09 approval replay).

## 3. Reference Rules

| From | To | Field | Cardinality |
|---|---|---|---|
| Claim | Artifact | `targetArtifactId` | 1, required |
| VerificationRun | Artifact | `targetArtifactId` | 1, required |
| Artifact | Requirement | `trace` | 0..1 |
| Requirement | GovernedDecision | `approval` | 0..1 (required for `status: approved`) |
| Assumption | Requirement | `requirementId` | 1 |
| Assumption | GovernedDecision | `decision` | 0..1 |
| Interpretation | Requirement | `requirementId` | 1 |
| Dependency | Requirement | `requirementId` | 1 (when resolved) |
| Dependency | GovernedDecision | `approval` | 1 (when resolved) |
| Hunk | Artifact | `artifactId` | 1 |
| Task | Requirement(s) | `requirementIds` | 1..n |
| Task | Dependency names | `introducedDependencies` | 0..n |
| GovernedDecision | validation report | `validationReportId` | 1 |
| GovernedDecision | approval target | `target` | canonical scope string |
| Policy | Rule | `policyId` = `ruleId` | 1 |
| Gate | Rule(s) | `ruleIds` | 1..n, no duplicates |
| AuditEntry | Rule | `ruleId` | 1 (or `SYNTHESIS`) |
| AuditEntry | Request | `requestId` + `revision` | 1 |
| AuditEntry | Evidence | `evidence[]` (kind: verification-run, approval, memory, context-field, producer-manifest) | 0..n |
| AuditEntry | Affected objects | `affectedObjects[]` (kind: artifact, requirement, change, dependency, memory, request, approval) | 0..n |
| RiskFactor | evidence | `evidence` (ids of claims/runs/approvals) | 1 |
| MemoryEntry | provenance | `provenance`, `source` (session origin) | 1 each |

**Cross-cutting obligations:**
- Every **governance decision** references: the rules that produced it (contributions), the request (requestId+revision), its evidence, its affected objects → recorded as AuditEntry.
- Every **policy** references exactly one Rule by `ruleId`; policy is pure (reads only Context).
- Every **memory entry** references its provenance and carries confidence; it never references volatile ids (it must remain meaningful after the request ends).
- Every **audit record** references rules, request, evidence, objects by canonical id; content is immutable and hash-chained.

## 4. Canonical Enumerations

Existing unions — the ontology does not extend them:

- PhaseName (11): request-received, intent-analysis, clarification, planning, task-compilation, execution, verification, build, memory-update, human-approval, completion
- GateKind: pre | post | final
- RuleDecision (8): BLOCK(7) > REQUIRE_APPROVAL(6) > ASK_FOR_CLARIFICATION(5) > RETRIEVE_EVIDENCE(4) > RETRY(3) > ARCHIVE(2) > ALLOW(1) > NO_ACTION_REQUIRED(0)
- DecisionValue (kernel vocabulary): EXECUTE | STOP | RETRIEVE_EVIDENCE | ASK_HUMAN
- RequestType: requirement-analysis, technical-design, implementation, verification, build, deployment, change, dependency-introduction
- ArtifactKind: source, test, configuration, documentation, deployment, other
- RequirementStatus: draft, approved, rejected, amended
- GoalStatus: active, paused, complete, abandoned
- EnvironmentRole: production, staging, development
- AuditActor: runtime, human, model, system
- AuditEvidenceKind: verification-run, approval, memory, context-field, producer-manifest
- AuditObjectKind: artifact, requirement, change, dependency, memory, request, approval
- RuleOutcome: pass | fail | na

## 5. State Machines

- **Requirement:** `draft → approved → (amended → approved) | rejected`. Amendment requires a governed decision with human consent (S-003/S-006).
- **Goal:** `active → paused | complete | abandoned`.
- **MemoryEntry:** `active → archived` (ARCHIVE action; snapshot refresh, never deletion).
- **Request revision:** `submitted → (gated) → allowed | blocked | pending-approval | needs-clarification | retry`. BLOCK is terminal for the revision; resubmission increments `revision`.
- **GovernedDecision (approval):** `created → granted | denied | expired`. Deny and timeout → deny (fail-safe; never auto-approve). Grant requires `authorizedBy` or `issuerId` (human) and `governanceChecks: PASS`.
- **Gate:** runs once per (phase, gateKind); produces a sealed decision; never re-runs on the same context.

## 6. Single-Writer Map

From GRA Step 1 + §3 assembly contract: every entity has exactly one producer; derived values (approvals.missing, risk, audit hashes) are computed, not produced. Duplicated production of the same entity id is an integrity error (twin-id).

## 7. Context → Ontology Projection

`GovernanceContext` is the assembly of the above entities at one gate: `request`, `goal`, `task`, `requirements[]`, `interpretations[]`, `assumptions[]`, `claims[]`, `evidence.*`, `memory.entries[]`, `risk`, `approvals.*`, `audit[]`, `environment`. Rules read exactly this projection (frozen). The `RuleReadView` (Component-1 review R-3) is a further narrowing of this projection — it does not alter the ontology.

## 8. Policy Model (Component 3 contract — approved)

**Policy** = canonical mapping `ruleId → failAction`, where `failAction: (ctx) → RuleDecision` is pure (reads only Context). Declared per rule from GRA Step 1 "Outputs" column, refined by the amended vacuous-pass policy (the engine's required-state machinery handles the RETRIEVE case; the policy declares what an *evaluated failure* means):

| Policy (ruleId) | failAction (evaluated failure) | Required-state handles (RETRIEVE) |
|---|---|---|
| E-001 | REQUIRE_APPROVAL | — (approval absence is a policy gate, not evidence) |
| S-001 | BLOCK | unresolvable requirement ids |
| S-002 | BLOCK (run failed) | claims without any run |
| S-003 | ctx: amendment w/o human consent → REQUIRE_APPROVAL; else BLOCK (violations) | — |
| S-004 | ASK_FOR_CLARIFICATION (unverifiable w/o owner+rationale) | verifiable claims without runs |
| S-005 | ctx: empty text or missing trace target → BLOCK; else ASK_FOR_CLARIFICATION (ambiguity) | — |
| S-006 | REQUIRE_APPROVAL | — (missing approval is a policy gate) |
| S-007 | BLOCK | — |
| S-008 | ctx: unpinned dependency → BLOCK; else RETRY (non-determinism/divergent hashes) | absent build record (work claimed at build gate) |
| S-009 | RETRY (re-run reproducibly) | runs missing fingerprints |
| S-010 | BLOCK | task hunks absent while task claimed |
| S-011 | ctx: not approved → REQUIRE_APPROVAL; else BLOCK (unresolved violation/unscoped constraint) | absent architecture record |
| S-012 | BLOCK | graph/records absent while deps introduced |

**Policy Engine** (business logic): owns this table, implements `PolicyPort` for the RuntimeEngine, exposes each policy's semantics for documentation/audit. Deterministic; no model knowledge.

**Policy Dispatcher** (thin routing, zero business logic): given `(ruleId, ctx)`, routes to the Policy Engine's declared failAction and returns the decision. It contains no rule-id conditionals, no lattice logic, no context branching of its own — any policy change happens only in the Policy Engine.

## 9. Contradictions Discovered & Resolutions

| # | Contradiction | Resolution (no new concepts) |
|---|---|---|
| C-1 | S-003 required-state demanded decisions when an amendment is proposed → the engine emitted RETRIEVE_EVIDENCE for amendment-without-consent, contradicting Step 1's REQUIRE_APPROVAL | Required-state = work present (artifacts or amendment). Consent absence is a policy failure → the rule evaluates → REQUIRE_APPROVAL |
| C-2 | S-006 required-state demanded decisions when flags were set → RETRIEVE instead of Step 1's REQUIRE_APPROVAL | Flagged ⇒ rule always evaluates ⇒ fail ⇒ REQUIRE_APPROVAL (approval is a policy gate, not retrievable evidence) |
| C-3 | E-001 required-state demanded a valid approval → RETRIEVE instead of REQUIRE_APPROVAL | Engineering work claimed ⇒ rule evaluates ⇒ fail ⇒ REQUIRE_APPROVAL |
| C-4 | S-004 required-state conflated two cases: verifiable claim without run (RETRIEVE ✓) vs unverifiable claim without owner/rationale (Step 1: ASK_FOR_CLARIFICATION) | Required-state covers only verifiable claims; unverifiable claims always evaluate → failAction ASK_FOR_CLARIFICATION |
| C-5 | Step 1 "S-008 absent build → BLOCK" vs amended vacuous-pass policy "never BLOCK on missing evidence" | Amended policy (2026-08-02, human-approved) supersedes: absent build at build gate → RETRIEVE. Recorded for clarity, not a defect |

## 10. Review Checklist

1. Every entity produced by exactly one producer? (single-writer map)
2. Every reference resolvable to a canonical id? (reference rules)
3. No enumeration extended? (canonical enumerations)
4. Policy table faithful to GRA Step 1 + amendments?
5. Contradiction resolutions accepted?

**Approval status:** APPROVED 2026-08-02 (human sign-off; review checklist §10 passed — single-writer map holds, references resolvable, no enumeration extended, policy table faithful to GRA Step 1 + amendments, contradiction resolutions C-1..C-5 accepted). Implemented as Component 3: `src/runtime/policy-engine.ts` (Policy Engine, §8 table) + `src/runtime/policy-dispatcher.ts` (thin routing) + required-state adjustments per C-1..C-4 in `src/runtime/required-state.ts`.
