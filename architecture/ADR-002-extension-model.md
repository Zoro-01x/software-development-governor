# ADR-002: Extension Model

**Status:** FROZEN  
**Date:** 2026-08-05  
**Depends on:** ADR-001 (Three-Layer Reasoning Boundary)

## Context

The governance framework must be extensible without modification. Developers need to add adapters, strategies, rules, policies, graphs, memory providers, tools, and observability hooks without touching framework internals.

## Decision

### Extension Points

Eight extension points, each with defined interface, lifecycle, registration, validation, versioning, compatibility, and failure behavior.

---

### 1. Adapters (`src/adapters/`)

**Purpose:** Translate between framework and external providers

**Interface:**
```typescript
interface ExtensionAdapter {
  readonly id: string;
  readonly version: string;
  readonly provider: string;
  
  isConfigured(): boolean;
  translateToProvider(prompt: PromptPackage): ProviderRequest;
  translateFromProvider(response: ProviderResponse): string;
  
  healthCheck?(): Promise<boolean>;
  getCapabilities?(): AdapterCapabilities;
}
```

**Lifecycle:**
1. Registration → Validation → Activation → Health Check → Deactivation

**Registration:**
```typescript
registry.registerAdapter(adapter: ExtensionAdapter): void;
```

**Validation:**
- Must implement `ExtensionAdapter`
- Must have unique `id`
- Must have valid semver `version`
- Must not import from `src/runtime/` or `src/components/`

**Versioning:**
- Semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR: Breaking changes
- MINOR: New features, backward compatible
- PATCH: Bug fixes

**Compatibility:**
- Framework declares `SUPPORTED_ADAPTER_VERSION` range
- Extensions outside range rejected at registration

**Failure Behavior:**
- Invalid extension → FAIL_CLOSED (reject registration)
- Runtime failure → FALLBACK to next available adapter
- Health check failure → DEACTIVATE adapter

---

### 2. Strategies (`src/strategies/`)

**Purpose:** Own all prompt engineering and response parsing

**Interface:**
```typescript
interface ExtensionStrategy {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  
  buildPromptPackage(input: ReasoningInput): PromptPackage;
  parseResponse(response: string): ReasoningResult | null;
  
  getMetadata?(): StrategyMetadata;
}
```

**Lifecycle:**
1. Registration → Validation → Activation → Deactivation

**Registration:**
```typescript
registry.registerStrategy(strategy: ExtensionStrategy): void;
```

**Validation:**
- Must implement `ExtensionStrategy`
- Must have unique `id`
- Must have valid semver `version`
- Must not import from `src/adapters/`

**Versioning:**
- Same as Adapters

**Compatibility:**
- Framework declares `SUPPORTED_STRATEGY_VERSION` range

**Failure Behavior:**
- Invalid extension → FAIL_CLOSED
- Parse failure → RETURN_NULL (caller decides fallback)
- Missing strategy → USE_DEFAULT (GeneralStrategy)

---

### 3. Rules (`src/constitution/`)

**Purpose:** Define governance constraints

**Interface:**
```typescript
interface ExtensionRule {
  readonly id: string;
  readonly version: string;
  readonly ruleId: string;
  readonly name: string;
  readonly description: string;
  
  evaluate(context: GovernanceContext): RuleContribution;
  
  getRequiredState?(): RequiredState;
  getPolicy?(): PolicyDeclaration;
}
```

**Lifecycle:**
1. Registration → Validation → Activation → Evaluation → Deactivation

**Registration:**
```typescript
constitution.registerRule(rule: ExtensionRule): void;
```

**Validation:**
- Must implement `ExtensionRule`
- Must have unique `ruleId` (format: `X-NNN`)
- Must have valid semver `version`
- Must not import from `src/adapters/` or `src/strategies/`

**Versioning:**
- Same as Adapters

**Compatibility:**
- Framework declares `SUPPORTED_RULE_VERSION` range

**Failure Behavior:**
- Invalid extension → FAIL_CLOSED
- Evaluation failure → BLOCK (conservative)
- Missing rule → SKIP with warning

---

### 4. Policies (`src/runtime/policy-engine.ts`)

**Purpose:** Define fail actions for rules

**Interface:**
```typescript
interface ExtensionPolicy {
  readonly id: string;
  readonly version: string;
  readonly ruleId: string;
  
  getFailAction(context: GovernanceContext): RuleDecision;
  getEvaluationMode(): PolicyEvaluationMode;
  
  getContextBranches?(): PolicyBranch[];
}
```

**Lifecycle:**
1. Registration → Validation → Activation → Evaluation → Deactivation

**Registration:**
```typescript
policyEngine.registerPolicy(policy: ExtensionPolicy): void;
```

**Validation:**
- Must implement `ExtensionPolicy`
- Must have unique `ruleId`
- Must have valid semver `version`
- Must not import from `src/adapters/` or `src/strategies/`

**Versioning:**
- Same as Adapters

**Compatibility:**
- Framework declares `SUPPORTED_POLICY_VERSION` range

**Failure Behavior:**
- Invalid extension → FAIL_CLOSED
- Evaluation failure → USE_DEFAULT_POLICY
- Missing policy → USE_CONSTANT_FAIL_ACTION

---

### 5. Graphs (`src/runtime/graph.ts`)

**Purpose:** Define governance flow topology

