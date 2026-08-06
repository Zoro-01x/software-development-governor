/**
 * Dependency Injection Container
 * 
 * ADR-003: Immutable Kernel
 * Status: FROZEN
 */

import { Injectable, KernelError } from './types.js';

export interface Container {
  register<T>(token: string, implementation: T, dependencies?: string[]): void;
  resolve<T>(token: string): T;
  has(token: string): boolean;
  clear(): void;
}

export class InMemoryContainer implements Container {
  private services = new Map<string, Injectable>();
  private resolutionStack: string[] = [];

  register<T>(token: string, implementation: T, dependencies?: string[]): void {
    if (this.services.has(token)) {
      throw new KernelError('INVALID_TOKEN', `Token already registered: ${token}`);
    }

    this.services.set(token, {
      token,
      implementation,
      dependencies,
    });
  }

  resolve<T>(token: string): T {
    if (this.resolutionStack.includes(token)) {
      throw new KernelError(
        'CIRCULAR_DEPENDENCY',
        `Circular dependency detected: ${this.resolutionStack.join(' → ')} → ${token}`
      );
    }

    const injectable = this.services.get(token);
    if (!injectable) {
      throw new KernelError('DEPENDENCY_MISSING', `Dependency not found: ${token}`);
    }

    this.resolutionStack.push(token);

    try {
      const impl = injectable.implementation as T;
      this.resolutionStack.pop();
      return impl;
    } catch (error) {
      this.resolutionStack.pop();
      throw error;
    }
  }

  has(token: string): boolean {
    return this.services.has(token);
  }

  clear(): void {
    this.services.clear();
    this.resolutionStack = [];
  }
}
