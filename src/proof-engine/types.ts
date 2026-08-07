/**
 * Proof Engine — Types
 *
 * Formal types for the proof validation system.
 * Every stage outputs Work/Claim/Evidence/Proof instead of Work/Output.
 */

// ============================================================================
// Evidence
// ============================================================================

export interface Evidence {
  id: string;
  type: 'schema' | 'hash' | 'reachability' | 'determinism' | 'semantic' | 'counterexample' | 'comparison' | 'coverage';
  content: unknown;
  producer: string;
  timestamp: Date;
  hash: string;
}

// ============================================================================
// Proof
// ============================================================================

export type ProofResult = 'proved' | 'disproved' | 'inconclusive';

export interface Proof {
  invariantId: string;
  evidenceIds: string[];
  verifier: string;
  deterministic: boolean;
  result: ProofResult;
  hash: string;
  timestamp: Date;
}

// ============================================================================
// Invariant
// ============================================================================

export interface Invariant {
  id: string;
  statement: string;
  evidenceRequired: string[];
  verifier: string;
  failureAction: 'halt' | 'revise' | 'reject' | 'warning';
  recoveryPath: string;
}

// ============================================================================
// Stage Output (extended)
// ============================================================================

export interface StageOutput {
  work: string;
  claim: string;
  evidence: Evidence[];
  proof: Proof;
}

// ============================================================================
// Proof Chain
// ============================================================================

export interface ProofChain {
  proofs: Proof[];
  lastHash: string;
  valid: boolean;
}

// ============================================================================
// Determinism Cache
// ============================================================================

export interface DeterminismCacheEntry {
  inputHash: string;
  outputHash: string;
  result: unknown;
  timestamp: Date;
}

// ============================================================================
// Boundary Validation
// ============================================================================

export interface BoundaryCheck {
  stageName: string;
  inputHash: string;
  outputHash: string;
  schemaValid: boolean;
  timestamp: Date;
}
