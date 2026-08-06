/**
 * Memory Module — Barrel Exports
 * 
 * Provider-agnostic persistence layer for the governance framework.
 */

// Types
export type {
  EntryKey,
  EntryValue,
  VersionNumber,
  SnapshotId,
  TransactionId,
  CorrelationId,
  PutOptions,
  StoredEntry,
  Version,
  Snapshot,
  Transaction,
  TransactionOperation,
  QueryFilter,
  QueryResult,
  StoreStats,
  HealthStatus,
  MemoryConfig,
  MemoryStore,
  VersionedStore,
  TransactionalStore,
  SnapshotStore,
  MemoryProvider,
  MemoryModule,
  MemoryErrorCode,
} from './types.js';

export { MemoryError, createMemoryModule, createInMemoryStore as createInMemoryStoreFactory } from './types.js';

// Implementations
export { InMemoryStore, InMemoryProvider, createInMemoryStore } from './in-memory.js';
