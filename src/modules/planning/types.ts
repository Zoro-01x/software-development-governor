/**
 * Planning Module — Contract Interfaces
 * 
 * Task decomposition and scheduling.
 * Depends on Knowledge Module for context.
 */

// ============================================================================
// Core Types
// ============================================================================

export type PlanId = string;
export type TaskId = string;
export type StepId = string;

// ============================================================================
// Task
// ============================================================================

export interface Task {
  id: TaskId;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: TaskId[];
  steps: Step[];
  result?: unknown;
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Step
// ============================================================================

export interface Step {
  id: StepId;
  name: string;
  type: StepType;
  status: StepStatus;
  input: unknown;
  output?: unknown;
  error?: string;
  metadata: Record<string, unknown>;
}

export type StepType = 'action' | 'decision' | 'parallel' | 'condition';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// ============================================================================
// Plan
// ============================================================================

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  tasks: Task[];
  status: PlanStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PlanStatus = 'draft' | 'active' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// Query Types
// ============================================================================

export interface TaskQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  name?: string;
}

export interface PlanQuery {
  status?: PlanStatus;
  name?: string;
}

// ============================================================================
// Planning Store Interface
// ============================================================================

export interface PlanningStore {
  // Plans
  createPlan(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan>;
  getPlan(id: PlanId): Promise<Plan | null>;
  updatePlan(id: PlanId, updates: Partial<Plan>): Promise<Plan>;
  deletePlan(id: PlanId): Promise<void>;
  queryPlans(query: PlanQuery): Promise<Plan[]>;
  
  // Tasks
  addTask(planId: PlanId, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  getTask(id: TaskId): Promise<Task | null>;
  updateTask(id: TaskId, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: TaskId): Promise<void>;
  queryTasks(query: TaskQuery): Promise<Task[]>;
  
  // Execution
  startTask(id: TaskId): Promise<void>;
  completeTask(id: TaskId, result: unknown): Promise<void>;
  failTask(id: TaskId, error: string): Promise<void>;
  cancelTask(id: TaskId): Promise<void>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Planning Module Interface
// ============================================================================

export interface PlanningModule extends PlanningStore {
  // Statistics
  getStats(): Promise<PlanningStats>;
  
  // Health
  isHealthy(): Promise<boolean>;
}

export interface PlanningStats {
  totalPlans: number;
  totalTasks: number;
  activePlans: number;
  activeTasks: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class PlanningError extends Error {
  constructor(
    code: PlanningErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PlanningError';
    this.code = code;
  }
  
  public readonly code: PlanningErrorCode;
}

export type PlanningErrorCode =
  | 'PLAN_NOT_FOUND'
  | 'TASK_NOT_FOUND'
  | 'INVALID_STATUS'
  | 'DEPENDENCY_FAILED'
  | 'STORE_CLOSED';
