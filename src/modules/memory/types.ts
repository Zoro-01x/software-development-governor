/**
 * Memory Module — Contract Interfaces
 * 
 * Provider-agnostic persistence layer for the governance framework.
 * Concrete implementations (SQLite, Redis, PostgreSQL, files) become
 * interchangeable extensions.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Unique identifier for stored entries
 */
export type EntryKey = string;

/**
 * JSON-serializable value
 */
export type EntryValue = unknown;

/**
 * Version number (monotonically increasing per key)
 */
export type VersionNumber = number;

/**
 * Unique identifier for snapshots
 */
export type SnapshotId = string;

/**
 * Unique identifier for transactions
 */
export type TransactionId = string;

/**
 * Correlation ID for tracking operation sources
 */
export type CorrelationId = string;

// ============================================================================
// Put Options
// ============================================================================

export interface PutOptions {
  /** Expected version for optimistic concurrency */
  expectedVersion?: VersionNumber;
  
  /** Metadata to attach to the entry */
  metadata?: Record<string, unknown>;
  
  /** Correlation ID for tracking */
  correlationId?: CorrelationId;
}

// ============================================================================
// Stored Entry
// ============================================================================

export interface StoredEntry {
  /** Unique key within the store */
  key: EntryKey;
  
  /** JSON-serializable value */
  value: EntryValue;
  
  /** Current version number */
  version: VersionNumber;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
  
  /** Attached metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Version History
// ============================================================================

export interface Version {
  /** Version number (unique within entry) */
  version: VersionNumber;
  
  /** Value at this version */
  value: EntryValue;
  
  /** Timestamp of this version */
  timestamp: Date;
  
  /** Operation that created this version */
  operation: 'put' | 'delete';
  
  /** Optional correlation ID */
  correlationId?: CorrelationId;
  
  /** Foreign key to entry */
  entryKey: EntryKey;
}

// ============================================================================
// Snapshot
// ============================================================================

export interface Snapshot {
  /** Unique snapshot ID */
  id: SnapshotId;
  
  /** Version number at capture time */
  version: VersionNumber;
  
  /** Optional human-readable label */
  label?: string;
  
  /** Capture timestamp */
  timestamp: Date;
  
  /** Copies of entries at capture time */
  entries: Map<EntryKey, StoredEntry>;
  
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Transaction
// ============================================================================

export interface Transaction {
  /** Unique transaction ID */
  id: TransactionId;
  
  /** Buffered operations */
  operations: TransactionOperation[];
  
  /** Start timestamp */
  startedAt: Date;
  
  /** Transaction status */
  status: 'pending' | 'committed' | 'rolledback';
  
  /** Foreign key to store */
  storeId: string;
  
  /** Add a put operation */
  put(key: EntryKey, value: EntryValue): void;
  
  /** Add a delete operation */
  delete(key: EntryKey): void;
  
  /** Get a value (reads from store) */
  get<T>(key: EntryKey): Promise<T | null>;
}

export interface TransactionOperation {
  /** Operation type */
  type: 'put' | 'delete';
  
  /** Target key */
  key: EntryKey;
  
  /** Value (for put operations) */
  value?: EntryValue;
  
  /** Expected version (for optimistic concurrency) */
  version?: VersionNumber;
}

// ============================================================================
// Query
// ============================================================================

export interface QueryFilter {
  /** Match keys starting with prefix */
  prefix?: string;
  
  /** Match keys ending with suffix */
  suffix?: string;
  
  /** Glob-style pattern */
  pattern?: string;
  
  /** Maximum results */
  limit?: number;
  
  /** Skip N results */
  offset?: number;
  
  /** Sort order */
  order?: 'asc' | 'desc';
}

export interface QueryResult {
  /** Matching keys */
  keys: EntryKey[];
  
  /** Total matching count */
  total: number;
  
  /** Whether more results exist */
  hasMore: boolean;
}

// ============================================================================
// Store Statistics
// ============================================================================

export interface StoreStats {
  /** Total number of keys */
  totalKeys: number;
  
  /** Total size in bytes (estimated) */
  totalSize: number;
  
  /** Last compaction timestamp */
  lastCompaction?: Date;
  
  /** Store creation timestamp */
  createdAt: Date;
  
  /** Last access timestamp */
  lastAccessedAt: Date;
}

// ============================================================================
// Health
// ============================================================================

export interface HealthStatus {
  /** Whether store is healthy */
  healthy: boolean;
  
  /** Last health check timestamp */
  lastCheck: Date;
  
