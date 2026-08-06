/**
 * Kernel Implementation
 * 
 * ADR-003: Immutable Kernel
 * Status: FROZEN
 */

import {
  Kernel,
  KernelState,
  KernelEvent,
  KernelEventType,
  KernelContext,
  KernelConfig,
  KernelError,
  EventHandler,
  Subscription,
  Injectable,
  ExtensionDescriptor,
} from './types.js';
import { EventBus, InMemoryEventBus } from './event-bus.js';
import { Container, InMemoryContainer } from './container.js';
import { ContextManager, InMemoryContextManager } from './context.js';
import { ExtensionLoader, DefaultExtensionLoader } from './extension-loader.js';

export class GovernanceKernel implements Kernel {
  private state: KernelState = 'initializing';
  private eventBus: EventBus;
  private container: Container;
  private contextManager: ContextManager;
  private extensionLoader: ExtensionLoader;
  private config: KernelConfig;
  private startOrder: string[] = [];
  private stopOrder: string[] = [];

  constructor(config: KernelConfig = {}) {
    this.config = config;
    this.eventBus = new InMemoryEventBus();
    this.container = new InMemoryContainer();
    this.contextManager = new InMemoryContextManager();
    this.extensionLoader = new DefaultExtensionLoader();

    this.container.register('event-bus', this.eventBus);
    this.container.register('container', this.container);
    this.container.register('context-manager', this.contextManager);
    this.container.register('extension-loader', this.extensionLoader);
    this.container.register('kernel', this);
  }

  async start(): Promise<void> {
    if (this.state !== 'initializing' && this.state !== 'stopped') {
      throw new KernelError('ALREADY_STARTED', `Kernel already started. State: ${this.state}`);
    }

    this.state = 'booting';
    this.emit({
      type: 'kernel:booting',
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
    });

    await this.initializeExtensions();

    this.state = 'ready';
    this.emit({
      type: 'kernel:ready',
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
    });

    this.state = 'running';
  }

  async stop(): Promise<void> {
    if (this.state !== 'running' && this.state !== 'ready') {
      throw new KernelError('NOT_STARTED', `Kernel not started. State: ${this.state}`);
    }

    this.state = 'stopping';
    this.emit({
      type: 'kernel:stopping',
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
    });

    await this.shutdownExtensions();

    this.state = 'stopped';
    this.emit({
      type: 'kernel:stopped',
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
    });

    this.eventBus.clear();
    this.container.clear();
    this.contextManager.clear();
  }

  register<T>(token: string, implementation: T, dependencies?: string[]): void {
    this.container.register(token, implementation, dependencies);
  }

  resolve<T>(token: string): T {
    return this.container.resolve<T>(token);
  }

  emit(event: KernelEvent): void {
    this.eventBus.emit(event);
  }

  subscribe(eventType: string, handler: EventHandler): Subscription {
    return this.eventBus.subscribe(eventType, handler);
  }

  context(): KernelContext {
    return this.contextManager.create();
  }

  async loadExtension(descriptor: ExtensionDescriptor): Promise<void> {
    await this.extensionLoader.load(descriptor);
    this.startOrder.push(descriptor.id);

    this.emit({
      type: 'extension:registered',
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
      payload: descriptor,
    });
  }

  async activateExtension(id: string): Promise<void> {
    await this.extensionLoader.activate(id);
    this.stopOrder.unshift(id);

    this.emit({
      type: 'extension:activated',
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
      payload: { id },
    });
  }

  async deactivateExtension(id: string): Promise<void> {
    await this.extensionLoader.deactivate(id);

    this.emit({
      type: 'extension:deactivated',
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
      payload: { id },
    });
  }

  private async initializeExtensions(): Promise<void> {
    const descriptors = this.extensionLoader.list();
    const sorted = this.topologicalSort(descriptors);

    for (const descriptor of sorted) {
      try {
        await this.extensionLoader.activate(descriptor.id);
        this.stopOrder.unshift(descriptor.id);
      } catch (error) {
        this.emit({
          type: 'extension:error',
          timestamp: new Date(),
          correlationId: this.generateCorrelationId(),
          payload: { id: descriptor.id, error },
        });
      }
    }
  }

  private async shutdownExtensions(): Promise<void> {
    for (const id of this.stopOrder) {
      try {
        await this.extensionLoader.deactivate(id);
        this.emit({
          type: 'extension:deactivated',
          timestamp: new Date(),
          correlationId: this.generateCorrelationId(),
          payload: { id },
        });
      } catch (error) {
        this.emit({
          type: 'extension:error',
          timestamp: new Date(),
          correlationId: this.generateCorrelationId(),
          payload: { id, error },
        });
      }
    }
    this.stopOrder = [];
    this.startOrder = [];
  }

  private topologicalSort(descriptors: ExtensionDescriptor[]): ExtensionDescriptor[] {
    const sorted: ExtensionDescriptor[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new KernelError('CIRCULAR_DEPENDENCY', `Circular dependency detected: ${id}`);
      }

      visiting.add(id);

      const descriptor = descriptors.find(d => d.id === id);
      if (descriptor?.dependencies) {
        for (const dep of descriptor.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(id);
      visited.add(id);

      if (descriptor) {
        sorted.push(descriptor);
      }
    };

    for (const descriptor of descriptors) {
      visit(descriptor.id);
    }

    return sorted;
  }

  private generateCorrelationId(): string {
    return `kernel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
