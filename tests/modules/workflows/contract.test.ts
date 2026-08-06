/**
 * Workflows Module — Contract Verification Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryWorkflowStore, createWorkflowStore } from '../../../src/modules/workflows/index.js';
import { WorkflowError } from '../../../src/modules/workflows/types.js';

describe('Workflows Module Contract', () => {
  let store: InMemoryWorkflowStore;
  
  beforeEach(async () => {
    store = createWorkflowStore();
    await store.open();
  });
  
  afterEach(async () => {
    await store.close();
  });
  
  // ==========================================================================
  // Workflows
  // ==========================================================================
  
  describe('Workflows', () => {
    it('creates and gets a workflow', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [],
        status: 'draft',
        metadata: {},
      });
      
      const retrieved = await store.getWorkflow(workflow.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Workflow');
    });
    
    it('updates a workflow', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [],
        status: 'draft',
        metadata: {},
      });
      
      const updated = await store.updateWorkflow(workflow.id, { status: 'active' });
      expect(updated.status).toBe('active');
    });
    
    it('deletes a workflow', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [],
        status: 'draft',
        metadata: {},
      });
      
      await store.deleteWorkflow(workflow.id);
      const retrieved = await store.getWorkflow(workflow.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries workflows by status', async () => {
      await store.createWorkflow({
        name: 'Workflow 1',
        description: 'Test',
        steps: [],
        status: 'draft',
        metadata: {},
      });
      
      await store.createWorkflow({
        name: 'Workflow 2',
        description: 'Test',
        steps: [],
        status: 'active',
        metadata: {},
      });
      
      const drafts = await store.queryWorkflows({ status: 'draft' });
      expect(drafts).toHaveLength(1);
      
      const active = await store.queryWorkflows({ status: 'active' });
      expect(active).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Runs
  // ==========================================================================
  
  describe('Runs', () => {
    it('starts a run', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            type: 'action',
            config: {},
            metadata: {},
          },
        ],
        status: 'active',
        metadata: {},
      });
      
      const run = await store.startRun(workflow.id);
      expect(run.status).toBe('running');
      expect(run.currentStep).toBe('step-1');
    });
    
    it('gets a run', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            type: 'action',
            config: {},
            metadata: {},
          },
        ],
        status: 'active',
        metadata: {},
      });
      
      const run = await store.startRun(workflow.id);
      const retrieved = await store.getRun(run.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(run.id);
    });
    
    it('cancels a run', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            type: 'action',
            config: {},
            metadata: {},
          },
        ],
        status: 'active',
        metadata: {},
      });
      
      const run = await store.startRun(workflow.id);
      await store.cancelRun(run.id);
      
      const retrieved = await store.getRun(run.id);
      expect(retrieved?.status).toBe('cancelled');
    });
    
    it('queries runs by workflow', async () => {
      const workflow1 = await store.createWorkflow({
        name: 'Workflow 1',
        description: 'Test',
        steps: [{ id: 'step-1', name: 'Step', type: 'action', config: {}, metadata: {} }],
        status: 'active',
        metadata: {},
      });
      
      const workflow2 = await store.createWorkflow({
        name: 'Workflow 2',
        description: 'Test',
        steps: [{ id: 'step-1', name: 'Step', type: 'action', config: {}, metadata: {} }],
        status: 'active',
        metadata: {},
      });
      
      await store.startRun(workflow1.id);
      await store.startRun(workflow2.id);
      
      const runs1 = await store.queryRuns({ workflowId: workflow1.id });
      expect(runs1).toHaveLength(1);
      
      const runs2 = await store.queryRuns({ workflowId: workflow2.id });
      expect(runs2).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Execution
  // ==========================================================================
  
  describe('Execution', () => {
    it('executes a step', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            type: 'action',
            config: {},
            metadata: {},
          },
        ],
        status: 'active',
        metadata: {},
      });
      
      const run = await store.startRun(workflow.id);
      const result = await store.executeStep(run.id, 'step-1');
      expect(result).toBeDefined();
      
      const updated = await store.getRun(run.id);
      expect(updated?.status).toBe('completed');
    });
    
    it('executes multi-step workflow', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: 'step-1',
            name: 'Step 1',
            type: 'action',
            config: {},
            next: 'step-2',
            metadata: {},
          },
          {
            id: 'step-2',
            name: 'Step 2',
            type: 'action',
            config: {},
            metadata: {},
          },
        ],
        status: 'active',
        metadata: {},
      });
      
      const run = await store.startRun(workflow.id);
      
      await store.executeStep(run.id, 'step-1');
      let updated = await store.getRun(run.id);
      expect(updated?.currentStep).toBe('step-2');
      expect(updated?.stepsExecuted).toContain('step-1');
      
      await store.executeStep(run.id, 'step-2');
      updated = await store.getRun(run.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.stepsExecuted).toContain('step-2');
    });
  });
  
  // ==========================================================================
  // Stats & Health
  // ==========================================================================
  
  describe('Stats & Health', () => {
    it('returns stats', async () => {
      const workflow = await store.createWorkflow({
        name: 'Test Workflow',
        description: 'Test',
        steps: [{ id: 'step-1', name: 'Step', type: 'action', config: {}, metadata: {} }],
        status: 'active',
        metadata: {},
      });
      
      await store.startRun(workflow.id);
      
      const stats = await store.getStats();
      expect(stats.totalWorkflows).toBe(1);
      expect(stats.totalRuns).toBe(1);
      expect(stats.activeRuns).toBe(1);
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
      await expect(store.createWorkflow({
        name: 'Test',
        description: 'Test',
        steps: [],
        status: 'draft',
        metadata: {},
      })).rejects.toThrow(WorkflowError);
    });
  });
});
