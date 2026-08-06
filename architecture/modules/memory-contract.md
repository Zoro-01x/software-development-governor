# Memory Module — Public Contract

**Status:** DRAFT  
**Module:** Memory  
**Priority:** 1 (Highest — all other Modules depend on this)

---

## Purpose

The Memory Module provides a provider-agnostic persistence layer for the governance framework. It defines:
- **Storage interface** — put, get, delete, query
- **Versioning** — automatic version tracking
- **Snapshots** — point-in-time state capture
- **Transactions** — atomic multi-operation commits
- **Lifecycle** — open, close, compact

The Memory Module is **an interface**. Concrete implementations (SQLite, Redis, PostgreSQL, files, vectors) become interchangeable extensions.

---

## Prerequisites

| Prerequisite | Status |
|--------------|--------|
| Kernel (ADR-003) | ✅ Frozen |
| Extension Model (ADR-002) | ✅ Frozen |
| Three-Layer Boundary (ADR-001) | ✅ Frozen |

**All prerequisites satisfied.**

---

## Contract

### Core Operations

```typescript
interface MemoryStore {
  // Basic CRUD
  put(key: string, value: unknown, options?: PutOptions): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  
  // Batch operations
  getMany<T>(keys: string[]): Promise<Map<string, T>>;
  putMany(entries: Array<{ key: string; value: unknown }>): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  
  // Query
  query(pattern: string | QueryFilter): Promise<QueryResult>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
  compact(): Promise<void>;
}
```

### Versioning

```typescript
interface VersionedStore extends MemoryStore {
  // Version operations
  getVersion(key: string): Promise<number>;
  getHistory(key: string): Promise<Version[]>;
  getSnapshot(version: number): Promise<Snapshot>;
  
  // Write with version check
  putVersioned(key: string, value: unknown, expectedVersion: number): Promise<void>;
}
```

### Transactions

```typescript
interface TransactionalStore extends MemoryStore {
  // Transaction operations
  beginTransaction(): Promise<Transaction>;
  commit(transaction: Transaction): Promise<void>;
  rollback(transaction: Transaction): Promise<void>;
}

interface Transaction {
  id: string;
  put(key: string, value: unknown): void;
  delete(key: string): void;
  get<T>(key: string): Promise<T | null>;
}
```

### Snapshots

```typescript
interface SnapshotStore {
  // Snapshot operations
  createSnapshot(label?: string): Promise<Snapshot>;
  restoreSnapshot(snapshotId: string): Promise<void>;
  listSnapshots(): Promise<Snapshot[]>;
  deleteSnapshot(snapshotId: string): Promise<void>;
}

interface Snapshot {
  id: string;
  version: number;
  label?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}
```

### Provider Interface

```typescript
interface MemoryProvider {
  name: string;
  version: string;
  
  // Lifecycle
  initialize(config: MemoryConfig): Promise<void>;
  shutdown(): Promise<void>;
  
  // Health
  isHealthy(): Promise<boolean>;
  getStats(): Promise<MemoryStats>;
}

interface MemoryConfig {
  provider: string;
  options: Record<string, unknown>;
}

interface MemoryStats {
  totalKeys: number;
  totalSize: number;
  lastCompaction?: Date;
}
```

### Query Interface

```typescript
interface QueryFilter {
  prefix?: string;
  suffix?: string;
  pattern?: string;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

interface QueryResult {
  keys: string[];
  total: number;
  hasMore: boolean;
}
```

---

## Invariants

1. **Provider-agnostic** — No database assumptions in contract
2. **Key-based access** — All operations via string keys
3. **Type-safe retrieval** — Generic `get<T>` returns typed values
4. **Atomic transactions** — All-or-nothing multi-ops
5. **Automatic versioning** — Version incremented on each write
6. **Snapshot isolation** — Snapshots capture consistent state
7. **Lifecycle managed** — Open/close/compact in correct order
8. **Error isolation** — Failed ops don't corrupt store
9. **Independent testing** — Mock provider for unit tests
10. **Extension-ready** — Providers register as extensions

---

## Module Structure

```
src/modules/memory/
├── index.ts           # Barrel exports
├── types.ts           # Contract interfaces
├── provider.ts        # Provider registration
├── versioning.ts      # Version tracking
├── snapshots.ts       # Snapshot management
└── transactions.ts    # Transaction support

tests/modules/memory/
├── contract.test.ts   # Contract verification
├── versioning.test.ts # Version tracking
├── snapshots.test.ts  # Snapshots
└── transactions.test.ts # Transactions
```

---

## Breaking Change Policy

### Non-Breaking Changes
- Adding optional methods
- Adding new query operators
- Adding provider-specific extensions
- Internal implementation changes

### Breaking Changes (Require Approval)
- Removing methods
- Changing method signatures
- Changing return types
- Adding required config fields

---

## Verification Criteria

| Criterion | Required |
|-----------|----------|
| All contract methods implemented | Yes |
| Provider-agnostic | Yes |
| Version tracking works | Yes |
| Snapshots capture state | Yes |
| Transactions are atomic | Yes |
| Error isolation proven | Yes |
| Mock provider tests pass | Yes |
| Integration test with real provider | Optional |

---

## Acceptance Checklist

- [ ] Contract defined
- [ ] Dependencies verified
- [ ] State model designed
- [ ] Graph model designed
- [ ] Interfaces implemented
- [ ] Core implemented
- [ ] Verification tests pass
- [ ] Documentation complete
- [ ] Frozen
