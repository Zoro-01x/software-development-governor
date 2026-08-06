import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  GovernanceKernel,
  KernelError,
  KernelEvent,
  KernelContext,
} from '../../src/kernel/index.js';

describe('Kernel (ADR-003)', () => {
  let kernel: GovernanceKernel;

  beforeEach(() => {
    kernel = new GovernanceKernel();
  });

  afterEach(async () => {
    try {
      await kernel.stop();
    } catch {}
  });

  describe('Kernel Boots', () => {
    it('starts successfully', async () => {
      await expect(kernel.start()).resolves.not.toThrow();
    });

    it('emits booting event', async () => {
      const events: KernelEvent[] = [];
      kernel.subscribe('kernel:booting', (e) => events.push(e));
      await kernel.start();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('kernel:booting');
    });

    it('emits ready event', async () => {
      const events: KernelEvent[] = [];
      kernel.subscribe('kernel:ready', (e) => events.push(e));
      await kernel.start();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('kernel:ready');
    });

    it('rejects double start', async () => {
      await kernel.start();
      await expect(kernel.start()).rejects.toThrow(KernelError);
    });
  });

  describe('Kernel Stops', () => {
    it('stops successfully', async () => {
      await kernel.start();
      await expect(kernel.stop()).resolves.not.toThrow();
    });

    it('emits stopping event', async () => {
      await kernel.start();
      const events: KernelEvent[] = [];
      kernel.subscribe('kernel:stopping', (e) => events.push(e));
      await kernel.stop();
      expect(events).toHaveLength(1);
    });

    it('emits stopped event', async () => {
      await kernel.start();
      const events: KernelEvent[] = [];
      kernel.subscribe('kernel:stopped', (e) => events.push(e));
      await kernel.stop();
      expect(events).toHaveLength(1);
    });

    it('rejects stop when not started', async () => {
      await expect(kernel.stop()).rejects.toThrow(KernelError);
    });
  });

  describe('Dependency Injection', () => {
    it('registers and resolves service', () => {
      const service = { name: 'test-service' };
      kernel.register('test', service);
      const resolved = kernel.resolve<{ name: string }>('test');
      expect(resolved).toBe(service);
    });

    it('throws for missing dependency', () => {
      expect(() => kernel.resolve('missing')).toThrow(KernelError);
    });

    it('rejects duplicate registration', () => {
      kernel.register('test', { name: 'test' });
      expect(() => kernel.register('test', { name: 'test2' })).toThrow(KernelError);
    });
  });

  describe('Event Bus', () => {
    it('emits and receives events', async () => {
      await kernel.start();
      const events: KernelEvent[] = [];
      kernel.subscribe('test:event', (e) => events.push(e));
      kernel.emit({ type: 'test:event' as any, timestamp: new Date(), correlationId: 'test-1' });
      expect(events).toHaveLength(1);
    });

    it('unsubscribes successfully', async () => {
      await kernel.start();
      const events: KernelEvent[] = [];
      const sub = kernel.subscribe('test:event', (e) => events.push(e));
      kernel.emit({ type: 'test:event' as any, timestamp: new Date(), correlationId: 'test-1' });
      expect(events).toHaveLength(1);
      sub.unsubscribe();
      kernel.emit({ type: 'test:event' as any, timestamp: new Date(), correlationId: 'test-2' });
      expect(events).toHaveLength(1);
    });

    it('isolates handler errors', async () => {
      await kernel.start();
      const events: KernelEvent[] = [];
      kernel.subscribe('test:event', () => { throw new Error('handler error'); });
      kernel.subscribe('test:event', (e) => events.push(e));
      kernel.emit({ type: 'test:event' as any, timestamp: new Date(), correlationId: 'test-1' });
      expect(events).toHaveLength(1);
    });
  });

  describe('Context Propagation', () => {
    it('creates context', () => {
      const ctx = kernel.context();
      expect(ctx).toBeDefined();
      expect(ctx.correlationId).toBeTruthy();
    });

    it('creates unique contexts', () => {
      const ctx1 = kernel.context();
      const ctx2 = kernel.context();
      expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
    });

    it('propagates metadata', () => {
      const ctx = kernel.context();
      const ctxWithMeta = ctx.withMetadata({ key: 'value' });
      expect(ctxWithMeta.metadata.key).toBe('value');
    });
  });

  describe('Extension Loading', () => {
    it('loads extension', async () => {
      await kernel.start();
      await kernel.loadExtension({ id: 'ext-1', version: '1.0.0', type: 'test' });
      expect(true).toBe(true);
    });

    it('activates extension', async () => {
      await kernel.start();
      await kernel.loadExtension({ id: 'ext-1', version: '1.0.0', type: 'test' });
      await kernel.activateExtension('ext-1');
      expect(true).toBe(true);
    });

    it('emits extension events', async () => {
      await kernel.start();
      const events: KernelEvent[] = [];
      kernel.subscribe('extension:registered', (e) => events.push(e));
      kernel.subscribe('extension:activated', (e) => events.push(e));
      await kernel.loadExtension({ id: 'ext-1', version: '1.0.0', type: 'test' });
      await kernel.activateExtension('ext-1');
      expect(events).toHaveLength(2);
    });

    it('rejects duplicate extension', async () => {
      await kernel.start();
      await kernel.loadExtension({ id: 'ext-1', version: '1.0.0', type: 'test' });
      await expect(kernel.loadExtension({ id: 'ext-1', version: '1.0.0', type: 'test' })).rejects.toThrow(KernelError);
    });

    it('rejects missing dependency', async () => {
      await kernel.start();
      await expect(kernel.loadExtension({ id: 'ext-1', version: '1.0.0', type: 'test', dependencies: ['ext-missing'] })).rejects.toThrow(KernelError);
    });
  });

  describe('Deterministic Shutdown Order', () => {
    it('deactivates extensions in reverse order', async () => {
      await kernel.start();
      const deactivationOrder: string[] = [];
      kernel.subscribe('extension:deactivated', (e) => {
        deactivationOrder.push((e.payload as any).id);
      });
      await kernel.loadExtension({ id: 'ext-1', version: '1.0.0', type: 'test' });
      await kernel.loadExtension({ id: 'ext-2', version: '1.0.0', type: 'test' });
      await kernel.activateExtension('ext-1');
      await kernel.activateExtension('ext-2');
      await kernel.stop();
      expect(deactivationOrder).toEqual(['ext-2', 'ext-1']);
    });
  });

  describe('Kernel Immutability', () => {
    it('has zero provider knowledge', () => {
      const kernelMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(kernel));
      const providerKeywords = ['openai', 'anthropic', 'claude', 'gemini', 'ollama', 'prompt'];
      for (const keyword of providerKeywords) {
        expect(kernelMethods.some(m => m.toLowerCase().includes(keyword))).toBe(false);
      }
    });

    it('has zero governance knowledge', () => {
      const kernelMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(kernel));
      const governanceKeywords = ['rule', 'policy', 'constitution', 'experience', 'architecture'];
      for (const keyword of governanceKeywords) {
        expect(kernelMethods.some(m => m.toLowerCase().includes(keyword))).toBe(false);
      }
    });

    it('has zero strategy knowledge', () => {
      const kernelMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(kernel));
      const strategyKeywords = ['strategy', 'prompt', 'reasoning'];
      for (const keyword of strategyKeywords) {
        expect(kernelMethods.some(m => m.toLowerCase().includes(keyword))).toBe(false);
      }
    });

    it('has zero adapter knowledge', () => {
      const kernelMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(kernel));
      const adapterKeywords = ['adapter', 'http', 'chat', 'provider'];
      for (const keyword of adapterKeywords) {
        expect(kernelMethods.some(m => m.toLowerCase().includes(keyword))).toBe(false);
      }
    });
  });

  describe('State Isolation', () => {
    it('isolates context between operations', async () => {
      await kernel.start();
      const ctx1 = kernel.context();
      const ctx2 = kernel.context();
      expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
    });
  });
});
