/**
 * @framework/core
 * 
 * Core interfaces and types for the Governance Framework.
 */

// ============================================================================
// Reasoning Interfaces
// ============================================================================

export interface ReasoningInput {
  requirements: string;
  projectName?: string;
  context?: Record<string, unknown>;
}

export interface ReasoningResult {
  design: any;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface ReasoningProvider {
  name: string;
  reason(input: ReasoningInput): Promise<ReasoningResult>;
}

// ============================================================================
// Memory Interfaces
// ============================================================================

export interface MemoryEntry {
  key: string;
  value: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryQuery {
  limit?: number;
  offset?: number;
  pattern?: string;
}

export interface MemoryStore {
  open(): Promise<void>;
  close(): Promise<void>;
  put(key: string, value: unknown): Promise<void>;
  get(key: string): Promise<unknown | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  query(query: MemoryQuery): Promise<{ keys: string[]; total: number; hasMore: boolean }>;
}

// ============================================================================
// Knowledge Interfaces
// ============================================================================

export interface Entity {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  facts: Fact[];
  relations: Relation[];
}

export interface Fact {
  id: string;
  subject: string;
  predicate: string;
  object: { type: string; value: unknown };
  confidence: number;
  source: string;
  metadata: Record<string, unknown>;
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface KnowledgeStore {
  open(): Promise<void>;
  close(): Promise<void>;
  addEntity(entity: Omit<Entity, 'id'>): Promise<Entity>;
  getEntity(id: string): Promise<Entity | null>;
  addFact(fact: Omit<Fact, 'id'>): Promise<Fact>;
  queryFacts(query: any): Promise<Fact[]>;
}

// ============================================================================
// Planning Interfaces
// ============================================================================

export interface Plan {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  status: 'draft' | 'active' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  steps: Step[];
  metadata: Record<string, unknown>;
}

export interface Step {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface PlanningStore {
  open(): Promise<void>;
  close(): Promise<void>;
  createPlan(plan: Omit<Plan, 'id'>): Promise<Plan>;
  getPlan(id: string): Promise<Plan | null>;
  addTask(planId: string, task: Omit<Task, 'id'>): Promise<Task>;
}

// ============================================================================
// Verification Interfaces
// ============================================================================

export interface Verification {
  id: string;
  name: string;
  description: string;
  assertions: Assertion[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

export interface Assertion {
  id: string;
  type: string;
  target: string;
  operator: string;
  expected: unknown;
  metadata: Record<string, unknown>;
}

export interface VerificationStore {
  open(): Promise<void>;
  close(): Promise<void>;
  createVerification(verification: Omit<Verification, 'id'>): Promise<Verification>;
  getVerification(id: string): Promise<Verification | null>;
  addAssertion(verificationId: string, assertion: Omit<Assertion, 'id'>): Promise<Assertion>;
  runVerification(id: string): Promise<{ passed: number; failed: number }>;
}

// ============================================================================
// Tool Execution Interfaces
// ============================================================================

export interface Tool {
  id: string;
  name: string;
  type: 'function' | 'api' | 'script' | 'custom';
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ToolExecution {
  id: string;
  toolId: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

export interface ToolExecutionStore {
  open(): Promise<void>;
  close(): Promise<void>;
  registerTool(tool: Omit<Tool, 'id'>): Promise<Tool>;
  execute(toolId: string, input: unknown): Promise<ToolExecution>;
}

// ============================================================================
// Workflow Interfaces
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  next?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  stepsExecuted: string[];
  metadata: Record<string, unknown>;
}

export interface WorkflowStore {
  open(): Promise<void>;
  close(): Promise<void>;
  createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow>;
  getWorkflow(id: string): Promise<Workflow | null>;
  startRun(workflowId: string): Promise<WorkflowRun>;
  getRun(id: string): Promise<WorkflowRun | null>;
  executeStep(runId: string, stepId: string): Promise<unknown>;
}

// ============================================================================
// Multi-Agent Interfaces
// ============================================================================

export interface Agent {
  id: string;
  name: string;
  type: 'llm' | 'tool' | 'hybrid' | 'custom';
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline' | 'error';
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Session {
  id: string;
  agents: string[];
  messages: Message[];
  status: 'active' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  sessionId: string;
  from: string;
  to: string;
  content: unknown;
  type: 'request' | 'response' | 'notification' | 'error';
  metadata: Record<string, unknown>;
}

export interface MultiAgentStore {
  open(): Promise<void>;
  close(): Promise<void>;
  registerAgent(agent: Omit<Agent, 'id'>): Promise<Agent>;
  getAgent(id: string): Promise<Agent | null>;
  createSession(agentIds: string[]): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  sendMessage(message: Omit<Message, 'id'>): Promise<Message>;
}

// ============================================================================
// Scheduling Interfaces
// ============================================================================

export interface Schedule {
  id: string;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
}

export interface Job {
  id: string;
  scheduleId: string;
  name: string;
  type: 'once' | 'recurring' | 'interval';
  config: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

export interface SchedulingStore {
  open(): Promise<void>;
  close(): Promise<void>;
  createSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule>;
  getSchedule(id: string): Promise<Schedule | null>;
  addJob(scheduleId: string, job: Omit<Job, 'id'>): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
}

// ============================================================================
// Observability Interfaces
// ============================================================================

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  context: Record<string, unknown>;
}

export interface Metric {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
}

export interface Trace {
  id: string;
  name: string;
  spans: Span[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'error';
  metadata: Record<string, unknown>;
}

export interface Span {
  id: string;
  traceId: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'unspecified' | 'ok' | 'error';
  metadata: Record<string, unknown>;
}

export interface ObservabilityStore {
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
