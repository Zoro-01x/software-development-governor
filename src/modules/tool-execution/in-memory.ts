/**
 * In-Memory Tool Execution Store Implementation
 */

import {
  ToolExecutionStore,
  ToolExecutionModule,
  ToolExecutionError,
  ToolExecutionStats,
  Tool,
  ToolExecution,
  ToolType,
  ExecutionStatus,
  ToolQuery,
  ExecutionQuery,
  ToolId,
  ExecutionId,
} from './types.js';

export class InMemoryToolExecutionStore implements ToolExecutionModule {
  private tools = new Map<ToolId, Tool>();
  private executions = new Map<ExecutionId, ToolExecution>();
  
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  // ========================================================================
  // Tools
  // ========================================================================
  
  async registerTool(tool: Omit<Tool, 'id' | 'createdAt'>): Promise<Tool> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newTool: Tool = {
      ...tool,
      id,
      createdAt: now,
    };
    
    this.tools.set(id, newTool);
    return newTool;
  }
  
  async getTool(id: ToolId): Promise<Tool | null> {
    this._ensureOpen();
    return this.tools.get(id) || null;
  }
  
  async unregisterTool(id: ToolId): Promise<void> {
    this._ensureOpen();
    this.tools.delete(id);
  }
  
  async queryTools(query: ToolQuery): Promise<Tool[]> {
    this._ensureOpen();
    
    let results = Array.from(this.tools.values());
    
    if (query.type) {
      results = results.filter(t => t.type === query.type);
    }
    if (query.name) {
      results = results.filter(t => t.name.includes(query.name!));
    }
    
    return results;
  }
  
  // ========================================================================
  // Executions
  // ========================================================================
  
  async execute(toolId: ToolId, input: unknown): Promise<ToolExecution> {
    this._ensureOpen();
    
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new ToolExecutionError('TOOL_NOT_FOUND', `Tool not found: "${toolId}"`);
    }
    
    const id = this.generateId();
    const now = new Date();
    
    const execution: ToolExecution = {
      id,
      toolId,
      input,
      status: 'pending',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    
    this.executions.set(id, execution);
    
    // Simulate execution
    execution.status = 'running';
    execution.updatedAt = new Date();
    
    // In a real implementation, this would call the actual tool
    // For now, we just simulate completion
    execution.status = 'completed';
    execution.output = { result: 'executed' };
    execution.duration = 0;
    execution.updatedAt = new Date();
    
    return execution;
  }
  
  async getExecution(id: ExecutionId): Promise<ToolExecution | null> {
    this._ensureOpen();
    return this.executions.get(id) || null;
  }
  
  async cancelExecution(id: ExecutionId): Promise<void> {
    this._ensureOpen();
    
    const execution = this.executions.get(id);
    if (!execution) {
      throw new ToolExecutionError('EXECUTION_NOT_FOUND', `Execution not found: "${id}"`);
    }
    
    if (execution.status === 'completed' || execution.status === 'failed') {
      throw new ToolExecutionError('EXECUTION_FAILED', `Cannot cancel ${execution.status} execution`);
    }
    
    execution.status = 'cancelled';
    execution.updatedAt = new Date();
  }
  
  async queryExecutions(query: ExecutionQuery): Promise<ToolExecution[]> {
    this._ensureOpen();
    
    let results = Array.from(this.executions.values());
    
    if (query.toolId) {
      results = results.filter(e => e.toolId === query.toolId);
    }
    if (query.status) {
      results = results.filter(e => e.status === query.status);
    }
    
    return results;
  }
  
  // ========================================================================
  // Stats & Health
  // ========================================================================
  
  async getStats(): Promise<ToolExecutionStats> {
    const executions = Array.from(this.executions.values());
    
    return {
      totalTools: this.tools.size,
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(e => e.status === 'completed').length,
      failedExecutions: executions.filter(e => e.status === 'failed').length,
    };
  }
  
  async isHealthy(): Promise<boolean> {
    return this._status === 'open';
  }
  
  // ========================================================================
  // Private Helpers
  // ========================================================================
  
  private _ensureOpen(): void {
    if (this._status !== 'open') {
      throw new ToolExecutionError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createToolExecutionStore(): InMemoryToolExecutionStore {
  return new InMemoryToolExecutionStore();
}
