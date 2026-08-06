/**
 * In-Memory Verification Store Implementation
 */

import {
  VerificationStore,
  VerificationModule,
  VerificationError,
  VerificationStats,
  Verification,
  Assertion,
  VerificationStatus,
  VerificationResult,
  VerificationQuery,
  VerificationId,
  AssertionId,
} from './types.js';

export class InMemoryVerificationStore implements VerificationModule {
  private verifications = new Map<VerificationId, Verification>();
  private assertions = new Map<AssertionId, Assertion>();
  
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  // ========================================================================
  // Verifications
  // ========================================================================
  
  async createVerification(verification: Omit<Verification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Verification> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newVerification: Verification = {
      ...verification,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.verifications.set(id, newVerification);
    return newVerification;
  }
  
  async getVerification(id: VerificationId): Promise<Verification | null> {
    this._ensureOpen();
    return this.verifications.get(id) || null;
  }
  
  async updateVerification(id: VerificationId, updates: Partial<Verification>): Promise<Verification> {
    this._ensureOpen();
    
    const existing = this.verifications.get(id);
    if (!existing) {
      throw new VerificationError('VERIFICATION_NOT_FOUND', `Verification not found: "${id}"`);
    }
    
    const updated: Verification = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.verifications.set(id, updated);
    return updated;
  }
  
  async deleteVerification(id: VerificationId): Promise<void> {
    this._ensureOpen();
    
    const verification = this.verifications.get(id);
    if (!verification) {
      return;
    }
    
    // Delete all assertions
    for (const assertion of verification.assertions) {
      this.assertions.delete(assertion.id);
    }
    
    this.verifications.delete(id);
  }
  
  async queryVerifications(query: VerificationQuery): Promise<Verification[]> {
    this._ensureOpen();
    
    let results = Array.from(this.verifications.values());
    
    if (query.status) {
      results = results.filter(v => v.status === query.status);
    }
    if (query.name) {
      results = results.filter(v => v.name.includes(query.name!));
    }
    
    return results;
  }
  
  // ========================================================================
  // Assertions
  // ========================================================================
  
  async addAssertion(verificationId: VerificationId, assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    this._ensureOpen();
    
    const verification = this.verifications.get(verificationId);
    if (!verification) {
      throw new VerificationError('VERIFICATION_NOT_FOUND', `Verification not found: "${verificationId}"`);
    }
    
    const id = this.generateId();
    const newAssertion: Assertion = { ...assertion, id };
    
    this.assertions.set(id, newAssertion);
    verification.assertions.push(newAssertion);
    
    return newAssertion;
  }
  
  async getAssertion(id: AssertionId): Promise<Assertion | null> {
    this._ensureOpen();
    return this.assertions.get(id) || null;
  }
  
  async deleteAssertion(id: AssertionId): Promise<void> {
    this._ensureOpen();
    
    const assertion = this.assertions.get(id);
    if (!assertion) {
      return;
    }
    
    this.assertions.delete(id);
  }
  
  // ========================================================================
  // Execution
  // ========================================================================
  
  async runVerification(id: VerificationId): Promise<VerificationResult> {
    this._ensureOpen();
    
    const verification = this.verifications.get(id);
    if (!verification) {
      throw new VerificationError('VERIFICATION_NOT_FOUND', `Verification not found: "${id}"`);
    }
    
    verification.status = 'running';
    verification.updatedAt = new Date();
    
    const startTime = Date.now();
    let passed = 0;
    let failed = 0;
    
    for (const assertion of verification.assertions) {
      try {
        const evaluated = await this.evaluateAssertion(assertion, {});
        if (evaluated.passed) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        assertion.passed = false;
        assertion.message = error instanceof Error ? error.message : String(error);
      }
    }
    
    const duration = Date.now() - startTime;
    const result: VerificationResult = {
      passed,
      failed,
      total: verification.assertions.length,
      duration,
    };
    
    verification.status = failed === 0 ? 'passed' : 'failed';
    verification.result = result;
    verification.updatedAt = new Date();
    
    return result;
  }
  
  async evaluateAssertion(assertion: Assertion, context: unknown): Promise<Assertion> {
    const evaluated = { ...assertion };
    
    try {
      let passed = false;
      
      switch (assertion.operator) {
        case 'eq':
          passed = JSON.stringify(context) === JSON.stringify(assertion.expected);
          break;
        case 'neq':
          passed = JSON.stringify(context) !== JSON.stringify(assertion.expected);
          break;
        case 'gt':
          passed = (context as number) > (assertion.expected as number);
          break;
        case 'gte':
          passed = (context as number) >= (assertion.expected as number);
          break;
        case 'lt':
          passed = (context as number) < (assertion.expected as number);
          break;
        case 'lte':
          passed = (context as number) <= (assertion.expected as number);
          break;
        case 'contains':
          passed = String(context).includes(String(assertion.expected));
          break;
        case 'matches':
          passed = new RegExp(String(assertion.expected)).test(String(context));
          break;
        default:
          passed = false;
      }
      
      evaluated.passed = passed;
      evaluated.actual = context;
      evaluated.message = passed ? 'Assertion passed' : `Expected ${assertion.expected}, got ${context}`;
    } catch (error) {
      evaluated.passed = false;
      evaluated.message = error instanceof Error ? error.message : String(error);
    }
    
    return evaluated;
  }
  
  // ========================================================================
  // Stats & Health
  // ========================================================================
  
  async getStats(): Promise<VerificationStats> {
    const verifications = Array.from(this.verifications.values());
    
    return {
      totalVerifications: verifications.length,
      totalAssertions: this.assertions.size,
      passedVerifications: verifications.filter(v => v.status === 'passed').length,
      failedVerifications: verifications.filter(v => v.status === 'failed').length,
    };
  }
  
  async isHealthy(): Promise<boolean> {
    return this._status === 'open';
  }
  
  // ========================================================================
  // Private Helpers
  // ========================================================================
  
  private _ensureOpen(): void {
    if (this._status !== 'open') {
      throw new VerificationError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createVerificationStore(): InMemoryVerificationStore {
  return new InMemoryVerificationStore();
}
