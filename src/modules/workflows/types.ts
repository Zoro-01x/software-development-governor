/**
 * Workflows Module — Contract Interfaces
 * 
 * Multi-step orchestration.
 * Depends on Tool Execution Module for tool calls.
 */

// ============================================================================
// Core Types
// ============================================================================

export type WorkflowId = string;
export type WorkflowStepId = string;
export type WorkflowRunId = string;

// ============================================================================
// Workflow Step
// ============================================================================

export interface WorkflowStep {
  id: WorkflowStepId;
  name: string;
  type: WorkflowStepType;
  config: Record<string, unknown>;
  next?: WorkflowStepId;
  onError?: WorkflowStepId;
  metadata: Record<string, unknown>;
}

export type WorkflowStepType = 'action' | 'condition' | 'parallel' | 'loop' | 'delay';

// ============================================================================
// Workflow
// ============================================================================

export interface Workflow {
  id: WorkflowId;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';

// ============================================================================
// Workflow Run
// ============================================================================

export interface WorkflowRun {
  id: WorkflowRunId;
  workflowId: WorkflowId;
  status: RunStatus;
  currentStep?: WorkflowStepId;
  context: Record<string, unknown>;
  result?: unknown;
  error?: string;
  stepsExecuted: WorkflowStepId[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// Query Types
// ============================================================================

export interface WorkflowQuery {
  status?: WorkflowStatus;
  name?: string;
}

export interface RunQuery {
  workflowId?: WorkflowId;
  status?: RunStatus;
}

// ============================================================================
// Workflow Store Interface
// ============================================================================

export interface WorkflowStore {
  // Workflows
  createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow>;
  getWorkflow(id: WorkflowId): Promise<Workflow | null>;
  updateWorkflow(id: WorkflowId, updates: Partial<Workflow>): Promise<Workflow>;
  deleteWorkflow(id: WorkflowId): Promise<void>;
  queryWorkflows(query: WorkflowQuery): Promise<Workflow[]>;
  
  // Runs
  startRun(workflowId: WorkflowId, context?: Record<string, unknown>): Promise<WorkflowRun>;
  getRun(id: WorkflowRunId): Promise<WorkflowRun | null>;
  cancelRun(id: WorkflowRunId): Promise<void>;
  queryRuns(query: RunQuery): Promise<WorkflowRun[]>;
  
  // Execution
  executeStep(runId: WorkflowRunId, stepId: WorkflowStepId): Promise<unknown>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Workflow Module Interface
// ============================================================================

export interface WorkflowModule extends WorkflowStore {
  // Statistics
  getStats(): Promise<WorkflowStats>;
  
  // Health
  isHealthy(): Promise<boolean>;
}

export interface WorkflowStats {
  totalWorkflows: number;
  totalRuns: number;
  activeRuns: number;
  completedRuns: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class WorkflowError extends Error {
  constructor(
    code: WorkflowErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
  }
  
  public readonly code: WorkflowErrorCode;
}

export type WorkflowErrorCode =
  | 'WORKFLOW_NOT_FOUND'
  | 'RUN_NOT_FOUND'
  | 'STEP_NOT_FOUND'
  | 'INVALID_STATUS'
  | 'EXECUTION_FAILED'
  | 'STORE_CLOSED';