**Interface:**
```typescript
interface ExtensionGraph {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  
  getDefinition(): GovernanceGraphDefinition;
  getAllowances(): AllowanceMap;
  
  validate?(): GraphValidationReport;
}
```

**Lifecycle:**
1. Registration → Validation → Activation → Deactivation

**Registration:**
```typescript
graphRegistry.registerGraph(graph: ExtensionGraph): void;
```

**Validation:**
- Must implement `ExtensionGraph`
- Must have unique `id`
- Must have valid semver `version`
- Must pass `validateGraph()` validation
- Must not import from `src/adapters/` or `src/strategies/`

**Versioning:**
- Same as Adapters

**Compatibility:**
- Framework declares `SUPPORTED_GRAPH_VERSION` range

**Failure Behavior:**
- Invalid extension → FAIL_CLOSED
- Validation failure → REJECT graph
- Missing graph → USE_DEFAULT_GRAPH

---

### 6. Memory (`src/runtime/memory.ts`)

**Purpose:** Persist governance state

**Interface:**
```typescript
interface ExtensionMemory {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  
  store(key: string, value: unknown, metadata?: MemoryMetadata): Promise<void>;
  retrieve(key: string): Promise<MemoryEntry | null>;
  query(filter: MemoryFilter): Promise<MemoryEntry[]>;
  
  delete?(key: string): Promise<void>;
  clear?(): Promise<void>;
  
  healthCheck?(): Promise<boolean>;
}
```

**Lifecycle:**
1. Registration → Validation → Activation → Health Check → Deactivation

**Registration:**
```typescript
memoryRegistry.registerMemory(memory: ExtensionMemory): void;
```

**Validation:**
- Must implement `ExtensionMemory`
- Must have unique `id`
- Must have valid semver `version`
- Must not import from `src/adapters/` or `src/strategies/`

**Versioning:**
- Same as Adapters

**Compatibility:**
- Framework declares `SUPPORTED_MEMORY_VERSION` range

**Failure Behavior:**
- Invalid extension → FAIL_CLOSED
- Storage failure → QUEUE for retry
- Health check failure → DEACTIVATE memory
- Missing memory → USE_VOLATILE (in-memory fallback)

---

### 7. Tools (`src/runtime/tools.ts`)

**Purpose:** Provide external capabilities to governance

**Interface:**
```typescript
interface ExtensionTool {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParameterSchema;
  
  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  
  validate?(params: Record<string, unknown>): ValidationResult;
  getSchema?(): ToolSchema;
}
```

**Lifecycle:**
1. Registration → Validation → Activation → Execution → Deactivation

**Registration:**
```typescript
toolRegistry.registerTool(tool: ExtensionTool): void;
```

**Validation:**
- Must implement `ExtensionTool`
- Must have unique `id`
- Must have valid semver `version`
- Must not import from `src/adapters/` or `src/strategies/`

**Versioning:**
- Same as Adapters

**Compatibility:**
- Framework declares `SUPPORTED_TOOL_VERSION` range

**Failure Behavior:**
- Invalid extension → FAIL_CLOSED
- Execution failure → RETURN_ERROR
- Missing tool → REJECT tool call

---

### 8. Observability (`src/runtime/observability.ts`)

**Purpose:** Monitor governance behavior

**Interface:**
```typescript
interface ExtensionObservability {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  
  onEvent(event: GovernanceEvent): void;
  onMetric(metric: GovernanceMetric): void;
  onError(error: GovernanceError): void;
  
  flush?(): Promise<void>;
  shutdown?(): Promise<void>;
}
```

**Lifecycle:**
1. Registration → Validation → Activation → Event Processing → Deactivation → Shutdown

**Registration:**
```typescript
observabilityRegistry.registerObserver(observer: ExtensionObservability): void;
```

**Validation:**
- Must implement `ExtensionObservability`
- Must have unique `id`
- Must have valid semver `version`
- Must not import from `src/adapters/` or `src/strategies/`

**Versioning:**
- Same as Adapters

**Compatibility:**
- Framework declares `SUPPORTED_OBSERVABILITY_VERSION` range

**Failure Behavior:**
- Invalid extension → FAIL_CLOSED
- Event processing failure → DROP event (non-blocking)
- Observer failure → ISOLATE (don't affect other observers)

---

## Rules

### 1. Extension Communication
Extensions communicate ONLY through framework contracts (`src/reasoning.ts`, extension interfaces).

### 2. No Internal Imports
Extensions NEVER import internal framework modules (`src/runtime/`, `src/components/`).

### 3. No Extension Dependencies
Internal modules NEVER depend on extensions.

### 4. Deterministic Loading
Extension loading is deterministic and order-independent.

### 5. Fail Closed
Invalid extensions fail closed at registration time.

### 6. Version Compatibility
Framework upgrades preserve extension compatibility or explicitly version-break it.

## Consequences

### Positive
- Clear extension boundaries
- Type-safe extension points
- Version compatibility guaranteed
- Fail-closed by default
- Deterministic behavior

### Negative
- More interfaces to implement
- Strict versioning requirements

### Neutral
- Existing extensions unaffected
- No runtime behavior changes

## References

- ADR-001: Three-Layer Reasoning Boundary
- LOOP 5 Mandate: Six non-negotiable laws
- ONTOLOGY.md §8: Policy Model
