/**
 * Planning Module — Contract Verification Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryPlanningStore, createPlanningStore } from '../../../src/modules/planning/index.js';
import { PlanningError } from '../../../src/modules/planning/types.js';

describe('Planning Module Contract', () => {
  let store: InMemoryPlanningStore;
  
  beforeEach(async () => {
    store = createPlanningStore();
    await store.open();
  });
  
  afterEach(async () => {
    await store.close();
  });
  
  // ==========================================================================
  // Plans
  // ==========================================================================
  
  describe('Plans', () => {
    it('creates and gets a plan', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      
      const retrieved = await store.getPlan(plan.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Plan');
    });
    
    it('updates a plan', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      
      const updated = await store.updatePlan(plan.id, { status: 'active' });
      expect(updated.status).toBe('active');
    });
    
    it('deletes a plan', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      
      await store.deletePlan(plan.id);
      const retrieved = await store.getPlan(plan.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries plans by status', async () => {
      await store.createPlan({
        name: 'Plan 1',
        description: 'Test',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      
      await store.createPlan({
        name: 'Plan 2',
        description: 'Test',
        tasks: [],
        status: 'active',
        metadata: {},
      });
      
      const drafts = await store.queryPlans({ status: 'draft' });
      expect(drafts).toHaveLength(1);
      
      const active = await store.queryPlans({ status: 'active' });
      expect(active).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Tasks
  // ==========================================================================
  
  describe('Tasks', () => {
    it('adds and gets a task', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      
      const task = await store.addTask(plan.id, {
        name: 'Test Task',
        description: 'A test task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      const retrieved = await store.getTask(task.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Task');
    });
    
    it('updates a task', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      
      const task = await store.addTask(plan.id, {
        name: 'Test Task',
        description: 'A test task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      const updated = await store.updateTask(task.id, { priority: 'high' });
      expect(updated.priority).toBe('high');
    });
    
    it('deletes a task', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      
      const task = await store.addTask(plan.id, {
        name: 'Test Task',
        description: 'A test task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      await store.deleteTask(task.id);
      const retrieved = await store.getTask(task.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries tasks by status', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      
      await store.addTask(plan.id, {
        name: 'Task 1',
        description: 'Test',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      await store.addTask(plan.id, {
        name: 'Task 2',
        description: 'Test',
        status: 'completed',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      const pending = await store.queryTasks({ status: 'pending' });
      expect(pending).toHaveLength(1);
      
      const completed = await store.queryTasks({ status: 'completed' });
      expect(completed).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Execution
  // ==========================================================================
  
  describe('Execution', () => {
    it('starts a task', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'active',
        metadata: {},
      });
      
      const task = await store.addTask(plan.id, {
        name: 'Test Task',
        description: 'A test task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      await store.startTask(task.id);
      const updated = await store.getTask(task.id);
      expect(updated?.status).toBe('running');
    });
    
    it('completes a task', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'active',
        metadata: {},
      });
      
      const task = await store.addTask(plan.id, {
        name: 'Test Task',
        description: 'A test task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      await store.startTask(task.id);
      await store.completeTask(task.id, { result: 'done' });
      
      const updated = await store.getTask(task.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.result).toEqual({ result: 'done' });
    });
    
    it('fails a task', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'active',
        metadata: {},
      });
      
      const task = await store.addTask(plan.id, {
        name: 'Test Task',
        description: 'A test task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      await store.startTask(task.id);
      await store.failTask(task.id, 'Something went wrong');
      
      const updated = await store.getTask(task.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.error).toBe('Something went wrong');
    });
    
    it('cancels a task', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'active',
        metadata: {},
      });
      
      const task = await store.addTask(plan.id, {
        name: 'Test Task',
        description: 'A test task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      await store.cancelTask(task.id);
      const updated = await store.getTask(task.id);
      expect(updated?.status).toBe('cancelled');
    });
    
    it('rejects starting non-pending task', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'active',
        metadata: {},
      });
      
      const task = await store.addTask(plan.id, {
        name: 'Test Task',
        description: 'A test task',
        status: 'completed',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      await expect(store.startTask(task.id)).rejects.toThrow(PlanningError);
    });
    
    it('checks dependencies', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'active',
        metadata: {},
      });
      
      const task1 = await store.addTask(plan.id, {
        name: 'Task 1',
        description: 'First task',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      const task2 = await store.addTask(plan.id, {
        name: 'Task 2',
        description: 'Second task',
        status: 'pending',
        priority: 'medium',
        dependencies: [task1.id],
        steps: [],
        metadata: {},
      });
      
      // Try to start task2 before task1 completes
      await expect(store.startTask(task2.id)).rejects.toThrow(PlanningError);
      
      // Complete task1 first
      await store.startTask(task1.id);
      await store.completeTask(task1.id, null);
      
      // Now task2 can start
      await store.startTask(task2.id);
      const updated = await store.getTask(task2.id);
      expect(updated?.status).toBe('running');
    });
  });
  
  // ==========================================================================
  // Stats & Health
  // ==========================================================================
  
  describe('Stats & Health', () => {
    it('returns stats', async () => {
      const plan = await store.createPlan({
        name: 'Test Plan',
        description: 'A test plan',
        tasks: [],
        status: 'active',
        metadata: {},
      });
      
      await store.addTask(plan.id, {
        name: 'Task 1',
        description: 'Test',
        status: 'pending',
        priority: 'medium',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      const stats = await store.getStats();
      expect(stats.totalPlans).toBe(1);
      expect(stats.totalTasks).toBe(1);
      expect(stats.activePlans).toBe(1);
    });
    
    it('checks health', async () => {
      expect(await store.isHealthy()).toBe(true);
      await store.close();
      expect(await store.isHealthy()).toBe(false);
    });
  });
  
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  
  describe('Lifecycle', () => {
    it('rejects operations when closed', async () => {
      await store.close();
      await expect(store.createPlan({
        name: 'Test',
        description: 'Test',
        tasks: [],
        status: 'draft',
        metadata: {},
      })).rejects.toThrow(PlanningError);
    });
  });
});
