/**
 * In-Memory Workflows Store Implementation
 */

import {
  WorkflowStore,
  WorkflowModule,
  WorkflowError,
  WorkflowStats,
  Workflow,
  WorkflowStep,
  WorkflowRun,
  WorkflowStatus,
  RunStatus,
  WorkflowQuery,
  RunQuery,
  WorkflowId,
  WorkflowRunId,
  WorkflowStepId,
} from './types.js';

export class InMemoryWorkflowStore implements WorkflowModule {
  private workflows = new Map<WorkflowId, Workflow>();
  private runs = new Map<WorkflowRunId, WorkflowRun>();
  
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  // ========================================================================
  // Workflows
  // ========================================================================
  
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newWorkflow: Workflow = {
      ...workflow,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.workflows.set(id, newWorkflow);
    return newWorkflow;
  }
  
  async getWorkflow(id: WorkflowId): Promise<Workflow | null> {
    this._ensureOpen();
    return this.workflows.get(id) || null;
  }
  
  async updateWorkflow(id: WorkflowId, updates: Partial<Workflow>): Promise<Workflow> {
    this._ensureOpen();
    
    const existing = this.workflows.get(id);
    if (!existing) {
      throw new WorkflowError('WORKFLOW_NOT_FOUND', `Workflow not found: "${id}"`);
    }
    
    const updated: Workflow = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.workflows.set(id, updated);
    return updated;
  }
  
  async deleteWorkflow(id: WorkflowId): Promise<void> {
    this._ensureOpen();
    this.workflows.delete(id);
  }
  
  async queryWorkflows(query: WorkflowQuery): Promise<Workflow[]> {
    this._ensureOpen();
    
    let results = Array.from(this.workflows.values());
    
    if (query.status) {
      results = results.filter(w => w.status === query.status);
    }
    if (query.name) {
      results = results.filter(w => w.name.includes(query.name!));
    }
    
    return results;
  }
  
  // ========================================================================
  // Runs
  // ========================================================================
  
  async startRun(workflowId: WorkflowId, context: Record<string, unknown> = {}): Promise<WorkflowRun> {
    this._ensureOpen();
    
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new WorkflowError('WORKFLOW_NOT_FOUND', `Workflow not found: "${workflowId}"`);
    }
    
    if (workflow.steps.length === 0) {
      throw new WorkflowError('EXECUTION_FAILED', 'Workflow has no steps');
    }
    
    const id = this.generateId();
    const now = new Date();
    
    const run: WorkflowRun = {
      id,
      workflowId,
      status: 'running',
      currentStep: workflow.steps[0].id,
      context,
      stepsExecuted: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    
    this.runs.set(id, run);
    return run;
  }
  
  async getRun(id: WorkflowRunId): Promise<WorkflowRun | null> {
    this._ensureOpen();
    return this.runs.get(id) || null;
  }
  
  async cancelRun(id: WorkflowRunId): Promise<void> {
    this._ensureOpen();
    
    const run = this.runs.get(id);
    if (!run) {
      throw new WorkflowError('RUN_NOT_FOUND', `Run not found: "${id}"`);
    }
    
    if (run.status === 'completed' || run.status === 'failed') {
      throw new WorkflowError('INVALID_STATUS', `Cannot cancel ${run.status} run`);
    }
    
    run.status = 'cancelled';
    run.updatedAt = new Date();
  }
  
  async queryRuns(query: RunQuery): Promise<WorkflowRun[]> {
    this._ensureOpen();
    
    let results = Array.from(this.runs.values());
    
    if (query.workflowId) {
      results = results.filter(r => r.workflowId === query.workflowId);
    }
    if (query.status) {
      results = results.filter(r => r.status === query.status);
    }
    
    return results;
  }
  
  // ========================================================================
  // Execution
  // ========================================================================
  
  async executeStep(runId: WorkflowRunId, stepId: WorkflowStepId): Promise<unknown> {
    this._ensureOpen();
    
    const run = this.runs.get(runId);
    if (!run) {
      throw new WorkflowError('RUN_NOT_FOUND', `Run not found: "${runId}"`);
    }
    
    if (run.status !== 'running') {
      throw new WorkflowError('INVALID_STATUS', `Run is ${run.status}, expected running`);
    }
    
    const workflow = this.workflows.get(run.workflowId);
    if (!workflow) {
      throw new WorkflowError('WORKFLOW_NOT_FOUND', `Workflow not found: "${run.workflowId}"`);
    }
    
    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new WorkflowError('STEP_NOT_FOUND', `Step not found: "${stepId}"`);
    }
    
    // Execute the step (simplified)
    run.stepsExecuted.push(stepId);
    run.updatedAt = new Date();
    
    // Move to next step or complete
    if (step.next) {
      run.currentStep = step.next;
    } else {
      run.status = 'completed';
      run.currentStep = undefined;
    }
    
    return { stepId, executed: true };
  }
  
  // ========================================================================
  // Stats & Health
  // ========================================================================
  
  async getStats(): Promise<WorkflowStats> {
    const runs = Array.from(this.runs.values());
    
    return {
      totalWorkflows: this.workflows.size,
      totalRuns: runs.length,
      activeRuns: runs.filter(r => r.status === 'running').length,
      completedRuns: runs.filter(r => r.status === 'completed').length,
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
      throw new WorkflowError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createWorkflowStore(): InMemoryWorkflowStore {
  return new InMemoryWorkflowStore();
}
