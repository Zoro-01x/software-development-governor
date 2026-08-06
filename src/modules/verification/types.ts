/**
 * Verification Module — Contract Interfaces
 * 
 * Result validation and assertion.
 * Depends on Planning Module for task context.
 */

// ============================================================================
// Core Types
// ============================================================================

export type VerificationId = string;
export type AssertionId = string;

// ============================================================================
// Assertion
// ============================================================================

export interface Assertion {
  id: AssertionId;
  type: AssertionType;
  target: string;
  operator: AssertionOperator;
  expected: unknown;
  actual?: unknown;
  passed?: boolean;
  message?: string;
  metadata: Record<string, unknown>;
}

export type AssertionType = 'equals' | 'contains' | 'matches' | 'exists' | 'type' | 'custom';
export type AssertionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'matches';

// ============================================================================
// Verification
// ============================================================================

export interface Verification {
  id: VerificationId;
  name: string;
  description: string;
  assertions: Assertion[];
  status: VerificationStatus;
  result?: VerificationResult;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type VerificationStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error';
export type VerificationResult = {
  passed: number;
  failed: number;
  total: number;
  duration: number;
};

// ============================================================================
// Query Types
// ============================================================================

export interface VerificationQuery {
  status?: VerificationStatus;
  name?: string;
}

// ============================================================================
// Verification Store Interface
// ============================================================================

export interface VerificationStore {
  // Verifications
  createVerification(verification: Omit<Verification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Verification>;
  getVerification(id: VerificationId): Promise<Verification | null>;
  updateVerification(id: VerificationId, updates: Partial<Verification>): Promise<Verification>;
  deleteVerification(id: VerificationId): Promise<void>;
  queryVerifications(query: VerificationQuery): Promise<Verification[]>;
  
  // Assertions
  addAssertion(verificationId: VerificationId, assertion: Omit<Assertion, 'id'>): Promise<Assertion>;
  getAssertion(id: AssertionId): Promise<Assertion | null>;
  deleteAssertion(id: AssertionId): Promise<void>;
  
  // Execution
  runVerification(id: VerificationId): Promise<VerificationResult>;
  evaluateAssertion(assertion: Assertion, context: unknown): Promise<Assertion>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Verification Module Interface
// ============================================================================

export interface VerificationModule extends VerificationStore {
  // Statistics
  getStats(): Promise<VerificationStats>;
  
  // Health
  isHealthy(): Promise<boolean>;
}

export interface VerificationStats {
  totalVerifications: number;
  totalAssertions: number;
  passedVerifications: number;
  failedVerifications: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class VerificationError extends Error {
  constructor(
    code: VerificationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VerificationError';
    this.code = code;
  }
  
  public readonly code: VerificationErrorCode;
}

export type VerificationErrorCode =
  | 'VERIFICATION_NOT_FOUND'
  | 'ASSERTION_NOT_FOUND'
  | 'INVALID_ASSERTION'
  | 'EVALUATION_ERROR'
  | 'STORE_CLOSED';
