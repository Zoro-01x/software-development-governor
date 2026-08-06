# Governance Extraction — Executable Constitution

Every principle in `CONSTITUTION.md` is converted into executable governance
using the GOVERNANCE EXTRACTION LOOP:

1. Read one rule (ignore all others)
2. State the problem it solves
3. Extract concepts
4. Define every concept deterministically
5. Identify required state
6. Identify triggers
7. Design the algorithm
8. Design tests (normal / edge / failure / regression / adversarial)
9. Resolve conflicts with other rules before implementing
10. Implement

**Never write code until every rule has become a specification.**
**Never implement two rules simultaneously.**

## Status

| Phase | State |
|-------|-------|
| 1 — Specification (steps 1–9 for all 13 rules) | COMPLETE |
| 2 — Implementation (step 10, one rule at a time) | COMPLETE — `src/constitution/`, engine + 13 rules + 14 test files, 266 tests green |
| 3 — Runtime Design (GRA, all 8 steps) | APPROVED — [RUNTIME-ARCHITECTURE.md](RUNTIME-ARCHITECTURE.md) |
| 4 — Runtime Implementation (LOOP 4, 10 components) | IN PROGRESS — components 1–3/10 done (Governance Context ARCHITECTURE STABLE; Runtime Engine complete; Policy Engine + thin Policy Dispatcher complete, ontology APPROVED), see [runtime/COMPONENTS.md](runtime/COMPONENTS.md) |

## Rule Index

| Rule | Title | Spec |
|------|-------|------|
| E-001 | Experience Prerequisite | [E-001.md](E-001.md) |
| S-001 | Requirements Before Implementation | [S-001.md](S-001.md) |
| S-002 | Code Is Evidence | [S-002.md](S-002.md) |
| S-003 | Specification Authority | [S-003.md](S-003.md) |
| S-004 | Test-Bound Development | [S-004.md](S-004.md) |
| S-005 | No Silent Assumptions | [S-005.md](S-005.md) |
| S-006 | Human Approval | [S-006.md](S-006.md) |
| S-007 | Traceable Engineering | [S-007.md](S-007.md) |
| S-008 | Deterministic Builds | [S-008.md](S-008.md) |
| S-009 | Reproducible Verification | [S-009.md](S-009.md) |
| S-010 | Incremental Change | [S-010.md](S-010.md) |
| S-011 | Architectural Integrity | [S-011.md](S-011.md) |
| S-012 | Dependency Discipline | [S-012.md](S-012.md) |

Shared deterministic definitions: [GLOSSARY.md](GLOSSARY.md).

## Execution Target

Rules execute as `RuleDefinition` records in the AI Governor kernel's
`RuleEngine` (runtime/validation/rule-engine.ts): `{ id, name, description,
severity, evaluate(input) }`. The Engineering Governor supplies ONLY the domain
semantics below; the kernel provides lifecycle, evidence, validation, decision,
execution, and traceability.

## Shared Input Envelope (ConstitutionContext)

The evaluable state every rule reads from. Each spec lists the exact fields it
uses; undefined fields are treated as absent.

```ts
interface ConstitutionContext {
  request: { id: string; type: RequestType; target?: string };
  // RequestType ∈ {
  //   'requirement-analysis', 'technical-design', 'implementation',
  //   'verification', 'build', 'deployment', 'change', 'dependency-introduction'
  // }
  experienceApproval?: GovernedDecisionRecord;   // E-001
  requirements: RequirementRecord[];             // { id, text, status, approval?, amendedBy? }
  requirementInterpretations: Interpretation[];  // { requirementId, interpretation, materialDifference }
  assumptions: AssumptionRecord[];               // { text, recorded, approved, decisionId? }
  decisions: GovernedDecisionRecord[];           // decision log
  artifacts: ArtifactRecord[];                   // { id, kind, trace?, contentHash?, sourceVersion? }
  changes: ChangeRecord[];                       // { artifactId, requirementIds[], diffHunks[] }
  claims: ClaimRecord[];                         // { id, text, targetArtifactId, unverifiable?, owner?, rationale? }
  verificationRuns: VerificationRunRecord[];     // { id, targetArtifactId, pass, reproducible, externalStateDependency, sourceVersion }
  build?: { inputFingerprint: string; outputHashes: string[]; nonDeterminismSources: string[]; declared: boolean };
  dependencies: DependencyRecord[];              // { name, version, requirementId, justification, approved, transitive? }
  resolvedDependencyGraph: string[];             // fully resolved names including transitive
  architecture?: { approved: boolean; constraints: ConstraintRecord[]; violations: DriftRecord[] };
  environment?: { role: 'production' | 'staging' | 'development' };
}
```

## Conflict Register

Resolutions made during step 9 (each resolution is recorded in the affected
specs):

| Rules | Conflict | Resolution |
|-------|----------|------------|
| S-001 ↔ S-005 | S-005 permits proceeding with an approved assumption; S-001 requires an approved requirement | A valid assumption entered against an approved requirement IS a requirement amendment; against a draft requirement it is a new requirement record. Either way it satisfies S-001 only if it becomes an Approved Requirement (GLOSSARY §3). |
| S-005 ↔ S-006 | S-005 allows a "governed decision" to approve an assumption | When the assumption changes an approved requirement, S-006 requires HUMAN consent (GLOSSARY §4, §11). Non-amending assumptions on draft requirements may be approved by any governed decision. |
| S-006 ↔ S-001 | S-006 requires human consent for requirement changes; S-001's initial requirement approval is a governed decision | Initial approval is NOT a requirement change (GLOSSARY §4); only post-approval alterations require humans. |
| S-002 ↔ S-004 | Both govern evidence; S-002 says code alone is not proof, S-004 says every claim needs automated verification | Identical standard; S-002 is the negative form, S-004 the positive form. Implemented as two views over the same check. |
| S-003 ↔ S-011 | Both assert a spec outranks implementation | S-003 governs requirement-level contradiction; S-011 governs architecture-level drift. Disjoint inputs, same verdict semantics. |
| S-008 ↔ S-009 | Determinism of build vs reproducibility of verification | S-008 is about artifacts produced; S-009 about outcomes measured. Both require isolation from uncontrolled external state. No contradiction. |

## Phase 2 Plan (step 10)

One rule at a time, in index order, each implemented as a `RuleDefinition` plus
its spec-derived tests:

1. `src/constitution/constitution-context.ts` — shared input types (envelope above)
2. One rule module per spec: `E-001.ts` … `S-012.ts`
3. `src/constitution/constitution-engine.ts` — registry: builds all 13 `RuleDefinition`s
4. `tests/constitution/*.test.ts` — the test matrix from each spec
