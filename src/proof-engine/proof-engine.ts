/**
 * Proof Engine — Main Orchestrator
 *
 * Read-only observer. Validates proofs, never modifies, never controls, never decides.
 * Every stage calls proofEngine.verify() after producing output.
 */

import { randomUUID } from 'crypto';
import type { Proof, Evidence, ProofChain, Invariant, ProofResult } from './types.js';
import { computeProofHash, computeHash, verifyHashChain } from './hash-chain.js';
import { collectEvidence, collectDeterminismEvidence } from './evidence.js';
import { verifyProof, verifyChain } from './verifier.js';
import { checkDeterminism, getCachedResult, setCachedResult, computeInputHash } from './determinism.js';

export class ProofEngine {
  private invariants: Map<string, Invariant> = new Map();
  private evidence: Evidence[] = [];
  private proofs: Proof[] = [];
  private lastHash = '0'.repeat(64);

  constructor() {
    this.registerDefaultInvariants();
  }

  // ==========================================================================
  // Invariant Registration
  // ==========================================================================

  registerInvariant(invariant: Invariant): void {
    this.invariants.set(invariant.id, invariant);
  }

  private registerDefaultInvariants(): void {
    const defaults: Invariant[] = [
      {
        id: 'INV-001',
        statement: 'No execution begins without user-verified intent.',
        evidenceRequired: ['intent-profile'],
        verifier: 'intent-verifier',
        failureAction: 'halt',
        recoveryPath: 'Re-run intent clarification with user',
      },
      {
        id: 'INV-003',
        statement: 'Same input + same provider + same configuration produces same output.',
        evidenceRequired: ['determinism-check'],
        verifier: 'determinism-checker',
        failureAction: 'warning',
        recoveryPath: 'Use rule-based fallback or hash-cached result',
      },
      {
        id: 'INV-005',
        statement: 'Every audit record is cryptographically chained. Tampering is detectable.',
        evidenceRequired: ['hash-chain'],
        verifier: 'audit-integrity-checker',
        failureAction: 'halt',
        recoveryPath: 'Restore from last verified checkpoint',
      },
      {
        id: 'INV-009',
        statement: 'Every stage output is schema-validated before entering the next stage.',
        evidenceRequired: ['boundary-check'],
        verifier: 'boundary-validator',
        failureAction: 'halt',
        recoveryPath: 'Re-run the failing stage',
      },
    ];

    for (const inv of defaults) {
      this.registerInvariant(inv);
    }
  }

  // ==========================================================================
  // Proof Generation
  // ==========================================================================

  generateProof(
    invariantId: string,
    evidenceIds: string[],
    verifier: string,
    deterministic: boolean,
    result: ProofResult,
  ): Proof {
    const hash = computeProofHash(invariantId, evidenceIds, result, this.lastHash);
    const proof: Proof = {
      invariantId,
      evidenceIds,
      verifier,
      deterministic,
      result,
      hash,
      timestamp: new Date(),
    };

    this.proofs.push(proof);
    this.lastHash = hash;

    return proof;
  }

  // ==========================================================================
  // Verification
  // ==========================================================================

  verify(
    invariantId: string,
    work: string,
    claim: string,
    evidenceList: Evidence[],
    verifier: string,
  ): { proof: Proof; valid: boolean; reason?: string } {
    const invariant = this.invariants.get(invariantId);
    if (!invariant) {
      throw new Error(`Unknown invariant: ${invariantId}`);
    }

    // Store evidence
    this.evidence.push(...evidenceList);

    // Determine result based on evidence
    let result: ProofResult = 'proved';
    for (const ev of evidenceList) {
      if (ev.type === 'schema' && typeof ev.content === 'object' && ev.content !== null) {
        const content = ev.content as Record<string, unknown>;
        if (content.valid === false) {
          result = 'disproved';
        }
      }
    }

    // Check determinism
    const deterministic = evidenceList.every(e => e.type !== 'determinism' || 
      (typeof e.content === 'object' && e.content !== null && (e.content as Record<string, unknown>).deterministic === true)
    );

    // Generate proof
    const proof = this.generateProof(
      invariantId,
      evidenceList.map(e => e.id),
      verifier,
      deterministic,
      result,
    );

    // Verify the proof independently
    const verification = verifyProof(proof, evidenceList, this.lastHash);

    return {
      proof,
      valid: verification.valid,
      reason: verification.reason,
    };
  }

  // ==========================================================================
  // Chain Validation
  // ==========================================================================

  getChain(): ProofChain {
    return {
      proofs: [...this.proofs],
      lastHash: this.lastHash,
      valid: verifyHashChain(this.proofs),
    };
  }

  validateChain(): { valid: boolean; brokenAt?: number } {
    return verifyChain(this.getChain());
  }

  // ==========================================================================
  // Determinism
  // ==========================================================================

  checkAndCache(
    requirements: string,
    projectName: string,
    providerName: string,
    configHash: string,
    output: unknown,
  ): { deterministic: boolean; fromCache: boolean } {
    const inputHash = computeInputHash(requirements, projectName, providerName, configHash);
    const outputHash = computeHash(JSON.stringify(output));

    // Check cache
    const cached = getCachedResult(inputHash);
    if (cached !== null) {
      const cachedHash = computeHash(JSON.stringify(cached));
      return { deterministic: cachedHash === outputHash, fromCache: true };
    }

    // Cache new result
    setCachedResult(inputHash, output, outputHash);
    return { deterministic: true, fromCache: false };
  }

  // ==========================================================================
  // Summary
  // ==========================================================================

  getSummary(): {
    totalProofs: number;
    proved: number;
    disproved: number;
    inconclusive: number;
    chainValid: boolean;
    invariantsRegistered: number;
  } {
    return {
      totalProofs: this.proofs.length,
      proved: this.proofs.filter(p => p.result === 'proved').length,
      disproved: this.proofs.filter(p => p.result === 'disproved').length,
      inconclusive: this.proofs.filter(p => p.result === 'inconclusive').length,
      chainValid: this.validateChain().valid,
      invariantsRegistered: this.invariants.size,
    };
  }
}
