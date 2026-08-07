/**
 * Proof Engine — Boundary Validator
 *
 * Validates schemas at stage boundaries.
 * Ensures every stage output is structurally valid before entering the next stage.
 */

import { collectSchemaEvidence } from './evidence.js';

export interface BoundarySchema {
  [key: string]: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

export function validateBoundary(
  data: unknown,
  schema: BoundarySchema,
  stageName: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Data is not an object'] };
  }

  const obj = data as Record<string, unknown>;

  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in obj)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }

    const value = obj[key];
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      errors.push(`Field ${key}: expected ${expectedType}, got ${actualType}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createBoundaryEvidence(
  data: unknown,
  schema: BoundarySchema,
  stageName: string,
) {
  const result = validateBoundary(data, schema, stageName);
  return collectSchemaEvidence(
    { stageName, valid: result.valid, errors: result.errors },
    schema,
    `boundary-validator-${stageName}`,
  );
}
