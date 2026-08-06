/**
 * In-Memory Memory Store Implementation
 * 
 * Default provider for testing and development.
 * All state is held in JavaScript Maps.
 */

import {
  MemoryStore,
  VersionedStore,
  TransactionalStore,
  SnapshotStore,
  MemoryModule,
  MemoryProvider,
  MemoryConfig,
  MemoryError,
  MemoryErrorCode,
  StoredEntry,
  Version,
  Snapshot,
  Transaction,
  TransactionOperation,
  QueryFilter,
  QueryResult,
  PutOptions,
  StoreStats,
  HealthStatus,
  EntryKey,
  EntryValue,
  VersionNumber,
  SnapshotId,
  TransactionId,
} from './types.js';

// ============================================================================
// In-Memory Provider
// ============================================================================

export class InMemoryProvider implements MemoryProvider {
  name = 'in-memory';
  version = '1.0.0';
  
  private healthy = false;
  private initialized = false;
  
  async initialize(_config: MemoryConfig): Promise<void> {
    this.initialized = true;
    this.healthy = true;
  }
  
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.healthy = false;
  }
  
  async isHealthy(): Promise<boolean> {
    return this.healthy;
  }
  
  async getStats(): Promise<StoreStats> {
    return {
      totalKeys: 0,
      totalSize: 0,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };
  }
}

// ============================================================================
// In-Memory Store
// ============================================================================

export class InMemoryStore implements MemoryModule {
  readonly id: string;
  readonly name: string;
  readonly provider: MemoryProvider;
  readonly config: MemoryConfig;
  
  private store = new Map<EntryKey, StoredEntry>();
  private history = new Map<EntryKey, Version[]>();
  private snapshotStore = new Map<SnapshotId, Snapshot>();
  private snapshotOrder: SnapshotId[] = [];
  private transactions = new Map<TransactionId, Transaction>();
  
  private _status: 'uninitialized' | 'initialized' | 'open' | 'closed' = 'uninitialized';
  private _stats: StoreStats;
  private _health: HealthStatus;
  private _nextVersion = new Map<EntryKey, number>();
  private _activeTransaction: TransactionId | null = null;
  
  constructor(id: string, name: string, provider?: MemoryProvider) {
    this.id = id;
    this.name = name;
    this.provider = provider || new InMemoryProvider();
    this.config = { provider: this.provider.name, options: {} };
    
    this._stats = {
      totalKeys: 0,
      totalSize: 0,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };
    
    this._health = {
      healthy: true,
      lastCheck: new Date(),
      errors: [],
    };
  }
  
  get stats(): StoreStats {
    return { ...this._stats };
  }
  
  get health(): HealthStatus {
    return { ...this._health };
  }
  
  // ========================================================================
  // Lifecycle
  // ========================================================================
  
  async open(): Promise<void> {
    if (this._status === 'open') {
      throw new MemoryError('STORE_OPEN', 'Store is already open');
    }
    this._status = 'open';
    await this.provider.initialize(this.config);
  }
  
  async close(): Promise<void> {
    if (this._status !== 'open') {
      throw new MemoryError('STORE_CLOSED', 'Store is not open');
    }
    this._status = 'closed';
    await this.provider.shutdown();
  }
  
  async compact(): Promise<void> {
    this._ensureOpen();
    // In-memory compaction: nothing to do
    this._stats.lastCompaction = new Date();
  }
  
  // ========================================================================
  // Basic CRUD
  // ========================================================================
  
  async put(key: EntryKey, value: EntryValue, options?: PutOptions): Promise<void> {
    this._ensureOpen();
    this._validateKey(key);
    
    const existing = this.store.get(key);
    const now = new Date();
    
    if (existing) {
      // Check version conflict
      if (options?.expectedVersion !== undefined && existing.version !== options.expectedVersion) {
        throw new MemoryError('VERSION_CONFLICT', 
          `Version conflict for key "${key}": expected ${options.expectedVersion}, got ${existing.version}`);
      }
      
      const newVersion = (this._nextVersion.get(key) || existing.version) + 1;
      this._nextVersion.set(key, newVersion);
      
      const updated: StoredEntry = {
        ...existing,
        value,
        version: newVersion,
        updatedAt: now,
        metadata: options?.metadata || existing.metadata,
      };
      
      this.store.set(key, updated);
      
      // Add to history
      const versions = this.history.get(key) || [];
      versions.push({
        version: newVersion,
        value,
        timestamp: now,
        operation: 'put',
        correlationId: options?.correlationId,
        entryKey: key,
      });
      this.history.set(key, versions);
    } else {
      const newVersion = 1;
      this._nextVersion.set(key, newVersion);
      
      const entry: StoredEntry = {
        key,
        value,
        version: newVersion,
        createdAt: now,
        updatedAt: now,
        metadata: options?.metadata || {},
      };
      
      this.store.set(key, entry);
      this._stats.totalKeys = this.store.size;
      
      // Add to history
      this.history.set(key, [{
        version: newVersion,
        value,
        timestamp: now,
        operation: 'put',
        correlationId: options?.correlationId,
        entryKey: key,
      }]);
    }
    
    this._stats.lastAccessedAt = now;
  }
  
