/**
 * @framework/proof-engine
 *
 * Proof validation system for the Governance Framework.
 * Every transition is backed by an independently verifiable proof.
 * Confidence is never accepted as evidence.
 */

export { ProofEngine } from './proof-engine.js';
export type {
  Proof,
  Evidence,
  ProofChain,
  Invariant,
  ProofResult,
  StageOutput,
  DeterminismCacheEntry,
  BoundaryCheck,
} from './types.js';
export { computeHash, computeProofHash, computeEvidenceHash, verifyHashChain } from './hash-chain.js';
export { collectEvidence, collectSchemaEvidence, collectComparisonEvidence, collectDeterminismEvidence } from './evidence.js';
export { verifyProof, verifyChain } from './verifier.js';
export { computeInputHash, getCachedResult, setCachedResult, clearCache, checkDeterminism } from './determinism.js';
export { validateBoundary, createBoundaryEvidence } from './boundary.js';
