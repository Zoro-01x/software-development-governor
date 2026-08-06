# API Reference — v1.0.0 (Frozen)

Detailed API documentation for the Governance Framework.

> **This is the frozen public API.** All exports below are stable. Internal, experimental, and legacy symbols have been excluded. Every interface is imported from `@framework/core`; every adapter and memory backend is a separate package.

## Package Overview

| Package | Install | Purpose |
|---|---|---|
| `@framework/core` | `npm i @framework/core` | Core interfaces (all stores, reasoning, types) |
| `@framework/adapter-openai` | `npm i @framework/adapter-openai openai` | OpenAI adapter |
| `@framework/adapter-anthropic` | `npm i @framework/adapter-anthropic @anthropic-ai/sdk` | Anthropic adapter |
| `@framework/adapter-gemini` | `npm i @framework/adapter-gemini @google/generative-ai` | Google Gemini adapter |
| `@framework/adapter-groq` | `npm i @framework/adapter-groq groq-sdk` | Groq adapter |
| `@framework/adapter-ollama` | `npm i @framework/adapter-ollama` | Ollama local adapter |
| `@framework/adapter-lmstudio` | `npm i @framework/adapter-lmstudio` | LM Studio local adapter |
| `@framework/adapter-openrouter` | `npm i @framework/adapter-openrouter` | OpenRouter multi-provider gateway |
| `@framework/memory-file` | `npm i @framework/memory-file` | File-based memory backend |
| `@framework/memory-sqlite` | `npm i @framework/memory-sqlite better-sqlite3` | SQLite memory backend |
| `@framework/memory-postgres` | `npm i @framework/memory-postgres pg` | PostgreSQL memory backend |
| `@framework/memory-redis` | `npm i @framework/memory-redis ioredis` | Redis memory backend |
| `@framework/bridge-opencode` | `npm i @framework/bridge-opencode` | Open Code ↔ Governance Kernel bridge |

## Core Interfaces

### ReasoningProvider

```typescript
interface ReasoningProvider {
  name: string;
  reason(input: ReasoningInput): Promise<ReasoningResult>;
}

interface ReasoningInput {
  requirements: string;
  projectName?: string;
  context?: Record<string, unknown>;
}

interface ReasoningResult {
  design: any;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, unknown>;
}
```

### MemoryStore

```typescript
interface MemoryStore {
  open(): Promise<void>;
  close(): Promise<void>;
  put(key: string, value: unknown): Promise<void>;
  get(key: string): Promise<unknown | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  query(query: MemoryQuery): Promise<{ keys: string[]; total: number; hasMore: boolean }>;
}

interface MemoryQuery {
  limit?: number;
  offset?: number;
  pattern?: string;
}
```

### KnowledgeStore

```typescript
interface KnowledgeStore {
  open(): Promise<void>;
  close(): Promise<void>;
  addEntity(entity: Omit<Entity, 'id'>): Promise<Entity>;
  getEntity(id: string): Promise<Entity | null>;
  addFact(fact: Omit<Fact, 'id'>): Promise<Fact>;
  queryFacts(query: any): Promise<Fact[]>;
}

interface Entity {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  facts: Fact[];
  relations: Relation[];
}

interface Fact {
  id: string;
  subject: string;
  predicate: string;
  object: { type: string; value: unknown };
  confidence: number;
  source: string;
  metadata: Record<string, unknown>;
}
```

### PlanningStore

```typescript
interface PlanningStore {
  open(): Promise<void>;
  close(): Promise<void>;
  createPlan(plan: Omit<Plan, 'id'>): Promise<Plan>;
  getPlan(id: string): Promise<Plan | null>;
  addTask(planId: string, task: Omit<Task, 'id'>): Promise<Task>;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  status: 'draft' | 'active' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  steps: Step[];
  metadata: Record<string, unknown>;
}
```

### VerificationStore

```typescript
interface VerificationStore {
  open(): Promise<void>;
  close(): Promise<void>;
  createVerification(verification: Omit<Verification, 'id'>): Promise<Verification>;
  getVerification(id: string): Promise<Verification | null>;
  addAssertion(verificationId: string, assertion: Omit<Assertion, 'id'>): Promise<Assertion>;
  runVerification(id: string): Promise<{ passed: number; failed: number }>;
}

interface Verification {
  id: string;
  name: string;
  description: string;
  assertions: Assertion[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

interface Assertion {
  id: string;
  type: string;
  target: string;
  operator: string;
  expected: unknown;
  metadata: Record<string, unknown>;
}
```

### ToolExecutionStore

```typescript
interface ToolExecutionStore {
  open(): Promise<void>;
  close(): Promise<void>;
  registerTool(tool: Omit<Tool, 'id'>): Promise<Tool>;
  execute(toolId: string, input: unknown): Promise<ToolExecution>;
}

interface Tool {
  id: string;
  name: string;
  type: 'function' | 'api' | 'script' | 'custom';
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface ToolExecution {
  id: string;
  toolId: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}
```

### WorkflowStore

```typescript
interface WorkflowStore {
  open(): Promise<void>;
  close(): Promise<void>;
  createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow>;
  getWorkflow(id: string): Promise<Workflow | null>;
  startRun(workflowId: string): Promise<WorkflowRun>;
  getRun(id: string): Promise<WorkflowRun | null>;
  executeStep(runId: string, stepId: string): Promise<unknown>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  stepsExecuted: string[];
  metadata: Record<string, unknown>;
}
```

### MultiAgentStore

