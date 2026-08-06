/**
 * Context Propagation
 * 
 * ADR-003: Immutable Kernel
 * Status: FROZEN
 */

import { KernelContext, KernelEvent } from './types.js';

export interface ContextManager {
  create(metadata?: Record<string, unknown>): KernelContext;
  current(): KernelContext | undefined;
  propagate<T>(context: KernelContext, fn: () => T): T;
  clear(): void;
}

export class InMemoryContextManager implements ContextManager {
  private currentContext: KernelContext | undefined;
  private contextCounter = 0;

  create(metadata: Record<string, unknown> = {}): KernelContext {
    const context: KernelContext = {
      correlationId: `ctx-${Date.now()}-${++this.contextCounter}`,
      createdAt: new Date(),
      metadata: Object.freeze({ ...metadata }),
      
      withMetadata(additionalMetadata: Record<string, unknown>): KernelContext {
        return {
          correlationId: this.correlationId,
          createdAt: this.createdAt,
          metadata: Object.freeze({
            ...this.metadata,
            ...additionalMetadata,
          }),
          withMetadata: this.withMetadata.bind(this),
        };
      },
    };

    this.currentContext = context;
    return context;
  }

  current(): KernelContext | undefined {
    return this.currentContext;
  }

  propagate<T>(context: KernelContext, fn: () => T): T {
    const previous = this.currentContext;
    this.currentContext = context;
    
    try {
      return fn();
    } finally {
      this.currentContext = previous;
    }
  }

  clear(): void {
    this.currentContext = undefined;
  }
}
