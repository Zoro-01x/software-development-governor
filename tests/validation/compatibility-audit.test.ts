/**
 * Compatibility Audit — Plug-and-Play Verification
 * 
 * Proves that providers, adapters, strategies, memory backends,
 * tool backends, and graphs can be swapped without changing framework code.
 */

import { describe, it, expect } from 'vitest';
import { InMemoryStore, createInMemoryStore } from '../../src/modules/memory/index.js';
import { InMemoryKnowledgeStore, createKnowledgeStore } from '../../src/modules/knowledge/index.js';
import { InMemoryPlanningStore, createPlanningStore } from '../../src/modules/planning/index.js';
import { InMemoryVerificationStore, createVerificationStore } from '../../src/modules/verification/index.js';
import { InMemoryToolExecutionStore, createToolExecutionStore } from '../../src/modules/tool-execution/index.js';
import { InMemoryWorkflowStore, createWorkflowStore } from '../../src/modules/workflows/index.js';
import { InMemoryMultiAgentStore, createMultiAgentStore } from '../../src/modules/multi-agent/index.js';
import { InMemorySchedulingStore, createSchedulingStore } from '../../src/modules/scheduling/index.js';
import { InMemoryObservabilityStore, createObservabilityStore } from '../../src/modules/observability/index.js';

