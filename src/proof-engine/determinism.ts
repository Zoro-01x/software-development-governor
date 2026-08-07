/**
 * Proof Engine — Determinism Checker
 *
 * Enforces: same input + same context + same config = same proof + same decision.
 * Uses caching for non-deterministic providers.
 */

import { computeHash } from './hash-chain.js';

interface CacheEntry {
  outputHash: string;
  result: unknown;
}

const cache = new Map<string, CacheEntry>();

export function computeInputHash(
  requirements: string,
  projectName: string,
  providerName: string,
  configHash: string,
): string {
  return computeHash(requirements + projectName + providerName + configHash);
}

export function getCachedResult(inputHash: string): unknown | null {
  const entry = cache.get(inputHash);
  return entry ? entry.result : null;
}

export function setCachedResult(inputHash: string, result: unknown, outputHash: string): void {
  cache.set(inputHash, { outputHash, result });
}

export function clearCache(): void {
  cache.clear();
}

export function checkDeterminism(
  inputHash: string,
  currentOutputHash: string,
): { deterministic: boolean; cachedHash: string | null } {
  const entry = cache.get(inputHash);
  if (!entry) {
    return { deterministic: true, cachedHash: null };
  }
  return {
    deterministic: entry.outputHash === currentOutputHash,
    cachedHash: entry.outputHash,
  };
}
