/**
 * Observability Module — Contract Verification Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryObservabilityStore, createObservabilityStore } from '../../../src/modules/observability/index.js';
import { ObservabilityError } from '../../../src/modules/observability/types.js';

describe('Observability Module Contract', () => {
  let store: InMemoryObservabilityStore;
  
  beforeEach(async () => {
    store = createObservabilityStore();
    await store.open();
  });
  
  afterEach(async () => {
    await store.close();
  });
  
  // ==========================================================================
  // Logs
  // ==========================================================================
  
  describe('Logs', () => {
    it('logs an entry', async () => {
      const entry = await store.log({
        level: 'info',
        message: 'Test message',
        source: 'test',
        metadata: {},
      });
      
      expect(entry.id).toBeDefined();
      expect(entry.message).toBe('Test message');
      expect(entry.level).toBe('info');
    });
    
    it('queries logs by level', async () => {
      await store.log({ level: 'info', message: 'Info 1', source: 'test', metadata: {} });
      await store.log({ level: 'error', message: 'Error 1', source: 'test', metadata: {} });
      await store.log({ level: 'info', message: 'Info 2', source: 'test', metadata: {} });
      
      const infoLogs = await store.queryLogs({ level: 'info' });
      expect(infoLogs).toHaveLength(2);
      
      const errorLogs = await store.queryLogs({ level: 'error' });
      expect(errorLogs).toHaveLength(1);
    });
    
    it('queries logs by source', async () => {
      await store.log({ level: 'info', message: 'App 1', source: 'app', metadata: {} });
      await store.log({ level: 'info', message: 'DB 1', source: 'database', metadata: {} });
      
      const appLogs = await store.queryLogs({ source: 'app' });
      expect(appLogs).toHaveLength(1);
      
      const dbLogs = await store.queryLogs({ source: 'database' });
      expect(dbLogs).toHaveLength(1);
    });
    
    it('queries logs with limit', async () => {
      for (let i = 0; i < 10; i++) {
        await store.log({ level: 'info', message: `Message ${i}`, source: 'test', metadata: {} });
      }
      
      const logs = await store.queryLogs({ limit: 5 });
      expect(logs).toHaveLength(5);
    });
  });
  
  // ==========================================================================
  // Metrics
  // ==========================================================================
  
  describe('Metrics', () => {
    it('records a metric', async () => {
      const metric = await store.recordMetric({
        name: 'requests',
        type: 'counter',
        value: 1,
        tags: { endpoint: '/api' },
      });
      
      expect(metric.id).toBeDefined();
      expect(metric.name).toBe('requests');
      expect(metric.value).toBe(1);
    });
    
    it('increments counter', async () => {
      await store.incrementCounter('requests', { endpoint: '/api' });
      await store.incrementCounter('requests', { endpoint: '/api' });
      await store.incrementCounter('requests', { endpoint: '/api' });
      
      const metrics = await store.queryMetrics({ name: 'requests' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(3);
    });
    
    it('sets gauge', async () => {
      await store.setGauge('cpu', 50);
      await store.setGauge('cpu', 75);
      
      const metrics = await store.queryMetrics({ name: 'cpu' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(75);
    });
    
    it('queries metrics by type', async () => {
      await store.recordMetric({ name: 'requests', type: 'counter', value: 1, tags: {} });
      await store.recordMetric({ name: 'cpu', type: 'gauge', value: 50, tags: {} });
      
      const counters = await store.queryMetrics({ type: 'counter' });
      expect(counters).toHaveLength(1);
      
      const gauges = await store.queryMetrics({ type: 'gauge' });
      expect(gauges).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Traces
  // ==========================================================================
  
  describe('Traces', () => {
    it('starts a trace', async () => {
      const trace = await store.startTrace('test-operation');
      expect(trace.id).toBeDefined();
      expect(trace.name).toBe('test-operation');
      expect(trace.status).toBe('active');
    });
    
    it('starts a span', async () => {
      const trace = await store.startTrace('test-operation');
      const span = await store.startSpan(trace.id, 'child-operation');
      
      expect(span.id).toBeDefined();
      expect(span.traceId).toBe(trace.id);
      expect(span.name).toBe('child-operation');
    });
    
    it('ends a span', async () => {
      const trace = await store.startTrace('test-operation');
      const span = await store.startSpan(trace.id, 'child-operation');
      
      await store.endSpan(span.id, 'ok');
      
      const updated = trace.spans.find(s => s.id === span.id);
      expect(updated?.status).toBe('ok');
      expect(updated?.endTime).toBeDefined();
    });
    
    it('ends a trace', async () => {
      const trace = await store.startTrace('test-operation');
      await store.endTrace(trace.id, 'completed');
      
      const updated = await store.getTrace(trace.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.endTime).toBeDefined();
    });
    
    it('gets a trace', async () => {
      const trace = await store.startTrace('test-operation');
      const retrieved = await store.getTrace(trace.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(trace.id);
    });
    
    it('queries traces by status', async () => {
      await store.startTrace('trace1');
      const trace2 = await store.startTrace('trace2');
      await store.endTrace(trace2.id, 'completed');
      
      const active = await store.queryTraces({ status: 'active' });
      expect(active).toHaveLength(1);
      
      const completed = await store.queryTraces({ status: 'completed' });
      expect(completed).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Stats & Health
  // ==========================================================================
  
  describe('Stats & Health', () => {
    it('returns stats', async () => {
      await store.log({ level: 'info', message: 'Test', source: 'test', metadata: {} });
      await store.recordMetric({ name: 'test', type: 'counter', value: 1, tags: {} });
      await store.startTrace('test');
      
      const stats = await store.getStats();
      expect(stats.totalLogs).toBe(1);
      expect(stats.totalMetrics).toBe(1);
      expect(stats.totalTraces).toBe(1);
      expect(stats.activeTraces).toBe(1);
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
      await expect(store.log({
        level: 'info',
        message: 'Test',
        source: 'test',
        metadata: {},
      })).rejects.toThrow(ObservabilityError);
    });
  });
});