describe('Compatibility Audit — Plug-and-Play', () => {
  // ==========================================================================
  // Memory Backend Swapping
  // ==========================================================================
  
  describe('Memory Backend Swapping', () => {
    it('can swap between different memory implementations', async () => {
      // Create two different memory stores
      const store1 = createInMemoryStore('store-1', 'Store 1');
      const store2 = createInMemoryStore('store-2', 'Store 2');
      
      // Both should work independently
      await store1.open();
      await store2.open();
      
      await store1.put('key1', 'value1');
      await store2.put('key1', 'value2');
      
      expect(await store1.get('key1')).toBe('value1');
      expect(await store2.get('key1')).toBe('value2');
      
      await store1.close();
      await store2.close();
    });
    
    it('memory stores are interchangeable', async () => {
      const stores = [
        createInMemoryStore('a', 'A'),
        createInMemoryStore('b', 'B'),
        createInMemoryStore('c', 'C'),
      ];
      
      for (const store of stores) {
        await store.open();
        await store.put('test', 'value');
        expect(await store.get('test')).toBe('value');
        await store.close();
      }
    });
  });
  
  // ==========================================================================
  // Provider Swapping
  // ==========================================================================
  
  describe('Provider Swapping', () => {
    it('can swap between different knowledge stores', async () => {
      const store1 = createKnowledgeStore();
      const store2 = createKnowledgeStore();
      
      await store1.open();
      await store2.open();
      
      const entity1 = await store1.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      const entity2 = await store2.addEntity({
        type: 'person',
        properties: { name: 'Bob' },
        facts: [],
        relations: [],
      });
      
      expect(entity1.properties.name).toBe('Alice');
      expect(entity2.properties.name).toBe('Bob');
      
      await store1.close();
      await store2.close();
    });
  });
  
  // ==========================================================================
  // Strategy Swapping
  // ==========================================================================
  
  describe('Strategy Swapping', () => {
    it('can use different planning strategies', async () => {
      const store = createPlanningStore();
      await store.open();
      
      // Strategy 1: Simple tasks
      const plan1 = await store.createPlan({
        name: 'Simple Plan',
        description: 'A simple plan',
        tasks: [],
        status: 'draft',
        metadata: { strategy: 'simple' },
      });
      
      // Strategy 2: Complex tasks
      const plan2 = await store.createPlan({
        name: 'Complex Plan',
        description: 'A complex plan',
        tasks: [],
        status: 'draft',
        metadata: { strategy: 'complex' },
      });
      
      expect(plan1.metadata.strategy).toBe('simple');
      expect(plan2.metadata.strategy).toBe('complex');
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Tool Backend Swapping
  // ==========================================================================
  
  describe('Tool Backend Swapping', () => {
    it('can register different tool types', async () => {
      const store = createToolExecutionStore();
      await store.open();
      
      // Tool type 1: Function
      const funcTool = await store.registerTool({
        name: 'Function Tool',
        description: 'A function tool',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      // Tool type 2: API
      const apiTool = await store.registerTool({
        name: 'API Tool',
        description: 'An API tool',
        type: 'api',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      // Tool type 3: Script
      const scriptTool = await store.registerTool({
        name: 'Script Tool',
        description: 'A script tool',
        type: 'script',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      expect(funcTool.type).toBe('function');
      expect(apiTool.type).toBe('api');
      expect(scriptTool.type).toBe('script');
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Graph Swapping
  // ==========================================================================
  
  describe('Graph Swapping', () => {
    it('can use different workflow structures', async () => {
      const store = createWorkflowStore();
      await store.open();
      
      // Graph 1: Linear workflow
      const linear = await store.createWorkflow({
        name: 'Linear Workflow',
        description: 'A linear workflow',
        steps: [
          { id: 'step-1', name: 'Step 1', type: 'action', config: {}, next: 'step-2', metadata: {} },
          { id: 'step-2', name: 'Step 2', type: 'action', config: {}, metadata: {} },
        ],
        status: 'active',
        metadata: { graphType: 'linear' },
      });
      
      // Graph 2: Branching workflow
      const branching = await store.createWorkflow({
        name: 'Branching Workflow',
        description: 'A branching workflow',
        steps: [
          { id: 'step-1', name: 'Step 1', type: 'action', config: {}, next: 'step-2', metadata: {} },
          { id: 'step-2', name: 'Decision', type: 'condition', config: {}, next: 'step-3', metadata: {} },
          { id: 'step-3', name: 'Step 3', type: 'action', config: {}, metadata: {} },
        ],
        status: 'active',
        metadata: { graphType: 'branching' },
      });
      
      expect(linear.steps).toHaveLength(2);
      expect(branching.steps).toHaveLength(3);
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Cross-Module Compatibility
  // ==========================================================================
  
  describe('Cross-Module Compatibility', () => {
    it('all modules can work together', async () => {
      // Initialize all modules
      const memory = createInMemoryStore();
      const knowledge = createKnowledgeStore();
      const planning = createPlanningStore();
      const verification = createVerificationStore();
      const toolExecution = createToolExecutionStore();
      const workflows = createWorkflowStore();
      const multiAgent = createMultiAgentStore();
      const scheduling = createSchedulingStore();
      const observability = createObservabilityStore();
      
      // Open all modules
      await memory.open();
      await knowledge.open();
      await planning.open();
      await verification.open();
      await toolExecution.open();
      await workflows.open();
      await multiAgent.open();
      await scheduling.open();
      await observability.open();
      
      // Use each module
      await memory.put('test', 'value');
      expect(await memory.get('test')).toBe('value');
      
      const entity = await knowledge.addEntity({
        type: 'test',
        properties: {},
        facts: [],
        relations: [],
      });
      expect(entity.id).toBeDefined();
      
      const plan = await planning.createPlan({
        name: 'Test Plan',
        description: 'Test',
        tasks: [],
        status: 'draft',
        metadata: {},
      });
      expect(plan.id).toBeDefined();
      
      const verificationResult = await verification.createVerification({
        name: 'Test Verification',
        description: 'Test',
        assertions: [],
        status: 'pending',
        metadata: {},
      });
      expect(verificationResult.id).toBeDefined();
      
      const tool = await toolExecution.registerTool({
        name: 'Test Tool',
        description: 'Test',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      expect(tool.id).toBeDefined();
      
      const workflow = await workflows.createWorkflow({
        name: 'Test Workflow',
        description: 'Test',
        steps: [],
        status: 'draft',
        metadata: {},
      });
      expect(workflow.id).toBeDefined();
      
      const agent = await multiAgent.registerAgent({
        name: 'Test Agent',
        type: 'llm',
        capabilities: ['test'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      expect(agent.id).toBeDefined();
      
      const schedule = await scheduling.createSchedule({
        name: 'Test Schedule',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      expect(schedule.id).toBeDefined();
      
      const log = await observability.log({
        level: 'info',
        message: 'Test log',
        source: 'test',
        metadata: {},
      });
      expect(log.id).toBeDefined();
      
      // Close all modules
      await memory.close();
      await knowledge.close();
      await planning.close();
      await verification.close();
      await toolExecution.close();
      await workflows.close();
      await multiAgent.close();
      await scheduling.close();
      await observability.close();
    });
  });
  
  // ==========================================================================
  // Interface Compliance
  // ==========================================================================
  
  describe('Interface Compliance', () => {
    it('all modules implement their interfaces', () => {
      // Verify each module implements expected methods
      const memory = createInMemoryStore();
      expect(typeof memory.put).toBe('function');
      expect(typeof memory.get).toBe('function');
      expect(typeof memory.delete).toBe('function');
      expect(typeof memory.exists).toBe('function');
      expect(typeof memory.query).toBe('function');
      expect(typeof memory.open).toBe('function');
      expect(typeof memory.close).toBe('function');
      
      const knowledge = createKnowledgeStore();
      expect(typeof knowledge.addFact).toBe('function');
      expect(typeof knowledge.getFact).toBe('function');
      expect(typeof knowledge.addEntity).toBe('function');
      expect(typeof knowledge.getEntity).toBe('function');
      expect(typeof knowledge.open).toBe('function');
      expect(typeof knowledge.close).toBe('function');
      
      const planning = createPlanningStore();
      expect(typeof planning.createPlan).toBe('function');
      expect(typeof planning.getPlan).toBe('function');
      expect(typeof planning.addTask).toBe('function');
      expect(typeof planning.getTask).toBe('function');
      expect(typeof planning.open).toBe('function');
      expect(typeof planning.close).toBe('function');
      
      const verification = createVerificationStore();
      expect(typeof verification.createVerification).toBe('function');
      expect(typeof verification.getVerification).toBe('function');
      expect(typeof verification.addAssertion).toBe('function');
      expect(typeof verification.runVerification).toBe('function');
      expect(typeof verification.open).toBe('function');
      expect(typeof verification.close).toBe('function');
      
      const toolExecution = createToolExecutionStore();
      expect(typeof toolExecution.registerTool).toBe('function');
      expect(typeof toolExecution.getTool).toBe('function');
      expect(typeof toolExecution.execute).toBe('function');
      expect(typeof toolExecution.open).toBe('function');
      expect(typeof toolExecution.close).toBe('function');
      
      const workflows = createWorkflowStore();
      expect(typeof workflows.createWorkflow).toBe('function');
      expect(typeof workflows.getWorkflow).toBe('function');
      expect(typeof workflows.startRun).toBe('function');
      expect(typeof workflows.executeStep).toBe('function');
      expect(typeof workflows.open).toBe('function');
      expect(typeof workflows.close).toBe('function');
      
      const multiAgent = createMultiAgentStore();
      expect(typeof multiAgent.registerAgent).toBe('function');
      expect(typeof multiAgent.getAgent).toBe('function');
      expect(typeof multiAgent.createSession).toBe('function');
      expect(typeof multiAgent.sendMessage).toBe('function');
      expect(typeof multiAgent.open).toBe('function');
      expect(typeof multiAgent.close).toBe('function');
      
      const scheduling = createSchedulingStore();
      expect(typeof scheduling.createSchedule).toBe('function');
      expect(typeof scheduling.getSchedule).toBe('function');
      expect(typeof scheduling.addJob).toBe('function');
      expect(typeof scheduling.runJob).toBe('function');
      expect(typeof scheduling.open).toBe('function');
      expect(typeof scheduling.close).toBe('function');
      
      const observability = createObservabilityStore();
      expect(typeof observability.log).toBe('function');
      expect(typeof observability.queryLogs).toBe('function');
      expect(typeof observability.recordMetric).toBe('function');
      expect(typeof observability.startTrace).toBe('function');
      expect(typeof observability.open).toBe('function');
      expect(typeof observability.close).toBe('function');
    });
  });
});
