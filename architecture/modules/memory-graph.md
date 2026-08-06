# Memory Module — Graph Design

**Status:** COMPLETE  
**Module:** Memory

---

## Graph Overview

The Memory Module uses a simple entity-relationship graph. Since it's a key-value store, the graph is flat with clear ownership relationships.

---

## Entities

### 1. MemoryStore
**Type:** Container  
**Description:** Top-level storage container

```
MemoryStore
├── id: string (unique)
├── name: string
├── provider: MemoryProvider
├── config: MemoryConfig
├── status: 'uninitialized' | 'initialized' | 'open' | 'closed'
├── createdAt: Date
└── stats: StoreStats
```

### 2. StoredEntry
**Type:** Data  
**Description:** Individual key-value pair

```
StoredEntry
├── key: string (unique within store)
├── value: unknown
├── version: number
├── createdAt: Date
├── updatedAt: Date
└── metadata: Record<string, unknown>
```

### 3. Version
**Type:** History  
**Description:** Version of a StoredEntry

```
Version
├── version: number (unique within entry)
├── value: unknown
├── timestamp: Date
├── operation: 'put' | 'delete'
├── correlationId?: string
└── entryKey: string (foreign key)
```

### 4. Snapshot
**Type:** Capture  
**Description:** Point-in-time state capture

```
Snapshot
├── id: string (unique)
├── version: number
├── label?: string
├── timestamp: Date
├── entries: Map<string, StoredEntry>
└── metadata: Record<string, unknown>
```

### 5. Transaction
**Type:** Operation  
**Description:** In-flight multi-operation

```
Transaction
├── id: string (unique)
├── operations: TransactionOperation[]
├── startedAt: Date
├── status: 'pending' | 'committed' | 'rolledback'
└── storeId: string (foreign key)
```

### 6. TransactionOperation
**Type:** Action  
**Description:** Single operation within a transaction

```
TransactionOperation
├── type: 'put' | 'delete'
├── key: string
├── value?: unknown
├── version?: number
└── transactionId: string (foreign key)
```

---

## Relationships

### 1. Store → Entry (1:N)
```
MemoryStore "1" ──contains──> "N" StoredEntry
```
- A store contains many entries
- An entry belongs to exactly one store
- Cascade delete: deleting store deletes entries

### 2. Entry → Version (1:N)
```
StoredEntry "1" ──has──> "N" Version
```
- An entry has many versions
- A version belongs to exactly one entry
- Append-only: versions are never modified

### 3. Store → Snapshot (1:N)
```
MemoryStore "1" ──captures──> "N" Snapshot
```
- A store has many snapshots
- A snapshot belongs to exactly one store
- Snapshot contains entry copies

### 4. Store → Transaction (1:N)
```
MemoryStore "1" ──manages──> "N" Transaction
```
- A store has many transactions
- A transaction belongs to exactly one store
- Only one active transaction per store (enforced by implementation)

### 5. Transaction → Operation (1:N)
```
Transaction "1" ──contains──> "N" TransactionOperation
```
- A transaction has many operations
- An operation belongs to exactly one transaction

---

## Graph Visualization

```
┌─────────────────────────────────────────────────────────┐
│                    MemoryStore                          │
├─────────────────────────────────────────────────────────┤
│ id: string                                              │
│ name: string                                            │
│ provider: MemoryProvider                                │
│ config: MemoryConfig                                    │
│ status: 'uninitialized' | 'initialized' | 'open' | 'closed'│
│ createdAt: Date                                         │
│ stats: StoreStats                                       │
└─────────────────────────────────────────────────────────┘
         │
         │ contains
         ▼
┌─────────────────────┐      ┌─────────────────────┐
│    StoredEntry      │      │    Snapshot         │
├─────────────────────┤      ├─────────────────────┤
│ key: string         │      │ id: string          │
│ value: unknown      │      │ version: number     │
│ version: number     │      │ label?: string      │
│ createdAt: Date     │      │ timestamp: Date     │
│ updatedAt: Date     │      │ entries: Map        │
│ metadata: Record    │      │ metadata: Record    │
└─────────────────────┘      └─────────────────────┘
         │
         │ has
         ▼
┌─────────────────────┐      ┌─────────────────────┐
│     Version         │      │    Transaction      │
├─────────────────────┤      ├─────────────────────┤
│ version: number     │      │ id: string          │
│ value: unknown      │      │ operations: Op[]    │
│ timestamp: Date     │      │ startedAt: Date     │
│ operation: enum     │      │ status: enum        │
│ correlationId?: str │      │ storeId: string     │
│ entryKey: string    │      └─────────────────────┘
└─────────────────────┘                │
                                       │ contains
                                       ▼
                             ┌─────────────────────┐
                             │ TransactionOperation │
                             ├─────────────────────┤
                             │ type: enum           │
                             │ key: string          │
                             │ value?: unknown      │
                             │ version?: number     │
                             │ transactionId: string│
                             └─────────────────────┘
```

---

## Graph Rules

### Invariants
1. **Unique keys** — Each entry has unique key within store
2. **Unique IDs** — Snapshots, transactions have unique IDs
3. **Append-only versions** — Never modify, only add
4. **Cascade delete** — Deleting store removes all children
5. **No cycles** — Simple hierarchy, no circular references

### Constraints
1. **One active transaction** — Per store
2. **Snapshot immutability** — Cannot modify after creation
3. **Version ordering** — Versions are numbered sequentially
4. **Correlation tracking** — Operations linked to source

---

## Graph Operations

### 1. Put Entry
```
Create StoredEntry → Append Version → Update Stats
```

### 2. Get Entry
```
Find StoredEntry → Return value
```

### 3. Delete Entry
```
Find StoredEntry → Append Version (operation: delete) → Remove entry
```

### 4. Create Snapshot
```
Copy all entries → Create Snapshot → Add to snapshot list
```

### 5. Begin Transaction
```
Create Transaction → Add to active transactions
```

### 6. Commit Transaction
```
Apply all operations → Create versions → Remove transaction
```

### 7. Rollback Transaction
```
Discard all operations → Remove transaction
```

---

## Conclusion

**Graph model is complete.**

- 6 entities defined
- 5 relationships documented
- All rules specified
- Operations documented

**Ready to proceed to Interfaces.**
