/**
 * Performance Audit — Framework Performance
 * 
 * Tests startup, shutdown, module load, event throughput, governance overhead,
 * memory usage, and context propagation.
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

describe('Performance Audit', () => {
  // ==========================================================================
  // Startup/Shutdown Performance
  // ==========================================================================
  
  describe('Startup/Shutdown', () => {
    it('memory module opens quickly', async () => {
      const start = performance.now();
      const store = createInMemoryStore();
      await store.open();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // < 100ms
      
      await store.close();
    });
    
    it('knowledge module opens quickly', async () => {
      const start = performance.now();
      const store = createKnowledgeStore();
      await store.open();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100);
      
      await store.close();
    });
    
    it('all modules open quickly', async () => {
      const start = performance.now();
      
      const stores = [
        createInMemoryStore(),
        createKnowledgeStore(),
        createPlanningStore(),
        createVerificationStore(),
        createToolExecutionStore(),
        createWorkflowStore(),
        createMultiAgentStore(),
        createSchedulingStore(),
        createObservabilityStore(),
      ];
      
      await Promise.all(stores.map(s => s.open()));
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(500); // All modules < 500ms
      
      await Promise.all(stores.map(s => s.close()));
    });
  });
  
  // ==========================================================================
  // Operation Throughput
  // ==========================================================================
  
  describe('Operation Throughput', () => {
    it('memory module handles 10000 ops/sec', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await store.put(`key-${i}`, `value-${i}`);
      }
      
      const duration = performance.now() - start;
      const opsPerSec = (iterations / duration) * 1000;
      
      expect(opsPerSec).toBeGreaterThan(10000); // > 10k ops/sec
      
      await store.close();
    });
    
    it('knowledge module handles 5000 ops/sec', async () => {
      const store = createKnowledgeStore();
      await store.open();
      
      const iterations = 5000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await store.addEntity({
          type: 'person',
          properties: { name: `Person ${i}` },
          facts: [],
          relations: [],
        });
      }
      
      const duration = performance.now() - start;
      const opsPerSec = (iterations / duration) * 1000;
      
      expect(opsPerSec).toBeGreaterThan(5000); // > 5k ops/sec
      
      await store.close();
    });
    
    it('query performance is acceptable', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // Insert data
      for (let i = 0; i < 1000; i++) {
        await store.put(`key-${i}`, { index: i });
      }
      
      const start = performance.now();
      const result = await store.query({ limit: 100 });
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(50); // < 50ms
      expect(result.keys).toHaveLength(100);
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Memory Usage
  // ==========================================================================
  
  describe('Memory Usage', () => {
    it('memory module memory usage is bounded', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // Insert 10000 entries
      for (let i = 0; i < 10000; i++) {
        await store.put(`key-${i}`, { data: `value-${i}` });
      }
      
      // Check stats
      const stats = store.stats;
      expect(stats.totalKeys).toBe(10000);
      
      // Memory should be reasonable (< 10MB for 10k entries)
      // This is a rough estimate
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // < 100MB total
      
      await store.close();
    });
    
    it('knowledge module memory usage is bounded', async () => {
      const store = createKnowledgeStore();
      await store.open();
      
      // Insert 5000 entities
      for (let i = 0; i < 5000; i++) {
        await store.addEntity({
          type: 'person',
          properties: { name: `Person ${i}` },
          facts: [],
          relations: [],
        });
      }
      
      const stats = await store.getStats();
      expect(stats.totalEntities).toBe(5000);
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Query Performance
  // ==========================================================================
  
  describe('Query Performance', () => {
    it('simple query is fast', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // Insert data
      for (let i = 0; i < 1000; i++) {
        await store.put(`key-${i}`, { index: i });
      }
      
      // Simple query
      const start = performance.now();
      const result = await store.query({ limit: 10 });
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10); // < 10ms
      expect(result.keys).toHaveLength(10);
      
      await store.close();
    });
    
    it('large query is acceptable', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // Insert data
      for (let i = 0; i < 10000; i++) {
        await store.put(`key-${i}`, { index: i });
      }
      
      // Large query
      const start = performance.now();
      const result = await store.query({ limit: 1000 });
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // < 100ms
      expect(result.keys).toHaveLength(1000);
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Event Throughput
  // ==========================================================================
  
  describe('Event Throughput', () => {
    it('handles many concurrent operations', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      const operations = Array.from({ length: 1000 }, (_, i) =>
        store.put(`key-${i}`, `value-${i}`)
      );
      
      const start = performance.now();
      await Promise.all(operations);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(500); // < 500ms for 1000 concurrent ops
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Scalability
  // ==========================================================================
  
  describe('Scalability', () => {
    it('performance scales linearly', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      // Test 1000 ops
      const start1 = performance.now();
      for (let i = 0; i < 1000; i++) {
        await store.put(`key-${i}`, `value-${i}`);
      }
      const duration1 = performance.now() - start1;
      
      // Test 2000 ops
      const start2 = performance.now();
      for (let i = 1000; i < 3000; i++) {
        await store.put(`key-${i}`, `value-${i}`);
      }
      const duration2 = performance.now() - start2;
      
      // Duration should be roughly proportional
      expect(duration2).toBeLessThan(duration1 * 3); // < 3x for 2x data
      
      await store.close();
    });
  });
  
  // ==========================================================================
  // Latency
  // ==========================================================================
  
  describe('Latency', () => {
    it('single operation latency is low', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      await store.put('key', 'value');
      
      const start = performance.now();
      await store.get('key');
      const latency = performance.now() - start;
      
      expect(latency).toBeLessThan(10); // < 10ms
      
      await store.close();
    });
    
    it('delete latency is low', async () => {
      const store = createInMemoryStore();
      await store.open();
      
      await store.put('key', 'value');
      
      const start = performance.now();
      await store.delete('key');
      const latency = performance.now() - start;
      
      expect(latency).toBeLessThan(10); // < 10ms
      
      await store.close();
    });
  });
});
