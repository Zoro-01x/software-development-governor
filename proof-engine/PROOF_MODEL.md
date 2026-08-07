# PROOF MODEL — Proof Engine v1.0

**Date:** 2026-08-07
**Status:** Model defined — implementation in `src/proof-engine/`

---

## Structure

Every stage outputs:

```
{
  work: string,           // What was done
  claim: string,          // What is claimed to be true
  evidence: Evidence[],   // Supporting evidence
  proof: Proof            // Formal proof record
}
```

### Evidence

```
{
  id: string,             // Unique evidence ID
  type: string,           // 'schema' | 'hash' | 'reachability' | 'determinism' | 'semantic' | 'counterexample'
  content: unknown,       // The evidence itself
  producer: string,       // Who produced this evidence
  timestamp: Date,        // When produced
  hash: string            // SHA-256 of content
}
```

### Proof

```
{
  invariantId: string,    // Which invariant this proves
  evidenceIds: string[],  // Evidence IDs used
  verifier: string,       // Who verified
  deterministic: boolean, // Same input = same result?
  result: 'proved' | 'disproved' | 'inconclusive',
  hash: string,           // SHA-256 of (invariantId + evidenceIds + result)
  timestamp: Date         // When proved
}
```

---

## Proof Lifecycle

```
Stage Output
    │
    ▼
Evidence Collection
    │
    ├──→ Schema Validation (INV-009)
    ├──→ Hash Computation (INV-005)
    ├──→ Reachability Analysis (INV-007)
    ├──→ Determinism Check (INV-003)
    └──→ Semantic Validation (INV-014)
    │
    ▼
Proof Construction
    │
    ├──→ Invariant ID
    ├──→ Evidence IDs
    ├──→ Verifier ID
    ├──→ Deterministic flag
    ├──→ Result (proved/disproved/inconclusive)
    ├──→ Hash
    └──→ Timestamp
    │
    ▼
Independent Verification
    │
    ├──→ Recompute hash chain
    ├──→ Re-verify evidence
    ├──→ Cross-check with other proofs
    └──→ Tamper detection
    │
    ▼
Acceptance or Rejection
```

---

## Hash Chain

Every proof includes a hash that chains to the previous proof:

```
proof[n].hash = SHA-256(proof[n].invariantId + proof[n].evidenceIds + proof[n].result + proof[n-1].hash)
```

This creates a tamper-evident chain. Changing any proof breaks all subsequent hashes.

---

## Determinism Contract

For a proof to be considered **proved**:

1. Same input must produce same output
2. Same context must produce same decision
3. Same configuration must produce same trace
4. All hashes must be reproducible

If a proof is **non-deterministic**:
- Mark as `inconclusive`
- Require re-run with controlled randomness
- Cache result by input hash

---

## Verification Levels

| Level | What | How |
|-------|------|-----|
| L0 | Schema valid | JSON schema check |
| L1 | Hash chain intact | Recompute all hashes |
| L2 | Evidence present | Check evidence count > 0 |
| L3 | Deterministic | Run N times, compare |
| L4 | Independent | Different verifier than producer |
| L5 | Adversarial | Attempt to disprove |

A proof is **accepted** only if all applicable levels pass.

---

## Implementation

### Files

```
src/proof-engine/
  types.ts          — Proof, Evidence, Invariant types
  proof-engine.ts   — Main proof engine
  evidence.ts       — Evidence collection and hashing
  verifier.ts       — Independent verification
  hash-chain.ts     — Tamper-evident hash chain
  determinism.ts    — Determinism checker
  boundary.ts       — Cross-stage boundary validator
```

### Integration Points

1. **Pipeline** — Each stage calls `proofEngine.verify()` after producing output
2. **Governor** — Each governor includes proof in its decision
3. **Audit Trail** — Each record includes proof hash chain
4. **EAT** — Translation fidelity uses actual comparison, not estimation