  async get<T>(key: EntryKey): Promise<T | null> {
    this._ensureOpen();
    this._validateKey(key);
    
    const entry = this.store.get(key);
    this._stats.lastAccessedAt = new Date();
    
    return entry ? (entry.value as T) : null;
  }
  
  async delete(key: EntryKey): Promise<void> {
    this._ensureOpen();
    this._validateKey(key);
    
    const entry = this.store.get(key);
    if (!entry) {
      return; // Delete is idempotent
    }
    
    const now = new Date();
    const newVersion = (this._nextVersion.get(key) || entry.version) + 1;
    this._nextVersion.set(key, newVersion);
    
    // Add deletion to history
    const versions = this.history.get(key) || [];
    versions.push({
      version: newVersion,
      value: null,
      timestamp: now,
      operation: 'delete',
      entryKey: key,
    });
    this.history.set(key, versions);
    
    this.store.delete(key);
    this._stats.totalKeys = this.store.size;
    this._stats.lastAccessedAt = now;
  }
  
  async exists(key: EntryKey): Promise<boolean> {
    this._ensureOpen();
    this._validateKey(key);
    
    this._stats.lastAccessedAt = new Date();
    return this.store.has(key);
  }
  
  // ========================================================================
  // Batch Operations
  // ========================================================================
  
