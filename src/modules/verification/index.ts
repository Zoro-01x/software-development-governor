/**
 * Verification Module — Barrel Exports
 */

export type {
  VerificationId,
  AssertionId,
  Assertion,
  AssertionType,
  AssertionOperator,
  Verification,
  VerificationStatus,
  VerificationResult,
  VerificationQuery,
  VerificationStore,
  VerificationModule,
  VerificationStats,
  VerificationErrorCode,
} from './types.js';

export { VerificationError } from './types.js';
export { InMemoryVerificationStore, createVerificationStore } from './in-memory.js';
