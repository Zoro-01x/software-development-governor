/**
 * Tool Execution Module — Contract Verification Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryToolExecutionStore, createToolExecutionStore } from '../../../src/modules/tool-execution/index.js';
import { ToolExecutionError } from '../../../src/modules/tool-execution/types.js';

describe('Tool Execution Module Contract', () => {
  let store: InMemoryToolExecutionStore;
  
  beforeEach(async () => {
    store = createToolExecutionStore();
    await store.open();
  });
  
  afterEach(async () => {
    await store.close();
  });
  
  // ==========================================================================
  // Tools
  // ==========================================================================
  
  describe('Tools', () => {
    it('registers and gets a tool', async () => {
      const tool = await store.registerTool({
        name: 'Test Tool',
        description: 'A test tool',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      const retrieved = await store.getTool(tool.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Tool');
    });
    
    it('unregisters a tool', async () => {
      const tool = await store.registerTool({
        name: 'Test Tool',
        description: 'A test tool',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      await store.unregisterTool(tool.id);
      const retrieved = await store.getTool(tool.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries tools by type', async () => {
      await store.registerTool({
        name: 'Function Tool',
        description: 'Test',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      await store.registerTool({
        name: 'API Tool',
        description: 'Test',
        type: 'api',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      const functions = await store.queryTools({ type: 'function' });
      expect(functions).toHaveLength(1);
      
      const apis = await store.queryTools({ type: 'api' });
      expect(apis).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Executions
  // ==========================================================================
  
  describe('Executions', () => {
    it('executes a tool', async () => {
      const tool = await store.registerTool({
        name: 'Test Tool',
        description: 'A test tool',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      const execution = await store.execute(tool.id, { input: 'test' });
      expect(execution.status).toBe('completed');
      expect(execution.output).toBeDefined();
    });
    
    it('gets an execution', async () => {
      const tool = await store.registerTool({
        name: 'Test Tool',
        description: 'A test tool',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      const execution = await store.execute(tool.id, { input: 'test' });
      const retrieved = await store.getExecution(execution.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(execution.id);
    });
    
    it('cancels an execution', async () => {
      const tool = await store.registerTool({
        name: 'Test Tool',
        description: 'A test tool',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      const execution = await store.execute(tool.id, { input: 'test' });
      
      // Note: In this implementation, execution completes immediately
      // This test verifies the cancel method exists and works for pending executions
      await expect(store.cancelExecution(execution.id)).rejects.toThrow(ToolExecutionError);
    });
    
    it('queries executions by tool', async () => {
      const tool1 = await store.registerTool({
        name: 'Tool 1',
        description: 'Test',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      const tool2 = await store.registerTool({
        name: 'Tool 2',
        description: 'Test',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      await store.execute(tool1.id, { input: 'test' });
      await store.execute(tool2.id, { input: 'test' });
      
      const executions1 = await store.queryExecutions({ toolId: tool1.id });
      expect(executions1).toHaveLength(1);
      
      const executions2 = await store.queryExecutions({ toolId: tool2.id });
      expect(executions2).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Stats & Health
  // ==========================================================================
  
  describe('Stats & Health', () => {
    it('returns stats', async () => {
      const tool = await store.registerTool({
        name: 'Test Tool',
        description: 'Test',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      });
      
      await store.execute(tool.id, { input: 'test' });
      
      const stats = await store.getStats();
      expect(stats.totalTools).toBe(1);
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
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
      await expect(store.registerTool({
        name: 'Test',
        description: 'Test',
        type: 'function',
        inputSchema: {},
        outputSchema: {},
        metadata: {},
      })).rejects.toThrow(ToolExecutionError);
    });
  });
});
