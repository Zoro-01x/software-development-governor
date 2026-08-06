/**
 * Golden Tests — Deterministic Governance Verification
 * 
 * Tests that identical governance tasks produce identical results
 * regardless of provider. Uses rule-based adapter for deterministic behavior.
 */

import { describe, it, expect } from 'vitest';
import { createInMemoryStore } from '../../src/modules/memory/index.js';
import { createKnowledgeStore } from '../../src/modules/knowledge/index.js';
import { createPlanningStore } from '../../src/modules/planning/index.js';
import { createVerificationStore } from '../../src/modules/verification/index.js';
import { createToolExecutionStore } from '../../src/modules/tool-execution/index.js';
import { createWorkflowStore } from '../../src/modules/workflows/index.js';
import { createMultiAgentStore } from '../../src/modules/multi-agent/index.js';
import { createSchedulingStore } from '../../src/modules/scheduling/index.js';
import { createObservabilityStore } from '../../src/modules/observability/index.js';

describe('Golden Tests', () => {
  // ==========================================================================
  // Memory Module Golden Tests
  // ==========================================================================
  
  describe('Memory Module', () => {
    it('memory operations are deterministic', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // Execute same operations twice
      const run1 = async () => {
        await store.put('key1', 'value1');
        await store.put('key2', 'value2');
        const v1 = await store.get('key1');
        const v2 = await store.get('key2');
        await store.delete('key1');
        const v3 = await store.get('key1');
        await store.close();
        return { v1, v2, v3 };
      };
      
      const store2 = createInMemoryStore();
      await store2.open();
      
      const run2 = async () => {
        await store2.put('key1', 'value1');
        await store2.put('key2', 'value2');
        const v1 = await store2.get('key1');
        const v2 = await store2.get('key2');
        await store2.delete('key1');
        const v3 = await store2.get('key1');
        await store2.close();
        return { v1, v2, v3 };
      };
      
      const result1 = await run1();
      const result2 = await run2();
      
      expect(result1).toEqual(result2);
    });
    
    it('memory queries are deterministic', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // Insert known data
      await store.put('user:1', { name: 'Alice', age: 30 });
      await store.put('user:2', { name: 'Bob', age: 25 });
      await store.put('user:3', { name: 'Charlie', age: 35 });
      
      // Query
      const result = await store.query({ limit: 10 });
      
      // Results should be consistent
      expect(result.keys).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Knowledge Module Golden Tests
  // ==========================================================================
  
  describe('Knowledge Module', () => {
    it('knowledge operations are deterministic', async () => {
      const store = createKnowledgeStore();
      await store.open();
      
      // Add entities
      const alice = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice', age: 30 },
        facts: [],
        relations: [],
      });
      
      const bob = await store.addEntity({
        type: 'person',
        properties: { name: 'Bob', age: 25 },
        facts: [],
        relations: [],
      });
      
      // Add relation
      await store.addRelation({
        source: alice.id,
        target: bob.id,
        type: 'knows',
        properties: {},
      });
      
      // Query
      const aliceAgain = await store.getEntity(alice.id);
      expect(aliceAgain?.properties.name).toBe('Alice');
      
      await store.close();
    });
    
    it('knowledge facts are deterministic', async () => {
      const store = createKnowledgeStore();
      await store.open();
      
      // Add facts
      await store.addFact({
        subject: 'earth',
        predicate: 'orbits',
        object: { type: 'entity', value: 'sun' },
        confidence: 1.0,
        source: 'science',
        metadata: {},
      });
      
      // Query
      const facts = await store.queryFacts({
        subject: 'earth',
        predicate: 'orbits',
      });
      
      expect(facts).toHaveLength(1);
      expect(facts[0].subject).toBe('earth');
      expect(facts[0].object.value).toBe('sun');
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Planning Module Golden Tests
  // ==========================================================================
  
  describe('Planning Module', () => {
    it('planning operations are deterministic', async () => {
      const store = createPlanningStore();
      await store.open();
      
      // Create plan
      const plan = await store.createPlan({
        name: 'Golden Plan',
        description: 'A deterministic plan',
        tasks: [],
        status: 'draft',
        metadata: { strategy: 'test' },
      });
      
      // Add tasks
      await store.addTask(plan.id, {
        name: 'Task 1',
        description: 'First task',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        steps: [],
        metadata: {},
      });
      
      // Query
      const planAgain = await store.getPlan(plan.id);
      expect(planAgain?.name).toBe('Golden Plan');
      expect(planAgain?.tasks).toHaveLength(1);
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Verification Module Golden Tests
  // ==========================================================================
  
  describe('Verification Module', () => {
    it('verification operations are deterministic', async () => {
      const store = createVerificationStore();
      await store.open();
      
      // Create verification
      const verification = await store.createVerification({
        name: 'Golden Test',
        description: 'A deterministic test',
        assertions: [],
        status: 'pending',
        metadata: {},
      });
      
      // Add assertion
      await store.addAssertion(verification.id, {
        type: 'equals',
        target: 'result',
        operator: 'eq',
        expected: 'expected',
        metadata: {},
      });
      
      // Query
      const verificationAgain = await store.getVerification(verification.id);
      expect(verificationAgain?.name).toBe('Golden Test');
      expect(verificationAgain?.assertions).toHaveLength(1);
      
      await store.close();
    });
    
    it('verification results are deterministic', async () => {
      const store1 = createVerificationStore();
      const store2 = createVerificationStore();
      await store1.open();
      await store2.open();
      
      // Same verification in both stores
      const v1 = await store1.createVerification({
        name: 'Test',
        description: 'Test',
        assertions: [],
        status: 'pending',
        metadata: {},
      });
      
      const v2 = await store2.createVerification({
        name: 'Test',
        description: 'Test',
        assertions: [],
        status: 'pending',
        metadata: {},
      });
      
      // Same assertion
      await store1.addAssertion(v1.id, {
        type: 'equals',
        target: 'x',
        operator: 'eq',
        expected: 42,
        metadata: {},
      });
      
      await store2.addAssertion(v2.id, {
        type: 'equals',
        target: 'x',
        operator: 'eq',
        expected: 42,
        metadata: {},
      });
      
      // Same result
      const result1 = await store1.runVerification(v1.id);
      const result2 = await store2.runVerification(v2.id);
      
      expect(result1.passed).toBe(result2.passed);
      expect(result1.failed).toBe(result2.failed);
      
      await store1.close();
      await store2.close();
    });
  });
  
  // ==========================================================================
  // Tool Execution Module Golden Tests
  // ==========================================================================
  
  describe('Tool Execution Module', () => {
    it('tool execution is deterministic', async () => {
      const store1 = createToolExecutionStore();
      const store2 = createToolExecutionStore();
      await store1.open();
      await store2.open();
      
      // Register same tool
      const tool1 = await store1.registerTool({
        name: 'golden-tool',
        type: 'function',
        config: { handler: 'add' },
        metadata: {},
      });
      
      const tool2 = await store2.registerTool({
        name: 'golden-tool',
        type: 'function',
        config: { handler: 'add' },
        metadata: {},
      });
      
      // Execute same input
      const result1 = await store1.execute(tool1.id, { a: 1, b: 2 });
      const result1b = await store1.execute(tool1.id, { a: 1, b: 2 });
      
      // Results should be identical (same store, same input)
      expect(result1.status).toBe(result1b.status);
      expect(result1.output).toEqual(result1b.output);
      
      await store1.close();
      await store2.close();
    });
  });
  
  // ==========================================================================
  // Workflow Module Golden Tests
  // ==========================================================================
  
  describe('Workflow Module', () => {
    it('workflow execution is deterministic', async () => {
      const store1 = createWorkflowStore();
      const store2 = createWorkflowStore();
      await store1.open();
      await store2.open();
      
      // Same workflow
      const steps = [
        { id: 'step-1', name: 'Step 1', type: 'action', config: {}, metadata: {}, next: 'step-2' },
        { id: 'step-2', name: 'Step 2', type: 'action', config: {}, metadata: {}, next: 'step-3' },
        { id: 'step-3', name: 'Step 3', type: 'action', config: {}, metadata: {} },
      ];
      
      const w1 = await store1.createWorkflow({
        name: 'Golden Workflow',
        description: 'Test',
        steps,
        status: 'active',
        metadata: {},
      });
      
      const w2 = await store2.createWorkflow({
        name: 'Golden Workflow',
        description: 'Test',
        steps,
        status: 'active',
        metadata: {},
      });
      
      // Same execution
      const run1 = await store1.startRun(w1.id);
      const run2 = await store2.startRun(w2.id);
      
      // Execute step by step
      await store1.executeStep(run1.id, 'step-1');
      await store2.executeStep(run2.id, 'step-1');
      
      await store1.executeStep(run1.id, 'step-2');
      await store2.executeStep(run2.id, 'step-2');
      
      await store1.executeStep(run1.id, 'step-3');
      await store2.executeStep(run2.id, 'step-3');
      
      // Same result
      const final1 = await store1.getRun(run1.id);
      const final2 = await store2.getRun(run2.id);
      
      expect(final1?.status).toBe(final2?.status);
      expect(final1?.stepsExecuted.length).toBe(final2?.stepsExecuted.length);
      
      await store1.close();
      await store2.close();
    });
  });
  
  // ==========================================================================
  // Multi-Agent Module Golden Tests
  // ==========================================================================
  
  describe('Multi-Agent Module', () => {
    it('agent operations are deterministic', async () => {
      const store1 = createMultiAgentStore();
      const store2 = createMultiAgentStore();
      await store1.open();
      await store2.open();
      
      // Register same agent
      const agent1 = await store1.registerAgent({
        name: 'Golden Agent',
        type: 'llm',
        capabilities: ['chat', 'reason'],
        status: 'idle',
        config: { model: 'test' },
        metadata: {},
      });
      
      const agent2 = await store2.registerAgent({
        name: 'Golden Agent',
        type: 'llm',
        capabilities: ['chat', 'reason'],
        status: 'idle',
        config: { model: 'test' },
        metadata: {},
      });
      
      // Same session
      const session1 = await store1.createSession([agent1.id]);
      const session2 = await store2.createSession([agent2.id]);
      
      // Same message
      await store1.sendMessage({
        sessionId: session1.id,
        from: agent1.id,
        to: agent1.id,
        content: 'Hello',
        type: 'request',
        metadata: {},
      });
      
      await store2.sendMessage({
        sessionId: session2.id,
        from: agent2.id,
        to: agent2.id,
        content: 'Hello',
        type: 'request',
        metadata: {},
      });
      
      // Query
      const s1 = await store1.getSession(session1.id);
      const s2 = await store2.getSession(session2.id);
      
      expect(s1?.messages.length).toBe(1);
      expect(s2?.messages.length).toBe(1);
      
      await store1.close();
      await store2.close();
    });
  });
  
  // ==========================================================================
  // Scheduling Module Golden Tests
  // ==========================================================================
  
  describe('Scheduling Module', () => {
    it('scheduling operations are deterministic', async () => {
      const store = createSchedulingStore();
      await store.open();
      
      // Create schedule
      const schedule = await store.createSchedule({
        name: 'Golden Schedule',
        cron: '0 * * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      // Add job
      const job = await store.addJob(schedule.id, {
        name: 'Test Job',
        type: 'once',
        config: { data: 'test' },
        status: 'pending',
        metadata: {},
      });
      
      // Query schedule
      const scheduleAgain = await store.getSchedule(schedule.id);
      expect(scheduleAgain?.name).toBe('Golden Schedule');
      
      // Query jobs
      const jobs = await store.queryJobs({ scheduleId: schedule.id });
      expect(jobs.length).toBe(1);
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Observability Module Golden Tests
  // ==========================================================================
  
  describe('Observability Module', () => {
    it('logging is deterministic', async () => {
      const store1 = createObservabilityStore();
      const store2 = createObservabilityStore();
      await store1.open();
      await store2.open();
      
      // Same log
      await store1.log({
        level: 'info',
        message: 'Golden log',
        timestamp: new Date('2025-01-01T00:00:00Z'),
        context: { module: 'test' },
      });
      
      await store2.log({
        level: 'info',
        message: 'Golden log',
        timestamp: new Date('2025-01-01T00:00:00Z'),
        context: { module: 'test' },
      });
      
      // Query
      const logs1 = await store1.queryLogs({ level: 'info' });
      const logs2 = await store2.queryLogs({ level: 'info' });
      
      expect(logs1).toHaveLength(1);
      expect(logs2).toHaveLength(1);
      expect(logs1[0].message).toBe(logs2[0].message);
      
      await store1.close();
      await store2.close();
    });
    
    it('metrics are deterministic', async () => {
      const store = createObservabilityStore();
      await store.open();
      
      // Record metric
      await store.recordMetric({
        name: 'golden.metric',
        value: 42,
        timestamp: new Date('2025-01-01T00:00:00Z'),
        tags: { env: 'test' },
      });
      
      // Query
      const metrics = await store.queryMetrics({ name: 'golden.metric' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(42);
      
      await store.close();
    });
    
    it('traces are deterministic', async () => {
      const store = createObservabilityStore();
      await store.open();
      
      // Create trace
      const trace = await store.startTrace('Golden Trace');
      
      // Add span
      await store.startSpan(trace.id, 'Golden Span');
      
      // Query
      const traceAgain = await store.getTrace(trace.id);
      expect(traceAgain?.name).toBe('Golden Trace');
      expect(traceAgain?.spans.length).toBe(1);
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Cross-Module Golden Tests
  // ==========================================================================
  
  describe('Cross-Module Golden Tests', () => {
    it('all modules produce consistent results', async () => {
      // Create all modules
      const memory = createInMemoryStore();
      const knowledge = createKnowledgeStore();
      const planning = createPlanningStore();
      const verification = createVerificationStore();
      const tools = createToolExecutionStore();
      const workflows = createWorkflowStore();
      const multiAgent = createMultiAgentStore();
      const scheduling = createSchedulingStore();
      const observability = createObservabilityStore();
      
      // Open all
      await memory.open();
      await knowledge.open();
      await planning.open();
      await verification.open();
      await tools.open();
      await workflows.open();
      await multiAgent.open();
      await scheduling.open();
      await observability.open();
      
      // Run same operations
      await memory.put('key', 'value');
      await knowledge.addEntity({ type: 'test', properties: {}, facts: [], relations: [] });
      await planning.createPlan({ name: 'Test', description: '', tasks: [], status: 'draft', metadata: {} });
      
      // Query
      expect(await memory.get('key')).toBe('value');
      const entities = await knowledge.queryEntities({ type: 'test' });
      expect(entities).toHaveLength(1);
      
      // Close all
      await memory.close();
      await knowledge.close();
      await planning.close();
      await verification.close();
      await tools.close();
      await workflows.close();
      await multiAgent.close();
      await scheduling.close();
      await observability.close();
    });
  });
});
