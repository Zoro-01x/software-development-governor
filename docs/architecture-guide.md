# Architecture Guide

Understand the Governance Framework architecture.

## Overview

The Governance Framework is a modular, provider-agnostic system for governing AI-assisted software development.

## Core Principles

### 1. Governance Owns Workflow

The framework owns the workflow. AI owns the reasoning.

- Framework determines what happens when
- AI determines how to reason about each step
- No bypass paths exist

### 2. No Runtime Provider Dependencies

No runtime component depends on any provider.

- Framework uses interfaces, not implementations
- Providers are optional
- Adapters translate between framework and providers

### 3. Repo Compiles Without Adapters

The repository compiles if all adapters are deleted.

- Only registration fails at runtime
- Framework is self-contained
- Adapters are plugins

### 4. Same Interface for All Providers

Every provider implements the same interface.

- Consistent API across providers
- Easy to swap providers
- No provider-specific code in framework

### 5. Clone + Adapter = Any Model

Clone the repository, add one adapter, use any model.

- Minimal setup required
- Provider-agnostic design
- Easy to extend

### 6. All Model Interactions Through Ports

All model interactions go through ports/interfaces.

- No direct provider calls
- Clean separation of concerns
- Testable and maintainable

## Architecture Layers

### Kernel

The kernel owns orchestration only.

- `start()` - Start the framework
- `stop()` - Stop the framework
- `register()` - Register extensions
- `resolve()` - Resolve dependencies
- `emit()` - Emit events
- `subscribe()` - Subscribe to events
- `context()` - Get context

### Constitution

The constitution defines governance rules.

- 90 rules governing AI behavior
- Constitution engine enforces rules
- Rules are immutable

### Runtime

The runtime executes decisions.

- Policy engine evaluates policies
- Graph validator validates workflows
- Risk analyzer assesses risk

### Modules

Modules provide capabilities.

- Memory - Store data
- Knowledge - Store facts and relations
- Planning - Create and manage plans
- Verification - Verify assertions
- Tool Execution - Execute tools
- Workflows - Manage workflows
- Multi-Agent - Coordinate agents
- Scheduling - Schedule jobs
- Observability - Log, trace, and measure

### Adapters

Adapters connect to providers.

- Implement ReasoningProvider interface
- Translate between framework and providers
- Are optional plugins

### Strategies

Strategies define reasoning approaches.

- Implement ReasoningStrategy interface
- Define how to reason about inputs
- Are optional plugins

## Module Dependency Graph

```
Kernel
  ↓
Constitution
  ↓
Runtime
  ↓
Memory
  ↓
Knowledge
  ↓
Planning
  ↓
Verification
  ↓
Tool Execution
  ↓
Workflows
  ↓
Multi-Agent
  ↓
Scheduling
  ↓
Observability
```

## Extension Points

1. **Adapters** - New AI providers
2. **Modules** - New capabilities
3. **Memory Backends** - New storage options
4. **Strategies** - New reasoning approaches

## Frozen Architecture

The following components are frozen:

- Kernel - Immutable orchestration
- Constitution - Governance rules
- Runtime - Decision engine
- ADRs - Architecture decisions
- All 9 Modules - Capabilities

## Next Steps

- [API Reference](./api-reference.md) - Detailed API documentation
- [Migration Guide](./migration-guide.md) - Migrate from other frameworks
