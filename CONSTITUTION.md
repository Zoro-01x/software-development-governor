# Software Development Governor — Constitution

> Immutable engineering principles governing the development of software.
>
> SDG is a domain-specific constitution executed within the AI Governor kernel.
> AI Governor provides lifecycle, evidence, validation, decision, execution, and
> traceability. SDG supplies only the domain semantics that define sound
> software engineering.
>
> **Status:** Adopted — Sprint 0
> **Governance:** Amendment requires the same change-control process as
> AI Governor's own constitution.

---

### S-001 — Requirements Before Implementation

No code shall be produced without an approved requirement it satisfies.

An implementation task that cannot be traced to at least one approved
requirement shall not be executed. Requirement approval is a governed decision
recorded in the AI Governor decision log.

---

### S-002 — Code Is Evidence

Generated or written code is not proof of correctness.

Only passing automated verification constitutes evidence that an implementation
satisfies its requirements. Code alone is an input to verification, never a
substitute for it.

---

### S-003 — Specification Authority

Specifications outrank implementation.

When a specification and its implementation disagree, the implementation is
defective by definition. No implementation shall be accepted that contradicts
its governing specification. Implementation never changes requirements; only
an approved requirement amendment may do so.

---

### S-004 — Test-Bound Development

Every implementation claim must be demonstrated by automated verification.

A claim such as "the module handles empty input" is not accepted until a
verifiable test exists and passes. The set of claims that cannot be
automatically verified shall be explicitly documented as accepted risks.

---

### S-005 — No Silent Assumptions

Unknown requirements produce questions, never guesses.

When a requirement is ambiguous or missing, the system shall generate a
structured request for evidence. It shall not infer, extrapolate, or fabricate
the missing information. A governed decision to proceed with an explicit
assumption is permitted only when the assumption is recorded, approved, and
traceable.

---

### S-006 — Human Approval

Architectural decisions, requirement changes, and deployment approvals require
explicit human consent.

Routine implementation within an approved scope may proceed without human
intervention. Any decision that alters the architecture, changes an approved
requirement, or releases software to production requires a governed human
approval decision.

---

### S-007 — Traceable Engineering

Every engineering artifact shall trace to an approved requirement.

Source files, tests, configuration, documentation, and deployment artifacts
shall each record the requirement identifier they satisfy. Traceability is not
optional documentation; it is a first-class governed relationship.

---

### S-008 — Deterministic Builds

The same source and requirements shall produce the same output.

Build processes shall be repeatable and idempotent. A build that introduces
non-determinism (e.g., unreproducible dependencies, timestamp injection,
network-dependent behavior) is a defect.

---

### S-009 — Reproducible Verification

A passing verification must be independently reproducible.

Test results shall be repeatable in an isolated environment from the same
source, requirements, and configuration. Verification that depends on external
state not under the system's control is not considered valid evidence.

---

### S-010 — Incremental Change

All changes shall be minimal with respect to the requirement they satisfy.

A change shall implement exactly the requirement and no more. Unrelated
modifications, speculative refactoring, and undiscovered feature work are
prohibited within a governed change scope.

---

### S-011 — Architectural Integrity

Implementation must conform to its governing architecture.

No component shall violate the dependency direction, interface contract, or
structural constraint defined by the approved architecture for that scope.
Architectural drift is a governed violation even if all tests pass.

---

### S-012 — Dependency Discipline

Every dependency must be declared, approved, and justified.

A dependency (library, service, tool, data source) introduced without an
approved requirement and recorded justification is a violation. Transitive
dependencies are subject to the same standard; undeclared transitive
dependencies are defects.

---

## Amendment Record

| Date | Amendment | Rationale |
|---|---|---|
| — | Initial adoption — Sprint 0 | — |

*This constitution is executed by the AI Governor kernel. No SDG component
shall violate a constitutional principle regardless of operational pressure.*
