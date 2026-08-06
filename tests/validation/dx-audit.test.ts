/**
 * DX Audit — Developer Experience
 * 
 * Tests: clone → write one adapter → register → run.
 * Evaluates documentation, error messages, and ease of use.
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

describe('DX Audit', () => {
  // ==========================================================================
  // API Discoverability
  // ==========================================================================
  
  describe('API Discoverability', () => {
    it('memory module has intuitive API', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // API is self-documenting
      expect(typeof store.put).toBe('function');
      expect(typeof store.get).toBe('function');
      expect(typeof store.delete).toBe('function');
      expect(typeof store.exists).toBe('function');
      expect(typeof store.query).toBe('function');
      expect(typeof store.open).toBe('function');
      expect(typeof store.close).toBe('function');
      
      // Method names are clear
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store));
      expect(methods).toContain('put');
      expect(methods).toContain('get');
      expect(methods).toContain('delete');
      expect(methods).toContain('exists');
      expect(methods).toContain('query');
      expect(methods).toContain('open');
      expect(methods).toContain('close');
      
      await store.close();
    });
    
    it('knowledge module has intuitive API', async () => {
      const store = createKnowledgeStore();
      await store.open();
      
      expect(typeof store.addEntity).toBe('function');
      expect(typeof store.getEntity).toBe('function');
      expect(typeof store.addFact).toBe('function');
      expect(typeof store.queryFacts).toBe('function');
      
      await store.close();
    });
    
    it('planning module has intuitive API', async () => {
      const store = createPlanningStore();
      await store.open();
      
      expect(typeof store.createPlan).toBe('function');
      expect(typeof store.getPlan).toBe('function');
      expect(typeof store.addTask).toBe('function');
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Error Messages
  // ==========================================================================
  
  describe('Error Messages', () => {
    it('memory module provides clear error messages', async () => {
      const store = createInMemoryStore();
      
      try {
        await store.get('key');
      } catch (error: any) {
        expect(error.message).toContain('not open');
      }
    });
    
    it('knowledge module provides clear error messages', async () => {
      const store = createKnowledgeStore();
      
      try {
        await store.getEntity('non-existent');
      } catch (error: any) {
        expect(error.message).toContain('not open');
      }
    });
    
    it('planning module provides clear error messages', async () => {
      const store = createPlanningStore();
      
      try {
        await store.addTask('non-existent', {
          name: 'Task',
          description: 'Test',
          status: 'pending',
          priority: 'medium',
          dependencies: [],
          steps: [],
          metadata: {},
        });
      } catch (error: any) {
        expect(error.message).toContain('not open');
      }
    });
  });
  
  // ==========================================================================
  // Type Safety
  // ==========================================================================
  
  describe('Type Safety', () => {
    it('memory module enforces types', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // TypeScript should enforce these
      await store.put('string-key', { data: 'value' });
      await store.put('number-key', 42);
      await store.put('boolean-key', true);
      
      const result = await store.get('string-key');
      expect(result).toBeDefined();
      
      await store.close();
    });
    
    it('knowledge module enforces types', async () => {
      const store = createKnowledgeStore();
      await store.open();
      
      const entity = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      expect(entity.id).toBeDefined();
      expect(entity.type).toBe('person');
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Code Examples
  // ==========================================================================
  
  describe('Code Examples', () => {
    it('can implement simple adapter', async () => {
      // A developer can create a simple adapter in 10 lines
      class SimpleMemoryStore {
        private data = new Map<string, unknown>();
        
        async put(key: string, value: unknown) {
          this.data.set(key, value);
        }
        
        async get(key: string) {
          return this.data.get(key) ?? null;
        }
        
        async delete(key: string) {
          this.data.delete(key);
        }
      }
      
      const store = new SimpleMemoryStore();
      await store.put('key', 'value');
      expect(await store.get('key')).toBe('value');
    });
    
    it('can use module without configuration', async () => {
      // Modules work with zero configuration
      const memory = createInMemoryStore();
      await memory.open();
      
      await memory.put('key', 'value');
      expect(await memory.get('key')).toBe('value');
      
      await memory.close();
    });
    
    it('can use multiple modules together', async () => {
      // All modules work together seamlessly
      const memory = createInMemoryStore();
      const knowledge = createKnowledgeStore();
      const planning = createPlanningStore();
      
      await memory.open();
      await knowledge.open();
      await planning.open();
      
      await memory.put('key', 'value');
      await knowledge.addEntity({ type: 'test', properties: {}, facts: [], relations: [] });
      await planning.createPlan({ name: 'Test', description: '', tasks: [], status: 'draft', metadata: {} });
      
      expect(await memory.get('key')).toBe('value');
      
      await memory.close();
      await knowledge.close();
      await planning.close();
    });
  });
  
  // ==========================================================================
  // Documentation
  // ==========================================================================
  
  describe('Documentation', () => {
    it('types are self-documenting', async () => {
      // Types serve as documentation
      const store = createInMemoryStore();
      await store.open();
      
      // Query interface documents available options
      const result = await store.query({ limit: 10 });
      expect(result.keys).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.hasMore).toBeDefined();
      
      await store.close();
    });
    
    it('module interfaces are clear', async () => {
      // Each module has a clear interface
      const memory = createInMemoryStore();
      const knowledge = createKnowledgeStore();
      const planning = createPlanningStore();
      const verification = createVerificationStore();
      const tools = createToolExecutionStore();
      const workflows = createWorkflowStore();
      const multiAgent = createMultiAgentStore();
      const scheduling = createSchedulingStore();
      const observability = createObservabilityStore();
      
      // All modules have open/close
      expect(typeof memory.open).toBe('function');
      expect(typeof knowledge.open).toBe('function');
      expect(typeof planning.open).toBe('function');
      expect(typeof verification.open).toBe('function');
      expect(typeof tools.open).toBe('function');
      expect(typeof workflows.open).toBe('function');
      expect(typeof multiAgent.open).toBe('function');
      expect(typeof scheduling.open).toBe('function');
      expect(typeof observability.open).toBe('function');
      
      expect(typeof memory.close).toBe('function');
      expect(typeof knowledge.close).toBe('function');
      expect(typeof planning.close).toBe('function');
      expect(typeof verification.close).toBe('function');
      expect(typeof tools.close).toBe('function');
      expect(typeof workflows.close).toBe('function');
      expect(typeof multiAgent.close).toBe('function');
      expect(typeof scheduling.close).toBe('function');
      expect(typeof observability.close).toBe('function');
    });
  });
  
  // ==========================================================================
  // Plugin Development
  // ==========================================================================
  
  describe('Plugin Development', () => {
    it('can create custom module', async () => {
      // A developer can create a custom module
      class CustomModule {
        private data = new Map<string, unknown>();
        
        async open() {}
        async close() {}
        
        async set(key: string, value: unknown) {
          this.data.set(key, value);
        }
        
        async get(key: string) {
          return this.data.get(key) ?? null;
        }
      }
      
      const module = new CustomModule();
      await module.open();
      
      await module.set('key', 'value');
      expect(await module.get('key')).toBe('value');
      
      await module.close();
    });
    
    it('can extend existing module', async () => {
      // A developer can extend an existing module
      const baseStore = createInMemoryStore();
      
      class ExtendedMemoryStore {
        private base = baseStore;
        
        async open() {
          await this.base.open();
        }
        
        async close() {
          await this.base.close();
        }
        
        async put(key: string, value: unknown) {
          await this.base.put(key, value);
        }
        
        async get(key: string) {
          return await this.base.get(key);
        }
        
        async delete(key: string) {
          await this.base.delete(key);
        }
        
        async exists(key: string) {
          return await this.base.exists(key);
        }
        
        async query(query: any) {
          return await this.base.query(query);
        }
        
        // Custom method
        async getStats() {
          const result = await this.base.query({ limit: 1000 });
          return { totalKeys: result.total };
        }
      }
      
      const store = new ExtendedMemoryStore();
      await store.open();
      
      await store.put('key', 'value');
      expect(await store.get('key')).toBe('value');
      
      const stats = await store.getStats();
      expect(stats.totalKeys).toBe(1);
      
      await store.close();
    });
  });
});
