# ADR-003: Immutable Kernel

**Status:** FROZEN  
**Date:** 2026-08-05  
**Depends on:** ADR-001 (Three-Layer Reasoning Boundary), ADR-002 (Extension Model)

## Context

The governance framework needs a central orchestration core that:
- Manages lifecycle of all components
- Routes events between components
- Provides dependency injection
- Isolates failures
- Propagates context

This core must be completely decoupled from domain logic.

## Decision

### Kernel Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        KERNEL                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Boot      │  │  Lifecycle  │  │  Shutdown   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Event Bus  │  │     DI      │  │  Scheduler  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Context    │  │  Isolation  │  │  Extensions │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Adapters    │    │  Strategies   │    │    Rules      │
│  (injected)   │    │  (injected)   │    │  (injected)   │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Kernel Interface

```typescript
interface Kernel {
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Dependency Injection
  register<T>(token: string, implementation: T): void;
  resolve<T>(token: string): T;
  
  // Event Bus
  emit(event: KernelEvent): void;
  subscribe(eventType: string, handler: EventHandler): Subscription;
  
  // Context
  context(): KernelContext;
}
```

### Kernel Responsibilities

1. **Boot** — Initialize all components in dependency order
2. **Lifecycle** — Manage start/stop sequences
3. **Dependency Injection** — Register and resolve implementations
4. **Event Bus** — Route events between components
5. **Extension Loading** — Load and validate extensions
6. **Scheduling** — Order execution of work
7. **State Isolation** — Prevent cross-component state leakage
8. **Context Propagation** — Thread context through operations
9. **Error Isolation** — Contain failures to originating component
10. **Shutdown** — Clean up in reverse order

### Kernel Must Never Know

- OpenAI, Claude, Gemini, Grok, Ollama
- Prompts, system instructions
- Rules (S-001, S-002, etc.)
- Policies, fail actions
- Memory implementations
- Graph definitions
- Experience architectures
- Engineering architectures

### Expose Only

```typescript
Kernel.start()
Kernel.stop()
Kernel.register()
Kernel.resolve()
Kernel.emit()
Kernel.subscribe()
Kernel.context()
```

### Injection Tokens

```typescript
const TOKENS = {
  // Core
  KERNEL: 'kernel',
  EVENT_BUS: 'event-bus',
  CONTEXT: 'context',
  
  // Adapters (injected)
  REASONING_ADAPTER: 'reasoning-adapter',
  HTTP_ADAPTER: 'http-adapter',
  CHAT_ADAPTER: 'chat-adapter',
  
  // Strategies (injected)
  REASONING_STRATEGY: 'reasoning-strategy',
  GENERAL_STRATEGY: 'general-strategy',
  
  // Rules (injected)
  CONSTITUTION_RULE: 'constitution-rule',
  
  // Policies (injected)
  POLICY: 'policy',
  
  // Memory (injected)
  MEMORY: 'memory',
  
  // Tools (injected)
  TOOL: 'tool',
  
  // Observability (injected)
  OBSERVER: 'observer',
} as const;
```

### Lifecycle Phases

```
INITIALIZE → BOOT → READY → RUNNING → STOPPING → STOPPED
```

### Event Types

```typescript
type KernelEventType =
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
```

### Error Isolation

Each extension runs in its own error boundary:
- Extension failure does NOT crash kernel
- Extension failure does NOT affect other extensions
- Extension failure is logged and reported
- Kernel continues operation after extension failure

### Context Isolation

Each operation gets its own context:
- Context is immutable after creation
- Context propagates through event chain
- Context does not leak between operations
- Context carries correlation ID

### Deterministic Startup

1. Initialize kernel primitives
2. Load core services (event bus, DI, context)
3. Register framework extensions
4. Activate extensions in dependency order
5. Emit 'kernel:ready'

### Deterministic Shutdown

1. Emit 'kernel:stopping'
2. Deactivate extensions in reverse order
3. Unregister extensions
4. Clear event subscriptions
5. Emit 'kernel:stopped'

## Rules

1. Kernel has zero provider knowledge
2. Kernel has zero governance knowledge
3. Kernel has zero strategy knowledge
4. Kernel has zero adapter knowledge
5. Everything is injected
6. Kernel is immutable after freeze

## Consequences

### Positive
- Complete decoupling
- Testable in isolation
- Extensible without modification
- Deterministic behavior
- Fail-safe by default

### Negative
- More indirection
- Requires dependency injection

### Neutral
- Existing code unaffected
- No runtime behavior changes

## References

- ADR-001: Three-Layer Reasoning Boundary
- ADR-002: Extension Model
- LOOP 5 Mandate: Six non-negotiable laws