  async getMany<T>(keys: EntryKey[]): Promise<Map<EntryKey, T>> {
    this._ensureOpen();
    
    const result = new Map<EntryKey, T>();
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }
    return result;
  }
  
  async putMany(entries: Array<{ key: EntryKey; value: EntryValue }>): Promise<void> {
    this._ensureOpen();
    
    for (const { key, value } of entries) {
      await this.put(key, value);
    }
  }
  
  async deleteMany(keys: EntryKey[]): Promise<void> {
    this._ensureOpen();
    
    for (const key of keys) {
      await this.delete(key);
    }
  }
  
  // ========================================================================
  // Query
  // ========================================================================
  
  async query(pattern: string | QueryFilter): Promise<QueryResult> {
    this._ensureOpen();
    
    const filter = typeof pattern === 'string' 
      ? { pattern }
      : pattern;
    
    let keys = Array.from(this.store.keys());
    
    // Apply filters
    if (filter.prefix) {
      keys = keys.filter(k => k.startsWith(filter.prefix!));
    }
    if (filter.suffix) {
      keys = keys.filter(k => k.endsWith(filter.suffix!));
    }
    if (filter.pattern) {
      const regex = this.globToRegex(filter.pattern);
      keys = keys.filter(k => regex.test(k));
    }
    
    // Sort
    if (filter.order === 'desc') {
      keys.sort().reverse();
    } else {
      keys.sort();
    }
    
    const total = keys.length;
    
    // Apply offset
    if (filter.offset) {
      keys = keys.slice(filter.offset);
    }
    
    // Apply limit
    const hasMore = filter.limit !== undefined && keys.length > filter.limit;
    if (filter.limit) {
      keys = keys.slice(0, filter.limit);
    }
    
    return { keys, total, hasMore };
  }
  
  // ========================================================================
  // Versioning
  // ========================================================================
  
  async getVersion(key: EntryKey): Promise<VersionNumber> {
    this._ensureOpen();
    this._validateKey(key);
    
    const entry = this.store.get(key);
    if (!entry) {
      throw new MemoryError('NOT_FOUND', `Key not found: "${key}"`);
    }
    
    return entry.version;
  }
  
  async getHistory(key: EntryKey): Promise<Version[]> {
    this._ensureOpen();
    this._validateKey(key);
    
    return this.history.get(key) || [];
  }
  
  async getSnapshot(version: VersionNumber): Promise<Snapshot> {
    this._ensureOpen();
    
    // Find snapshot with matching or closest version
    for (const id of this.snapshotOrder) {
      const snapshot = this.snapshotStore.get(id)!;
      if (snapshot.version === version) {
        return snapshot;
      }
    }
    
    throw new MemoryError('NOT_FOUND', `No snapshot found for version ${version}`);
  }
  
  async putVersioned(key: EntryKey, value: EntryValue, expectedVersion: VersionNumber): Promise<void> {
    this._ensureOpen();
    this._validateKey(key);
    
    const entry = this.store.get(key);
    if (!entry) {
      throw new MemoryError('NOT_FOUND', `Key not found: "${key}"`);
    }
    
    if (entry.version !== expectedVersion) {
      throw new MemoryError('VERSION_CONFLICT',
        `Version conflict for key "${key}": expected ${expectedVersion}, got ${entry.version}`);
    }
    
    await this.put(key, value, { expectedVersion });
  }
  
  // ========================================================================
  // Transactions
  // ========================================================================
  
  async beginTransaction(): Promise<Transaction> {
    this._ensureOpen();
    
    if (this._activeTransaction) {
      throw new MemoryError('TRANSACTION_FAILED', 'A transaction is already active');
    }
    
    const transaction: Transaction = {
      id: this.generateId(),
      operations: [],
      startedAt: new Date(),
      status: 'pending',
      storeId: this.id,
      put: (key: EntryKey, value: EntryValue) => {
        transaction.operations.push({ type: 'put', key, value });
      },
      delete: (key: EntryKey) => {
        transaction.operations.push({ type: 'delete', key });
      },
      get: async <T>(key: EntryKey): Promise<T | null> => {
        return this.get<T>(key);
      },
    };
    
    this.transactions.set(transaction.id, transaction);
    this._activeTransaction = transaction.id;
    
    return transaction;
  }
  
  async commit(transaction: Transaction): Promise<void> {
    this._ensureOpen();
    
    const stored = this.transactions.get(transaction.id);
    if (!stored) {
      throw new MemoryError('TRANSACTION_FAILED', 'Transaction not found');
    }
    
    if (stored.status !== 'pending') {
      throw new MemoryError('TRANSACTION_FAILED', `Transaction is ${stored.status}`);
    }
    
    // Apply all operations
    for (const op of stored.operations) {
      if (op.type === 'put') {
        await this.put(op.key, op.value, { expectedVersion: op.version });
      } else {
        await this.delete(op.key);
      }
    }
    
    stored.status = 'committed';
    this._activeTransaction = null;
  }
  
  async rollback(transaction: Transaction): Promise<void> {
    this._ensureOpen();
    
    const stored = this.transactions.get(transaction.id);
    if (!stored) {
      throw new MemoryError('TRANSACTION_FAILED', 'Transaction not found');
    }
    
    stored.status = 'rolledback';
    stored.operations = [];
    this._activeTransaction = null;
  }
  
  // ========================================================================
  // Snapshots
  // ========================================================================
  
  async createSnapshot(label?: string): Promise<Snapshot> {
    this._ensureOpen();
    
    const version = Array.from(this._nextVersion.values()).reduce((a, b) => Math.max(a, b), 0);
    
    const snapshot: Snapshot = {
      id: this.generateId(),
      version,
      label,
      timestamp: new Date(),
      entries: new Map(this.store),
      metadata: {},
    };
    
    this.snapshotStore.set(snapshot.id, snapshot);
    this.snapshotOrder.push(snapshot.id);
    
    return snapshot;
  }
  
  async restoreSnapshot(snapshotId: SnapshotId): Promise<void> {
    this._ensureOpen();
    
    const snapshot = this.snapshotStore.get(snapshotId);
    if (!snapshot) {
      throw new MemoryError('SNAPSHOT_FAILED', `Snapshot not found: "${snapshotId}"`);
    }
    
    // Restore entries
    this.store = new Map(snapshot.entries);
    this._stats.totalKeys = this.store.size;
    this._stats.lastAccessedAt = new Date();
  }
  
  async listSnapshots(): Promise<Snapshot[]> {
    this._ensureOpen();
    
    return this.snapshotOrder
      .map(id => this.snapshotStore.get(id)!)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  async deleteSnapshot(snapshotId: SnapshotId): Promise<void> {
    this._ensureOpen();
    
    const index = this.snapshotOrder.indexOf(snapshotId);
    if (index !== -1) {
      this.snapshotOrder.splice(index, 1);
    }
    
    this.snapshotStore.delete(snapshotId);
  }
  
  // ========================================================================
  // Private Helpers
  // ========================================================================
  
  private _ensureOpen(): void {
    if (this._status !== 'open') {
      throw new MemoryError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private _validateKey(key: EntryKey): void {
    if (typeof key !== 'string' || key.length === 0) {
      throw new MemoryError('INVALID_KEY', 'Key must be a non-empty string');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  private globToRegex(glob: string): RegExp {
    // Escape regex special chars except * and ?
    let pattern = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Convert glob wildcards to regex
    pattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${pattern}$`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new in-memory store.
 */
export function createInMemoryStore(id?: string, name?: string): InMemoryStore {
  return new InMemoryStore(
    id || `store-${Date.now()}`,
    name || 'In-Memory Store'
  );
}