  /** Recent errors */
  errors: string[];
}

// ============================================================================
// Configuration
// ============================================================================

export interface MemoryConfig {
  /** Provider name */
  provider: string;
  
  /** Provider-specific options */
  options: Record<string, unknown>;
}

// ============================================================================
// Memory Store Interface
// ============================================================================

/**
 * Core memory store interface.
 * All providers must implement this.
 */
export interface MemoryStore {
  // Basic CRUD
  put(key: EntryKey, value: EntryValue, options?: PutOptions): Promise<void>;
  get<T>(key: EntryKey): Promise<T | null>;
  delete(key: EntryKey): Promise<void>;
  exists(key: EntryKey): Promise<boolean>;
  
  // Batch operations
  getMany<T>(keys: EntryKey[]): Promise<Map<EntryKey, T>>;
  putMany(entries: Array<{ key: EntryKey; value: EntryValue }>): Promise<void>;
  deleteMany(keys: EntryKey[]): Promise<void>;
  
  // Query
  query(pattern: string | QueryFilter): Promise<QueryResult>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
  compact(): Promise<void>;
}

// ============================================================================
// Versioned Store Interface
// ============================================================================

/**
 * Extended store with versioning support.
 */
export interface VersionedStore extends MemoryStore {
  // Version operations
  getVersion(key: EntryKey): Promise<VersionNumber>;
  getHistory(key: EntryKey): Promise<Version[]>;
  getSnapshot(version: VersionNumber): Promise<Snapshot>;
  
  // Write with version check
  putVersioned(key: EntryKey, value: EntryValue, expectedVersion: VersionNumber): Promise<void>;
}

// ============================================================================
// Transactional Store Interface
// ============================================================================

/**
 * Extended store with transaction support.
 */
export interface TransactionalStore extends MemoryStore {
  // Transaction operations
  beginTransaction(): Promise<Transaction>;
  commit(transaction: Transaction): Promise<void>;
  rollback(transaction: Transaction): Promise<void>;
}

// ============================================================================
// Snapshot Store Interface
// ============================================================================

/**
 * Extended store with snapshot support.
 */
export interface SnapshotStore {
  // Snapshot operations
  createSnapshot(label?: string): Promise<Snapshot>;
  restoreSnapshot(snapshotId: SnapshotId): Promise<void>;
  listSnapshots(): Promise<Snapshot[]>;
  deleteSnapshot(snapshotId: SnapshotId): Promise<void>;
}

// ============================================================================
// Memory Provider Interface
// ============================================================================

/**
 * Provider registration interface.
 * Concrete providers implement this.
 */
export interface MemoryProvider {
  /** Provider name (e.g., 'sqlite', 'redis') */
  name: string;
  
  /** Provider version (semver) */
  version: string;
  
  /** Initialize the provider */
  initialize(config: MemoryConfig): Promise<void>;
  
  /** Shutdown the provider */
  shutdown(): Promise<void>;
  
  /** Health check */
  isHealthy(): Promise<boolean>;
  
  /** Get store statistics */
  getStats(): Promise<StoreStats>;
}

// ============================================================================
// Memory Module Interface
// ============================================================================

/**
 * Full memory module interface.
 * Combines all capabilities.
 */
export interface MemoryModule extends VersionedStore, TransactionalStore, SnapshotStore {
  /** Provider info */
  provider: MemoryProvider;
  
  /** Store configuration */
  config: MemoryConfig;
  
  /** Store statistics */
  stats: StoreStats;
  
  /** Health status */
  health: HealthStatus;
  
  /** Store name */
  name: string;
  
  /** Store ID */
  id: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class MemoryError extends Error {
  constructor(
    code: MemoryErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
  }
  
  public readonly code: MemoryErrorCode;
}

export type MemoryErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VERSION_CONFLICT'
  | 'TRANSACTION_FAILED'
  | 'SNAPSHOT_FAILED'
  | 'STORE_CLOSED'
  | 'STORE_OPEN'
  | 'INVALID_KEY'
  | 'INVALID_VALUE'
  | 'PROVIDER_ERROR'
  | 'COMPACTION_FAILED';

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new memory module with the specified provider.
 */
export function createMemoryModule(config: MemoryConfig): MemoryModule {
  // Implementation will be provided by the provider
  throw new MemoryError('PROVIDER_ERROR', 'Not implemented');
}

/**
 * Create a default in-memory store for testing.
 */
export function createInMemoryStore(): MemoryModule {
  // Implementation will be provided
  throw new MemoryError('PROVIDER_ERROR', 'Not implemented');
}
