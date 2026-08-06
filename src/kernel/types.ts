/**
 * Kernel Types
 * 
 * ADR-003: Immutable Kernel
 * Status: FROZEN
 */

export type KernelState = 
  | 'initializing' 
  | 'booting' 
  | 'ready' 
  | 'running' 
  | 'stopping' 
  | 'stopped' 
  | 'error';

export type KernelEventType =
  | 'kernel:booting'
  | 'kernel:booted'
  | 'kernel:ready'
  | 'kernel:stopping'
  | 'kernel:stopped'
  | 'kernel:error'
  | 'extension:registering'
  | 'extension:registered'
  | 'extension:activating'
  | 'extension:activated'
  | 'extension:deactivating'
  | 'extension:deactivated'
  | 'extension:error'
  | 'context:created'
  | 'context:propagated';

export interface KernelEvent {
  readonly type: KernelEventType;
  readonly timestamp: Date;
  readonly correlationId: string;
  readonly payload?: unknown;
}

export interface KernelContext {
  readonly correlationId: string;
  readonly createdAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
  
  withMetadata(metadata: Record<string, unknown>): KernelContext;
}

export interface EventHandler {
  (event: KernelEvent): void | Promise<void>;
}

export interface Subscription {
  readonly id: string;
  readonly eventType: string;
  unsubscribe(): void;
}

export interface Injectable<T = unknown> {
  readonly token: string;
  readonly implementation: T;
  readonly dependencies?: string[];
}

export interface ExtensionDescriptor {
  readonly id: string;
  readonly version: string;
  readonly type: string;
  readonly dependencies?: string[];
}

export interface KernelConfig {
  readonly strictMode?: boolean;
  readonly timeout?: number;
  readonly maxRetries?: number;
}

export class KernelError extends Error {
  constructor(
    public readonly code: KernelErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'KernelError';
  }
}

export type KernelErrorCode = 
  | 'ALREADY_STARTED'
  | 'NOT_STARTED'
  | 'ALREADY_STOPPED'
  | 'DEPENDENCY_MISSING'
  | 'CIRCULAR_DEPENDENCY'
  | 'EXTENSION_FAILED'
  | 'TIMEOUT'
  | 'INVALID_TOKEN';

/**
 * Kernel Interface
 * 
 * The immutable orchestration core of the governance framework.
 * Provides lifecycle, DI, event bus, context, and extension management.
 */
export interface Kernel {
  start(): Promise<void>;
  stop(): Promise<void>;
  register<T>(token: string, implementation: T): void;
  resolve<T>(token: string): T;
  emit(event: KernelEvent): void;
  subscribe(eventType: KernelEventType, handler: EventHandler): Subscription;
  context(): KernelContext;
  loadExtension(descriptor: ExtensionDescriptor): Promise<void>;
  activateExtension(id: string): Promise<void>;
}
