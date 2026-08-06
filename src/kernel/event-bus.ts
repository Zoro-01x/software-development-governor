/**
 * Event Bus
 * 
 * ADR-003: Immutable Kernel
 * Status: FROZEN
 */

import { KernelEvent, KernelEventType, EventHandler, Subscription } from './types.js';

export interface EventBus {
  emit(event: KernelEvent): void;
  subscribe(eventType: string, handler: EventHandler): Subscription;
  unsubscribe(subscriptionId: string): void;
  clear(): void;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Map<string, EventHandler>>();
  private subscriptionCounter = 0;

  emit(event: KernelEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers.values()) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch(() => {});
        }
      } catch {
        // Error isolation: handler failure does not affect bus
      }
    }
  }

  subscribe(eventType: string, handler: EventHandler): Subscription {
    const id = `sub-${++this.subscriptionCounter}`;
    
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map());
    }
    
    this.handlers.get(eventType)!.set(id, handler);

    return {
      id,
      eventType,
      unsubscribe: () => {
        this.unsubscribe(id);
      },
    };
  }

  unsubscribe(subscriptionId: string): void {
    for (const handlers of this.handlers.values()) {
      if (handlers.has(subscriptionId)) {
        handlers.delete(subscriptionId);
        return;
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
