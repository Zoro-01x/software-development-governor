/**
 * Proof Engine — Verifier
 *
 * Independent verification of proofs. Different component than the producer.
 * Recomputes hashes, checks evidence, validates chain integrity.
 */

import type { Proof, Evidence, ProofChain } from './types.js';
import { computeProofHash, verifyHashChain } from './hash-chain.js';

export function verifyProof(
  proof: Proof,
  evidence: Evidence[],
  previousHash: string,
): { valid: boolean; reason?: string } {
  // Check hash chain
  const expectedHash = computeProofHash(
    proof.invariantId,
    proof.evidenceIds,
    proof.result,
    previousHash,
  );

  if (proof.hash !== expectedHash) {
    return { valid: false, reason: 'Hash mismatch — proof may be tampered' };
  }

  // Check evidence exists
  if (proof.evidenceIds.length === 0) {
    return { valid: false, reason: 'No evidence provided' };
  }

  // Check all evidence IDs reference existing evidence
  const evidenceIds = new Set(evidence.map(e => e.id));
  for (const id of proof.evidenceIds) {
    if (!evidenceIds.has(id)) {
      return { valid: false, reason: `Evidence ${id} not found` };
    }
  }

  // Check verifier is different from producer (independent verification)
  const proofEvidence = evidence.filter(e => proof.evidenceIds.includes(e.id));
  const producers = new Set(proofEvidence.map(e => e.producer));
  if (producers.size === 1 && producers.has(proof.verifier)) {
    return { valid: false, reason: 'Verifier is same as producer — not independent' };
  }

  return { valid: true };
}

export function verifyChain(chain: ProofChain): { valid: boolean; brokenAt?: number } {
  if (chain.proofs.length === 0) {
    return { valid: true };
  }

  for (let i = 1; i < chain.proofs.length; i++) {
    const expected = computeProofHash(
      chain.proofs[i].invariantId,
      chain.proofs[i].evidenceIds,
      chain.proofs[i].result,
      chain.proofs[i - 1].hash,
    );
    if (chain.proofs[i].hash !== expected) {
      return { valid: false, brokenAt: i };
    }
  }

  return { valid: true };
}