```typescript
interface MultiAgentStore {
  open(): Promise<void>;
  close(): Promise<void>;
  registerAgent(agent: Omit<Agent, 'id'>): Promise<Agent>;
  getAgent(id: string): Promise<Agent | null>;
  createSession(agentIds: string[]): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  sendMessage(message: Omit<Message, 'id'>): Promise<Message>;
}

interface Agent {
  id: string;
  name: string;
  type: 'llm' | 'tool' | 'hybrid' | 'custom';
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline' | 'error';
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface Session {
  id: string;
  agents: string[];
  messages: Message[];
  status: 'active' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

interface Message {
  id: string;
  sessionId: string;
  from: string;
  to: string;
  content: unknown;
  type: 'request' | 'response' | 'notification' | 'error';
  metadata: Record<string, unknown>;
}
```

### SchedulingStore

```typescript
interface SchedulingStore {
  open(): Promise<void>;
  close(): Promise<void>;
  createSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule>;
  getSchedule(id: string): Promise<Schedule | null>;
  addJob(scheduleId: string, job: Omit<Job, 'id'>): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
}

interface Schedule {
  id: string;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
}

interface Job {
  id: string;
  scheduleId: string;
  name: string;
  type: 'once' | 'recurring' | 'interval';
  config: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}
```

### ObservabilityStore

```typescript
interface ObservabilityStore {
  open(): Promise<void>;
  close(): Promise<void>;
  log(entry: Omit<LogEntry, 'id'>): Promise<LogEntry>;
  queryLogs(query: any): Promise<LogEntry[]>;
  recordMetric(metric: Omit<Metric, 'id'>): Promise<Metric>;
  queryMetrics(query: any): Promise<Metric[]>;
  startTrace(name: string): Promise<Trace>;
  startSpan(traceId: string, name: string): Promise<Span>;
  getTrace(id: string): Promise<Trace | null>;
}

interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  context: Record<string, unknown>;
}

interface Metric {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
}

interface Trace {
  id: string;
  name: string;
  spans: Span[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'error';
  metadata: Record<string, unknown>;
}

interface Span {
  id: string;
  traceId: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'unspecified' | 'ok' | 'error';
  metadata: Record<string, unknown>;
}
```

## Factory Functions

```typescript
// Memory
createInMemoryStore(): MemoryStore

// Knowledge
createKnowledgeStore(): KnowledgeStore

// Planning
createPlanningStore(): PlanningStore

// Verification
createVerificationStore(): VerificationStore

// Tool Execution
createToolExecutionStore(): ToolExecutionStore

// Workflows
createWorkflowStore(): WorkflowStore

// Multi-Agent
createMultiAgentStore(): MultiAgentStore

// Scheduling
createSchedulingStore(): SchedulingStore

// Observability
createObservabilityStore(): ObservabilityStore
```

## Adapters

```typescript
// OpenAI
createOpenAIAdapter(config?: OpenAIAdapterConfig): OpenAIAdapter

// Anthropic
createAnthropicAdapter(config?: AnthropicAdapterConfig): AnthropicAdapter

// Groq
createGroqAdapter(config?: GroqAdapterConfig): GroqAdapter

// Ollama
createOllamaAdapter(config?: OllamaAdapterConfig): OllamaAdapter

// LM Studio
createLMStudioAdapter(config?: LMStudioAdapterConfig): LMStudioAdapter

// OpenRouter
createOpenRouterAdapter(config?: OpenRouterAdapterConfig): OpenRouterAdapter

// Gemini
createGeminiAdapter(config?: GeminiAdapterConfig): GeminiAdapter
```

## Memory Backends

```typescript
// File
createFileMemoryStore(basePath?: string): FileMemoryStore

// SQLite
createSQLiteMemoryStore(config?: SQLiteMemoryConfig): SQLiteMemoryStore

// Postgres
createPostgresMemoryStore(config?: PostgresMemoryConfig): PostgresMemoryStore

// Redis
createRedisMemoryStore(config?: RedisMemoryConfig): RedisMemoryStore
```

## Bridge (Open Code Integration)

```typescript
// OpenCode types (what OpenCode provides to hooks)
type OpenCodeToolExecuteBeforeInput = { ... };
type OpenCodeToolExecuteAfterInput = { ... };
type OpenCodePermissionAskInput = { ... };
type OpenCodeChatMessageInput = { ... };
type OpenCodeSystemTransformInput = { ... };
type OpenCodeSessionCompactingInput = { ... };

// Kernel types (what the Governance Kernel consumes)
type GovernanceEventType = '...' ;
type GovernanceEvent = { ... };
type GovernanceDecision = { ... };

// Bridge (maps OpenCode events → Kernel events)
class OpenCodeBridge {
  translateToolBefore(input: OpenCodeToolExecuteBeforeInput): GovernanceEvent;
  translateToolAfter(input: OpenCodeToolExecuteAfterInput): GovernanceEvent;
  translatePermission(input: OpenCodePermissionAskInput): GovernanceEvent;
  translateMessage(input: OpenCodeChatMessageInput): GovernanceEvent;
  translateSystemTransform(input: OpenCodeSystemTransformInput): GovernanceEvent;
  translateCompaction(input: OpenCodeSessionCompactingInput): GovernanceEvent;
}

// Factory
createOpenCodeBridge(): OpenCodeBridge;
createOpenCodePlugin(bridge?: OpenCodeBridge): OpenCodePluginContext;
```

---

*Frozen: 2026-08-05. This API is stable for v1.0.0. See `CHANGELOG.md` for future changes.*
