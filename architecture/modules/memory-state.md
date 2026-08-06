# Memory Module — State Design

**Status:** COMPLETE  
**Module:** Memory

---

## State Model Overview

The Memory Module manages six categories of state:

1. **Data State** — Key-value pairs
2. **Version State** — Change history
3. **Snapshot State** — Point-in-time captures
4. **Transaction State** — In-flight operations
5. **Metadata State** — Store statistics
6. **Lifecycle State** — Module status

---

## State Categories

### 1. Data State

**Purpose:** Actual stored data

```typescript
interface DataState {
  store: Map<string, StoredEntry>;
}

interface StoredEntry {
  key: string;
  value: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}
```

**Invariants:**
- Keys are unique strings
- Values are JSON-serializable
- Version increments on each write
- Timestamps are ISO 8601

---

### 2. Version State

**Purpose:** Track all changes for audit/recovery

```typescript
interface VersionState {
  history: Map<string, Version[]>;
}

interface Version {
  version: number;
  value: unknown;
  timestamp: Date;
  operation: 'put' | 'delete';
  correlationId?: string;
}
```

**Invariants:**
- History is append-only
- Each version has unique number per key
- Deletion creates version with `operation: 'delete'`
- Correlation ID links to operation source

---

### 3. Snapshot State

**Purpose:** Point-in-time state capture

```typescript
interface SnapshotState {
  snapshots: Map<string, Snapshot>;
  snapshotOrder: string[];
}

interface Snapshot {
  id: string;
  version: number;
  label?: string;
  timestamp: Date;
  data: Map<string, StoredEntry>;
  metadata: Record<string, unknown>;
}
```

**Invariants:**
- Snapshot ID is unique
- Snapshot captures consistent state
- Snapshots are immutable after creation
- Order array tracks creation sequence

---

### 4. Transaction State

**Purpose:** In-flight multi-operations

```typescript
interface TransactionState {
  active: Map<string, Transaction>;
}

interface Transaction {
  id: string;
  operations: TransactionOperation[];
  startedAt: Date;
  status: 'pending' | 'committed' | 'rolledback';
}

interface TransactionOperation {
  type: 'put' | 'delete';
  key: string;
  value?: unknown;
  version?: number;
}
```

**Invariants:**
- Transaction IDs are unique
- Operations are buffered until commit
- Commit is atomic (all succeed or all fail)
- Rollback discards all operations

---

### 5. Metadata State

**Purpose:** Store statistics and health

```typescript
interface MetadataState {
  stats: StoreStats;
  health: HealthStatus;
}

interface StoreStats {
  totalKeys: number;
  totalSize: number;
  lastCompaction?: Date;
  createdAt: Date;
  lastAccessedAt: Date;
}

interface HealthStatus {
  healthy: boolean;
  lastCheck: Date;
  errors: string[];
}
```

**Invariants:**
- Stats are updated on each operation
- Health is checked periodically
- Errors are append-only

---

### 6. Lifecycle State

**Purpose:** Module status

```typescript
interface LifecycleState {
  status: 'uninitialized' | 'initialized' | 'open' | 'closed';
  openedAt?: Date;
  closedAt?: Date;
}
```

**Invariants:**
- Status transitions are linear
- Cannot open twice without close
- Cannot close without open

---

## State Transitions

### Data State
```
[New Key] → put → [Exists]
[Exists] → put → [Updated]
[Exists] → delete → [Deleted]
[Deleted] → put → [Recreated]
```

### Transaction State
```
[No Transaction] → begin → [Transaction Open]
[Transaction Open] → operations → [Buffered]
[Buffered] → commit → [Applied]
[Buffered] → rollback → [Discarded]
```

### Lifecycle State
```
[Uninitialized] → initialize → [Initialized]
[Initialized] → open → [Open]
[Open] → close → [Closed]
[Closed] → open → [Open]  (reopen)
```

---

## State Persistence

### In-Memory (Default)
- All state in JavaScript Maps
- Lost on process exit
- Fastest for testing

### On-Disk (Provider)
- State serialized to disk
- Survives restarts
- Slower but durable

### Distributed (Provider)
- State in Redis/PostgreSQL
- Shared across processes
- Network latency

---

## State Isolation

### Per-Store Isolation
Each store has independent state:
- Data
- Versions
- Snapshots
- Transactions
- Metadata
- Lifecycle

### Transaction Isolation
Transactions don't see each other's changes until commit.

### Snapshot Isolation
Snapshots capture consistent state at a point in time.

---

## State Cleanup

### Compaction
- Remove old versions
- Keep only latest N versions
- Triggered manually or by threshold

### Snapshot Deletion
- Remove old snapshots
- Keep only latest N snapshots
- Manual trigger only

---

## Conclusion

**State model is complete.**

- 6 state categories defined
- All transitions documented
- Isolation rules clear
- Cleanup strategies defined

**Ready to proceed to Graph Design.**
