/**
 * In-Memory Planning Store Implementation
 */

import {
  PlanningStore,
  PlanningModule,
  PlanningError,
  PlanningStats,
  Plan,
  Task,
  Step,
  PlanStatus,
  TaskStatus,
  TaskPriority,
  TaskQuery,
  PlanQuery,
  PlanId,
  TaskId,
} from './types.js';

export class InMemoryPlanningStore implements PlanningModule {
  private plans = new Map<PlanId, Plan>();
  private tasks = new Map<TaskId, Task>();
  
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  // ========================================================================
  // Plans
  // ========================================================================
  
  async createPlan(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newPlan: Plan = {
      ...plan,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.plans.set(id, newPlan);
    return newPlan;
  }
  
  async getPlan(id: PlanId): Promise<Plan | null> {
    this._ensureOpen();
    return this.plans.get(id) || null;
  }
  
  async updatePlan(id: PlanId, updates: Partial<Plan>): Promise<Plan> {
    this._ensureOpen();
    
    const existing = this.plans.get(id);
    if (!existing) {
      throw new PlanningError('PLAN_NOT_FOUND', `Plan not found: "${id}"`);
    }
    
    const updated: Plan = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.plans.set(id, updated);
    return updated;
  }
  
  async deletePlan(id: PlanId): Promise<void> {
    this._ensureOpen();
    
    const plan = this.plans.get(id);
    if (!plan) {
      return;
    }
    
    // Delete all tasks in the plan
    for (const task of plan.tasks) {
      this.tasks.delete(task.id);
    }
    
    this.plans.delete(id);
  }
  
  async queryPlans(query: PlanQuery): Promise<Plan[]> {
    this._ensureOpen();
    
    let results = Array.from(this.plans.values());
    
    if (query.status) {
      results = results.filter(p => p.status === query.status);
    }
    if (query.name) {
      results = results.filter(p => p.name.includes(query.name!));
    }
    
    return results;
  }
  
  // ========================================================================
  // Tasks
  // ========================================================================
  
  async addTask(planId: PlanId, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    this._ensureOpen();
    
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new PlanningError('PLAN_NOT_FOUND', `Plan not found: "${planId}"`);
    }
    
    const id = this.generateId();
    const now = new Date();
    
    const newTask: Task = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.tasks.set(id, newTask);
    plan.tasks.push(newTask);
    
    return newTask;
  }
  
  async getTask(id: TaskId): Promise<Task | null> {
    this._ensureOpen();
    return this.tasks.get(id) || null;
  }
  
  async updateTask(id: TaskId, updates: Partial<Task>): Promise<Task> {
    this._ensureOpen();
    
    const existing = this.tasks.get(id);
    if (!existing) {
      throw new PlanningError('TASK_NOT_FOUND', `Task not found: "${id}"`);
    }
    
    const updated: Task = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.tasks.set(id, updated);
    return updated;
  }
  
  async deleteTask(id: TaskId): Promise<void> {
    this._ensureOpen();
    
    const task = this.tasks.get(id);
    if (!task) {
      return;
    }
    
    this.tasks.delete(id);
  }
  
  async queryTasks(query: TaskQuery): Promise<Task[]> {
    this._ensureOpen();
    
    let results = Array.from(this.tasks.values());
    
    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }
    if (query.priority) {
      results = results.filter(t => t.priority === query.priority);
    }
    if (query.name) {
      results = results.filter(t => t.name.includes(query.name!));
    }
    
    return results;
  }
  
  // ========================================================================
  // Execution
  // ========================================================================
  
  async startTask(id: TaskId): Promise<void> {
    this._ensureOpen();
    
    const task = this.tasks.get(id);
    if (!task) {
      throw new PlanningError('TASK_NOT_FOUND', `Task not found: "${id}"`);
    }
    
    if (task.status !== 'pending') {
      throw new PlanningError('INVALID_STATUS', `Task is ${task.status}, expected pending`);
    }
    
    // Check dependencies
    for (const depId of task.dependencies) {
      const dep = this.tasks.get(depId);
      if (dep && dep.status !== 'completed') {
        throw new PlanningError('DEPENDENCY_FAILED', `Dependency "${depId}" is ${dep.status}`);
      }
    }
    
    task.status = 'running';
    task.updatedAt = new Date();
  }
  
  async completeTask(id: TaskId, result: unknown): Promise<void> {
    this._ensureOpen();
    
    const task = this.tasks.get(id);
    if (!task) {
      throw new PlanningError('TASK_NOT_FOUND', `Task not found: "${id}"`);
    }
    
    if (task.status !== 'running') {
      throw new PlanningError('INVALID_STATUS', `Task is ${task.status}, expected running`);
    }
    
    task.status = 'completed';
    task.result = result;
    task.updatedAt = new Date();
  }
  
  async failTask(id: TaskId, error: string): Promise<void> {
    this._ensureOpen();
    
    const task = this.tasks.get(id);
    if (!task) {
      throw new PlanningError('TASK_NOT_FOUND', `Task not found: "${id}"`);
    }
    
    task.status = 'failed';
    task.error = error;
    task.updatedAt = new Date();
  }
  
  async cancelTask(id: TaskId): Promise<void> {
    this._ensureOpen();
    
    const task = this.tasks.get(id);
    if (!task) {
      throw new PlanningError('TASK_NOT_FOUND', `Task not found: "${id}"`);
    }
    
    if (task.status === 'completed') {
      throw new PlanningError('INVALID_STATUS', 'Cannot cancel completed task');
    }
    
    task.status = 'cancelled';
    task.updatedAt = new Date();
  }
  
  // ========================================================================
  // Stats & Health
  // ========================================================================
  
  async getStats(): Promise<PlanningStats> {
    const plans = Array.from(this.plans.values());
    const tasks = Array.from(this.tasks.values());
    
    return {
      totalPlans: plans.length,
      totalTasks: tasks.length,
      activePlans: plans.filter(p => p.status === 'active').length,
      activeTasks: tasks.filter(t => t.status === 'running').length,
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
      throw new PlanningError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createPlanningStore(): InMemoryPlanningStore {
  return new InMemoryPlanningStore();
}
