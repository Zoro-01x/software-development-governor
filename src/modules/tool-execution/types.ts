/**
 * Tool Execution Module — Contract Interfaces
 * 
 * External tool integration.
 * Depends on Verification Module for result validation.
 */

// ============================================================================
// Core Types
// ============================================================================

export type ToolId = string;
export type ExecutionId = string;

// ============================================================================
// Tool
// ============================================================================

export interface Tool {
  id: ToolId;
  name: string;
  description: string;
  type: ToolType;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type ToolType = 'function' | 'api' | 'script' | 'custom';

// ============================================================================
// Tool Execution
// ============================================================================

export interface ToolExecution {
  id: ExecutionId;
  toolId: ToolId;
  input: unknown;
  output?: unknown;
  status: ExecutionStatus;
  error?: string;
  duration?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// Query Types
// ============================================================================

export interface ToolQuery {
  type?: ToolType;
  name?: string;
}

export interface ExecutionQuery {
  toolId?: ToolId;
  status?: ExecutionStatus;
}

// ============================================================================
// Tool Execution Store Interface
// ============================================================================

export interface ToolExecutionStore {
  // Tools
  registerTool(tool: Omit<Tool, 'id' | 'createdAt'>): Promise<Tool>;
  getTool(id: ToolId): Promise<Tool | null>;
  unregisterTool(id: ToolId): Promise<void>;
  queryTools(query: ToolQuery): Promise<Tool[]>;
  
  // Executions
  execute(toolId: ToolId, input: unknown): Promise<ToolExecution>;
  getExecution(id: ExecutionId): Promise<ToolExecution | null>;
  cancelExecution(id: ExecutionId): Promise<void>;
  queryExecutions(query: ExecutionQuery): Promise<ToolExecution[]>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Tool Execution Module Interface
// ============================================================================

export interface ToolExecutionModule extends ToolExecutionStore {
  // Statistics
  getStats(): Promise<ToolExecutionStats>;
  
  // Health
  isHealthy(): Promise<boolean>;
}

export interface ToolExecutionStats {
  totalTools: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class ToolExecutionError extends Error {
  constructor(
    code: ToolExecutionErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ToolExecutionError';
    this.code = code;
  }
  
  public readonly code: ToolExecutionErrorCode;
}

export type ToolExecutionErrorCode =
  | 'TOOL_NOT_FOUND'
  | 'EXECUTION_NOT_FOUND'
  | 'EXECUTION_FAILED'
  | 'INVALID_INPUT'
  | 'STORE_CLOSED';
