/**
 * Proof Engine — Evidence Collector
 *
 * Collects evidence from stage outputs and computes hashes.
 */

import { randomUUID } from 'crypto';
import type { Evidence } from './types.js';
import { computeEvidenceHash } from './hash-chain.js';

export function collectEvidence(
  type: Evidence['type'],
  content: unknown,
  producer: string,
): Evidence {
  return {
    id: `ev-${randomUUID().slice(0, 8)}`,
    type,
    content,
    producer,
    timestamp: new Date(),
    hash: computeEvidenceHash(content),
  };
}

export function collectSchemaEvidence(
  data: unknown,
  schema: Record<string, unknown>,
  producer: string,
): Evidence {
  const valid = validateSchema(data, schema);
  return collectEvidence('schema', { data, schema, valid }, producer);
}

function validateSchema(data: unknown, schema: Record<string, unknown>): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  for (const [key, _value] of Object.entries(schema)) {
    if (!(key in obj)) return false;
  }
  return true;
}

export function collectComparisonEvidence(
  input: unknown,
  output: unknown,
  producer: string,
): Evidence {
  return collectEvidence('comparison', { input, output }, producer);
}

export function collectDeterminismEvidence(
  runs: number,
  hashMatches: number,
  producer: string,
): Evidence {
  return collectEvidence('determinism', { runs, hashMatches, deterministic: runs === hashMatches }, producer);
}
