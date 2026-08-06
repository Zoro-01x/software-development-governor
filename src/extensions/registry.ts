/**
 * Extension Registry
 * 
 * ADR-002: Extension Model
 * Status: FROZEN
 */

import {
  VersionedExtension,
  ExtensionRegistryEntry,
  ExtensionState,
  ExtensionError,
  ExtensionErrorCode,
  ExtensionPointType,
  ExtensionValidationResult,
  SUPPORTED_VERSION_RANGES,
  isVersionCompatible,
} from './types.js';

export class ExtensionRegistry {
  private extensions = new Map<ExtensionPointType, Map<string, ExtensionRegistryEntry<VersionedExtension>>>();

  constructor() {
    const types: ExtensionPointType[] = [
      'adapter', 'strategy', 'rule', 'policy',
      'graph', 'memory', 'tool', 'observability'
    ];
    for (const type of types) {
      this.extensions.set(type, new Map());
    }
  }

  register<T extends VersionedExtension>(extension: T): void {
    const type = extension.type;
    const registry = this.extensions.get(type);
    if (!registry) {
      throw new ExtensionError(
        extension.id,
        'REGISTRATION_FAILED',
        `Unknown extension type: ${type}`
      );
    }

    if (registry.has(extension.id)) {
      throw new ExtensionError(
        extension.id,
        'DUPLICATE_ID',
        `Extension with id "${extension.id}" already registered`
      );
    }

    const versionRange = SUPPORTED_VERSION_RANGES[type];
    if (!isVersionCompatible(extension.version, versionRange)) {
      throw new ExtensionError(
        extension.id,
        'INCOMPATIBLE_VERSION',
        `Version ${extension.version} is not compatible with range ${versionRange}`
      );
    }

    if (extension.validate) {
      const result = extension.validate();
      if (!result.valid) {
        throw new ExtensionError(
          extension.id,
          'VALIDATION_FAILED',
          `Validation failed: ${result.errors.join(', ')}`
        );
      }
    }

    const entry: ExtensionRegistryEntry<T> = {
      extension,
      registeredAt: new Date(),
      state: 'registered',
    };

    registry.set(extension.id, entry as ExtensionRegistryEntry<VersionedExtension>);
  }

  activate(id: string, type: ExtensionPointType): void {
    const registry = this.extensions.get(type);
    if (!registry) {
      throw new ExtensionError(id, 'ACTIVATION_FAILED', `Unknown extension type: ${type}`);
    }

    const entry = registry.get(id);
    if (!entry) {
      throw new ExtensionError(id, 'ACTIVATION_FAILED', `Extension not found: ${id}`);
    }

    if (entry.state !== 'registered' && entry.state !== 'deactivated') {
      throw new ExtensionError(
        id,
        'ACTIVATION_FAILED',
        `Cannot activate extension in state: ${entry.state}`
      );
    }

    const mutableEntry = entry as ExtensionRegistryEntry<VersionedExtension> & { state: ExtensionState; activatedAt?: Date };
    mutableEntry.state = 'activated';
    mutableEntry.activatedAt = new Date();
  }

  deactivate(id: string, type: ExtensionPointType): void {
    const registry = this.extensions.get(type);
    if (!registry) {
      throw new ExtensionError(id, 'ACTIVATION_FAILED', `Unknown extension type: ${type}`);
    }

    const entry = registry.get(id);
    if (!entry) {
      throw new ExtensionError(id, 'ACTIVATION_FAILED', `Extension not found: ${id}`);
    }

    if (entry.state !== 'activated') {
      throw new ExtensionError(
        id,
        'ACTIVATION_FAILED',
        `Cannot deactivate extension in state: ${entry.state}`
      );
    }

    const mutableEntry = entry as ExtensionRegistryEntry<VersionedExtension> & { state: ExtensionState };
    mutableEntry.state = 'deactivated';
  }

  get<T extends VersionedExtension>(id: string, type: ExtensionPointType): T | undefined {
    const registry = this.extensions.get(type);
    if (!registry) return undefined;

    const entry = registry.get(id);
    if (!entry || entry.state !== 'activated') return undefined;

    return entry.extension as T;
  }

  getAll<T extends VersionedExtension>(type: ExtensionPointType): T[] {
    const registry = this.extensions.get(type);
    if (!registry) return [];

    return Array.from(registry.values())
      .filter(entry => entry.state === 'activated')
      .map(entry => entry.extension as T);
  }

  has(id: string, type: ExtensionPointType): boolean {
    const registry = this.extensions.get(type);
    if (!registry) return false;

    const entry = registry.get(id);
    return entry !== undefined && entry.state === 'activated';
  }

  list(type: ExtensionPointType): Array<{ id: string; version: string; state: ExtensionState }> {
    const registry = this.extensions.get(type);
    if (!registry) return [];

    return Array.from(registry.values()).map(entry => ({
      id: entry.extension.id,
      version: entry.extension.version,
      state: entry.state,
    }));
  }

  validate(id: string, type: ExtensionPointType): ExtensionValidationResult {
    const registry = this.extensions.get(type);
    if (!registry) {
      return { valid: false, errors: [`Unknown extension type: ${type}`], warnings: [] };
    }

    const entry = registry.get(id);
    if (!entry) {
      return { valid: false, errors: [`Extension not found: ${id}`], warnings: [] };
    }

    if (entry.extension.validate) {
      return entry.extension.validate();
    }

    return { valid: true, errors: [], warnings: [] };
  }

  clear(type?: ExtensionPointType): void {
    if (type) {
      const registry = this.extensions.get(type);
      if (registry) registry.clear();
    } else {
      for (const registry of this.extensions.values()) {
        registry.clear();
      }
    }
  }
}
