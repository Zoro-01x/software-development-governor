# INVARIANTS — Proof Engine v1.0

**Date:** 2026-08-07
**Status:** 15 invariants declared — one per gap

---

## Invariant Format

```
INV-{ID}: {statement}
  Evidence: {what proves it}
  Verifier: {who/what checks it}
  Failure: {what happens if violated}
  Recovery: {how to fix}
```

---

## Pipeline-Level Invariants

### INV-001: Verified Intent Required
```
INV-001: No execution begins without user-verified intent.
  Evidence: IntentProfile.verified === true AND IntentProfile.verifiedIntent !== rawIntent
  Verifier: Independent IntentVerifier (not the pipeline itself)
  Failure: PipelineIntegrityError — HALT
  Recovery: Re-run intent clarification with user
```

### INV-009: Cross-Stage Boundary Validation
```
INV-009: Every stage output is schema-validated before entering the next stage.
  Evidence: Schema validation record with input hash, output hash, validator ID
  Verifier: BoundaryValidator (independent of stage producers)
  Failure: PipelineIntegrityError — HALT
  Recovery: Re-run the failing stage
```

### INV-012: Pipeline Status Consistency
```
INV-012: Pipeline.passed === true IFF every non-skipped stage has status 'pass'.
  Evidence: Mathematical proof from stages array
  Verifier: StatusVerifier (post-computation check)
  Failure: PipelineIntegrityError — HALT
  Recovery: Re-compute pipeline status
```

---

## ExperienceDesigner Invariants

### INV-003: Reasoning Determinism
```
INV-003: Same input + same provider + same configuration produces same output.
  Evidence: Input hash, output hash, provider name, config hash — all consistent across N runs
  Verifier: DeterminismChecker (runs N times, compares hashes)
  Failure: Provider marked as non-deterministic — WARNING
  Recovery: Use rule-based fallback or hash-cached result
```

---

## ExperienceGovernor Invariants

### INV-002: Independent Validation
```
INV-002: Governor approval requires external calibration, not just internal scoring.
  Evidence: Calibration record with external validator signature
  Verifier: ExternalCalibrator (independent scoring model)
  Failure: Approval overridden — REVISE required
  Recovery: Re-score with calibrated thresholds
```

### INV-014: Semantic Emotional Journey
```
INV-014: Emotional journey states are semantically valid, not just keyword-matching.
  Evidence: State distinctness proof, transition reachability, definition completeness
  Verifier: EmotionalJourneyValidator (semantic analysis)
  Failure: REVISE — emotional journey needs rework
  Recovery: Re-design emotional journey with distinct, meaningful states
```

---

## ExperienceCompiler Invariants

### INV-006: Design Token Validity
```
INV-006: Every design token is a valid, usable value (not placeholder text).
  Evidence: Token format validation (hex, RGB, or named color)
  Verifier: TokenValidator (regex + format check)
  Failure: REJECT — design tokens invalid
  Recovery: Re-extract tokens from visual language or use defaults
```

---

## EngineeringGovernor Invariants

### INV-007: State Machine Reachability
```
INV-007: Every state in every state machine is reachable from the initial state.
  Evidence: Graph reachability analysis — BFS/DFS from initial state covers all nodes
  Verifier: ReachabilityAnalyzer (graph traversal)
  Failure: REJECT — unreachable states
  Recovery: Remove unreachable states or add transitions
```

---

## ImplementationEngine Invariants

### INV-008: Test Count Accuracy
```
INV-008: Test summary reflects actual test execution results.
  Evidence: Parsed test output with actual pass/fail counts
  Verifier: TestResultParser (parses vitest output)
  Failure: HALT — test results unreliable
  Recovery: Re-run tests with verbose output, parse actual results
```

---

## AuditTrail Invariants

### INV-005: Tamper-Evident Audit
```
INV-005: Every audit record is cryptographically chained. Tampering is detectable.
  Evidence: Hash chain — each record's hash includes previous record's hash
  Verifier: AuditIntegrityChecker (recomputes hash chain)
  Failure: Audit trail marked as compromised — HALT
  Recovery: Restore from last verified checkpoint
```

### INV-013: Path Safety
```
INV-013: All file writes resolve within the project directory.
  Evidence: realpath comparison — written path starts with project root
  Verifier: PathValidator (resolves symlinks, checks containment)
  Failure: HALT — path traversal detected
  Recovery: Sanitize path, reject unsafe writes
```

---

## ReasoningProvider Invariants

### INV-011: Provider Determinism Contract
```
INV-011: Providers declare determinism capability. Non-deterministic providers are handled.
  Evidence: Provider metadata includes deterministic: boolean flag
  Verifier: ProviderContractValidator (checks metadata)
  Failure: Provider flagged — deterministic mode enforced via caching
  Recovery: Cache results by input hash, return cached on re-run
```

---

## EAT Invariants

### INV-010: Actual Translation Measurement
```
INV-010: Translation fidelity compares input architecture against output implementation.
  Evidence: Field-by-field comparison with retention percentages
  Verifier: TranslationComparator (analyzes both architecture and implementation)
  Failure: EAT results overridden — re-evaluate with actual comparison
  Recovery: Re-run EAT with implementation data
```

---

## Traceability Invariants

### INV-004: No Orphan Artifacts
```
INV-004: Every artifact has exactly one producer and one parent.
  Evidence: Artifact metadata with producer ID and parent hash
  Verifier: OrphanDetector (graph traversal)
  Failure: HALT — orphan detected
  Recovery: Link orphan to correct parent or remove
```

---

## Summary

| ID | Invariant | Severity | Independent Verifier |
|----|-----------|----------|---------------------|
| INV-001 | Verified Intent Required | Critical | IntentVerifier |
| INV-002 | Independent Validation | High | ExternalCalibrator |
| INV-003 | Reasoning Determinism | High | DeterminismChecker |
| INV-004 | No Orphan Artifacts | High | OrphanDetector |
| INV-005 | Tamper-Evident Audit | Critical | AuditIntegrityChecker |
| INV-006 | Design Token Validity | High | TokenValidator |
| INV-007 | State Machine Reachability | High | ReachabilityAnalyzer |
| INV-008 | Test Count Accuracy | Medium | TestResultParser |
| INV-009 | Cross-Stage Boundary Validation | Critical | BoundaryValidator |
| INV-010 | Actual Translation Measurement | High | TranslationComparator |
| INV-011 | Provider Determinism Contract | High | ProviderContractValidator |
| INV-012 | Pipeline Status Consistency | Medium | StatusVerifier |
| INV-013 | Path Safety | Critical | PathValidator |
| INV-014 | Semantic Emotional Journey | Medium | EmotionalJourneyValidator |
