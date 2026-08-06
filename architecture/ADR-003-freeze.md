# ADR-003: Immutable Kernel — FROZEN

**Status:** FROZEN  
**Date:** 2026-08-05  
**Decision:** Governance Framework Architecture

---

## Purpose

The Kernel is the immutable orchestration core of the governance framework. It provides:
- Lifecycle management (boot, running, stopped)
- Dependency injection container
- Event bus for internal communication
- Context propagation
- Extension loading and activation
- Error isolation

The Kernel is **provider-agnostic**, **governance-agnostic**, **strategy-agnostic**, and **adapter-agnostic**. It knows nothing about:
- LLM providers (OpenAI, Anthropic, etc.)
- Governance rules or policies
- Reasoning strategies
- Adapters or their implementations

---

## Responsibilities

### Owned by Kernel
1. **Boot sequence** — deterministic startup
2. **Lifecycle management** — start, stop, state transitions
3. **Dependency injection** — register, resolve, circular detection
4. **Event bus** — emit, subscribe, unsubscribe
5. **Context propagation** — correlation IDs, metadata
6. **Extension loading** — register, activate, deactivate, dependency ordering
7. **Shutdown sequence** — reverse-order deactivation
8. **Error isolation** — handler failures don't cascade

### Not Owned by Kernel
- Provider connections
- Prompt construction
- Rule evaluation
- Memory operations
- Graph operations
- Tool execution

---

## Public API

```typescript
interface Kernel {
  start(): Promise<void>;
  stop(): Promise<void>;
  
  register<T>(id: string, service: T): void;
  resolve<T>(id: string): T;
  
  emit(event: KernelEvent): void;
  subscribe(type: KernelEventType, handler: EventHandler): Subscription;
  
  context(): KernelContext;
  
  loadExtension(descriptor: ExtensionDescriptor): Promise<void>;
  activateExtension(id: string): Promise<void>;
}
```

---

## Invariants

1. **Kernel never depends on modules** — Modules depend on Kernel, never reverse.
2. **Deterministic startup** — Same extension set → same activation order.
3. **Deterministic shutdown** — Reverse activation order.
4. **Error isolation** — One extension failure doesn't prevent others from loading.
5. **Context isolation** — Each operation gets unique correlation ID.
6. **Zero provider knowledge** — No imports from provider SDKs.
7. **Zero governance knowledge** — No imports from rule/policy modules.
8. **Zero strategy knowledge** — No imports from strategy modules.
9. **Zero adapter knowledge** — No imports from adapter modules.
10. **All dependencies injected** — Kernel receives everything through DI.

---

## Dependency Rules

### Kernel May Import
- `src/extensions/types.ts` — Extension interfaces
- `src/extensions/registry.ts` — Extension registry (internal)
- Standard library only

### Kernel May NOT Import
- `src/adapters/*`
- `src/strategies/*`
- `src/components/*`
- `src/governance-pipeline.ts`
- Any provider SDK

### Modules May Import
- `src/kernel/*` — Kernel interfaces and types
- `src/extensions/*` — Extension contracts
- Standard library

### Modules May NOT Import
- Other modules (inter-module communication through Kernel events only)

---

## Verification Summary

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Kernel verification passes | ✅ | 28 tests passing |
| Provider-agnostic | ✅ | No provider imports |
| Governance-agnostic | ✅ | No governance imports |
| Strategy-agnostic | ✅ | No strategy imports |
| Adapter-agnostic | ✅ | No adapter imports |
| All dependencies injected | ✅ | DI container with circular detection |
| Startup deterministic | ✅ | Topological sort for activation |
| Shutdown deterministic | ✅ | Reverse activation order |
| Extension isolation proven | ✅ | Error handler tests |
| Context isolation proven | ✅ | Unique correlation IDs |

**Test Results:** 28 passed, 0 failed

---

## Breaking Change Policy

### What Constitutes a Breaking Change
- Modifying public API signatures
- Changing event types
- Altering lifecycle semantics
- Adding required dependencies

### What Does NOT Constitute a Breaking Change
- Adding optional methods
- Adding new event types
- Internal implementation changes
- Performance improvements

### Approval Required
Any breaking change requires:
1. Architecture review
2. Impact analysis on all modules
3. Migration guide
4. Version bump (major)

---

## Transition

**Architecture Phase = COMPLETE**

All ADRs are frozen. Future development proceeds as Framework Modules:

- Memory
- Multi-Agent
- Tool Execution
- Planning
- Verification
- Scheduling
- Observability
- Knowledge
- Workflows

**Module Rules:**
1. Modules depend on Kernel
2. Kernel never depends on Modules
3. Modules communicate only through contracts
4. Modules may be added or removed independently
5. Every Module has its own tests
6. Every Module is independently versioned

**Module Implementation Protocol:**
1. Define public contract
2. Implement
3. Verify
4. Document
5. Freeze

---

## Foundation Complete

The governance framework now has:
- ✅ Three-Layer Reasoning Boundary (ADR-001)
- ✅ Extension Model (ADR-002)
- ✅ Immutable Kernel (ADR-003)

**Ready for Module Implementation**
