/**
 * Proof Engine — Hash Chain
 *
 * Tamper-evident chain. Each proof's hash includes the previous proof's hash.
 * Changing any proof breaks all subsequent hashes.
 */

import { createHash } from 'crypto';
import type { Proof } from './types.js';

export function computeHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function computeProofHash(
  invariantId: string,
  evidenceIds: string[],
  result: string,
  previousHash: string,
): string {
  const payload = invariantId + evidenceIds.join('') + result + previousHash;
  return computeHash(payload);
}

export function computeEvidenceHash(content: unknown): string {
  return computeHash(JSON.stringify(content));
}

export function verifyHashChain(proofs: Proof[]): boolean {
  for (let i = 1; i < proofs.length; i++) {
    const expected = computeProofHash(
      proofs[i].invariantId,
      proofs[i].evidenceIds,
      proofs[i].result,
      proofs[i - 1].hash,
    );
    if (proofs[i].hash !== expected) {
      return false;
    }
  }
  return true;
}
