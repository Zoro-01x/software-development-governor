# Memory Module — Architecture Decision Record

**Status:** FROZEN  
**Date:** 2026-08-05  
**Module:** Memory  
**Priority:** 1 (All other modules depend on this)

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

## Decision

### What We Decided
1. Memory is a **contract-first module** — interfaces defined before implementation
2. **In-memory provider** is the default for testing and development
3. **Versioning is automatic** — every write increments version
4. **Snapshots are immutable** — created once, never modified
5. **Transactions are serial** — one active transaction per store
6. **Query supports glob patterns** — familiar wildcard syntax

### What We Rejected
1. **SQL-like query language** — too complex for key-value use case
2. **Nested transactions** — unnecessary complexity
3. **Automatic compaction** — manual trigger only
4. **Multi-store transactions** — keep it simple

---

## Responsibilities

### Owned by Memory Module
1. **Data storage** — key-value CRUD
2. **Version tracking** — automatic version history
3. **Snapshot management** — point-in-time captures
4. **Transaction support** — atomic multi-ops
5. **Query execution** — pattern matching
6. **Lifecycle management** — open/close/compact

### Not Owned by Memory Module
- **Schema definition** — handled by consumers
- **Indexing** — handled by providers
- **Replication** — handled by providers
- **Encryption** — handled by providers

---

## Public API

### Core Operations
```typescript
interface MemoryStore {
  put(key: string, value: unknown, options?: PutOptions): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMany<T>(keys: string[]): Promise<Map<string, T>>;
  putMany(entries: Array<{ key: string; value: unknown }>): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  query(pattern: string | QueryFilter): Promise<QueryResult>;
  open(): Promise<void>;
  close(): Promise<void>;
  compact(): Promise<void>;
}
```

### Versioning
```typescript
interface VersionedStore extends MemoryStore {
  getVersion(key: string): Promise<number>;
  getHistory(key: string): Promise<Version[]>;
  getSnapshot(version: number): Promise<Snapshot>;
  putVersioned(key: string, value: unknown, expectedVersion: number): Promise<void>;
}
```

### Transactions
```typescript
interface TransactionalStore extends MemoryStore {
  beginTransaction(): Promise<Transaction>;
  commit(transaction: Transaction): Promise<void>;
  rollback(transaction: Transaction): Promise<void>;
}
```

### Snapshots
```typescript
interface SnapshotStore {
  createSnapshot(label?: string): Promise<Snapshot>;
  restoreSnapshot(snapshotId: string): Promise<void>;
  listSnapshots(): Promise<Snapshot[]>;
  deleteSnapshot(snapshotId: string): Promise<void>;
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

## Dependency Rules

### Memory Module MAY Import
- `src/kernel/types.ts` — Kernel types
- `src/extensions/types.ts` — Extension interfaces
- Standard library only

### Memory Module MAY NOT Import
- `src/adapters/*` — Provider implementations
- `src/strategies/*` — Reasoning strategies
- `src/components/*` — Governance logic
- `src/governance-pipeline.ts` — Pipeline orchestration

---

## Verification Summary

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All contract methods implemented | ✅ | 27 tests passing |
| Provider-agnostic | ✅ | Interface-only contract |
| Version tracking works | ✅ | Version tests pass |
| Snapshots capture state | ✅ | Snapshot tests pass |
| Transactions are atomic | ✅ | Transaction tests pass |
| Error isolation proven | ✅ | Error tests pass |
| Mock provider tests pass | ✅ | In-memory provider |

**Test Results:** 27 passed, 0 failed

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

## Module Structure

```
src/modules/memory/
├── index.ts           # Barrel exports
├── types.ts           # Contract interfaces
└── in-memory.ts       # In-memory implementation

tests/modules/memory/
└── contract.test.ts   # Contract verification
```

---

## Future Work

### Phase 2: Provider Extensions
- SQLite provider
- Redis provider
- PostgreSQL provider
- File-based provider

### Phase 2: Advanced Features
- TTL (time-to-live) for entries
- Event sourcing
- Change data capture
- Multi-store transactions

---

## Conclusion

**Memory Module is FROZEN.**

- All contract methods implemented
- Provider-agnostic
- Version tracking works
- Snapshots capture state
- Transactions are atomic
- Error isolation proven
- 27 tests passing

**Ready for next module implementation.**
