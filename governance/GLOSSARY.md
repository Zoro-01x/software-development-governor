# Governance Glossary — Shared Deterministic Definitions

Every constitutional rule spec uses these definitions verbatim. A definition is
deterministic iff it can be evaluated to `true` or `false` by checking stated
conditions only — no judgment, no thresholds left unspecified.

---

## 1. Governed Decision

A record with ALL of the following fields present and non-empty:

- `decisionId` — unique identifier
- `decision` ∈ { `EXECUTE`, `STOP`, `RETRIEVE_EVIDENCE`, `ASK_HUMAN` }
- `reason` — non-empty string
- `validationReportId` — non-empty string (ties the decision to a validation report)
- `governanceChecks` = `PASS`
- `timestamp` — ISO instant

**Valid** iff every field above satisfies its stated condition.

## 2. Human Approval

A Governed Decision (section 1) that additionally satisfies:

- `authorizedBy` is a human identity (non-empty, not a system/agent id), OR
- `eacId` exists and its `issuerId` is a human identity.

**Valid** iff (section 1 valid) AND (human identity condition true).

## 3. Approved Requirement

A requirement record with:

- `id` — non-empty unique identifier
- `text` — non-empty string
- `status` = `approved`
- `approval` — a valid Governed Decision with `decision` = `EXECUTE`

**Valid** iff all four conditions hold.

## 4. Requirement Change

Any operation that alters the text, status, or scope of a requirement whose
current `status` is `approved` (amend, replace, reject, deprecate, split, merge).

**Initial approval** of a draft requirement is NOT a requirement change.

## 5. Approved Experience Architecture

A Governed Decision with:

- `decision` = `EXECUTE`
- `target` = `experience-architecture`
- `validationReportId` — non-empty (issued by the Experience Governor)

**Approval exists** iff such a record exists in the decision log.

## 6. Evidence

A record that is ALL of:

- deterministic (same inputs → same record)
- reproducible (see section 10)
- not dependent on external state not under system control (see section 11)

A code file, by itself, is never evidence (see spec S-002).

## 7. Passing Automated Verification

A verification run record with ALL of:

- `pass` = `true`
- `reproducible` = `true`
- `externalStateDependency` = `false`
- `sourceVersion` equals the source version of the artifact it validates

**Valid** iff all four conditions hold.

## 8. Claim

A declarative statement about implementation behavior, e.g.
"the module handles empty input". A claim has: `id`, `text`, `targetArtifactId`.

## 9. Artifact

A file or deployment unit with a unique `id`, of kind ∈
{ source, test, configuration, documentation, deployment }.

## 10. Trace

A mapping from artifact `id` to requirement `id`, recorded in the artifact's
metadata. **Valid** iff the mapped requirement is an Approved Requirement
(section 3) at the time of evaluation.

## 11. Assumption

A recorded statement that substitutes for missing or ambiguous requirement
information. **Valid** iff ALL of:

- `text` — non-empty, recorded verbatim
- `approved` — via a valid Governed Decision with `decision` = `EXECUTE`
- `traceable` — the approving decision `decisionId` is linked to the record

A valid assumption entered against an approved requirement IS a Requirement
Change (section 4) and therefore requires Human Approval (section 2).

## 12. Accepted Risk

A documented claim (section 8) with:

- `unverifiable` = `true` (no automated check can be constructed)
- `owner` — non-empty
- `rationale` — non-empty

An accepted risk is the ONLY permitted way to hold an unverifiable claim.

## 13. Dependency

A library, service, tool, or data source referenced by the implementation.

**Declared** iff a record exists with: `name`, `version`, `requirementId`,
`justification` (non-empty, references the requirement), and an approving
Governed Decision (`decision` = `EXECUTE`).

**Transitive dependency** = any dependency of a declared dependency.
An undeclared transitive dependency is a defect.

## 14. Architectural Drift

An implementation element that violates a declared constraint of the approved
architecture for its scope (dependency direction, interface contract, or
structural constraint). Drift is a violation regardless of test results.

## 15. Deterministic Build

A build where the same inputs (source, requirements, configuration) produce
byte-identical outputs on every run. A build is **idempotent** iff building
twice from the same input yields the same output. Non-determinism sources
include: unreproducible dependencies, timestamp injection, network-dependent
behavior, unordered iteration with side effects.

## 16. Reproducible Verification

A verification whose outcome (pass/fail) is identical when repeated in an
isolated environment from the same source, requirements, and configuration.

**External state** = state not under the system's control (live network
services, shared databases, wall-clock-dependent logic).
