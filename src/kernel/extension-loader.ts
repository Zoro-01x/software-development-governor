/**
 * Extension Loader
 * 
 * ADR-003: Immutable Kernel
 * Status: FROZEN
 */

import { ExtensionDescriptor, KernelError } from './types.js';

export interface ExtensionLoader {
  load(descriptor: ExtensionDescriptor): Promise<void>;
  activate(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  unload(id: string): Promise<void>;
  isLoaded(id: string): boolean;
  list(): ExtensionDescriptor[];
}

export class DefaultExtensionLoader implements ExtensionLoader {
  private loaded = new Map<string, ExtensionDescriptor>();
  private activated = new Set<string>();

  async load(descriptor: ExtensionDescriptor): Promise<void> {
    if (this.loaded.has(descriptor.id)) {
      throw new KernelError('EXTENSION_FAILED', `Extension already loaded: ${descriptor.id}`);
    }

    if (descriptor.dependencies) {
      for (const dep of descriptor.dependencies) {
        if (!this.loaded.has(dep)) {
          throw new KernelError(
            'DEPENDENCY_MISSING',
            `Missing dependency: ${dep} for extension: ${descriptor.id}`
          );
        }
      }
    }

    this.loaded.set(descriptor.id, descriptor);
  }

  async activate(id: string): Promise<void> {
    const descriptor = this.loaded.get(id);
    if (!descriptor) {
      throw new KernelError('EXTENSION_FAILED', `Extension not loaded: ${id}`);
    }

    if (this.activated.has(id)) {
      throw new KernelError('EXTENSION_FAILED', `Extension already activated: ${id}`);
    }

    this.activated.add(id);
  }

  async deactivate(id: string): Promise<void> {
    if (!this.activated.has(id)) {
      throw new KernelError('EXTENSION_FAILED', `Extension not activated: ${id}`);
    }

    this.activated.delete(id);
  }

  async unload(id: string): Promise<void> {
    if (this.activated.has(id)) {
      await this.deactivate(id);
    }

    this.loaded.delete(id);
  }

  isLoaded(id: string): boolean {
    return this.loaded.has(id);
  }

  list(): ExtensionDescriptor[] {
    return Array.from(this.loaded.values());
  }

  clear(): void {
    this.loaded.clear();
    this.activated.clear();
  }
}
