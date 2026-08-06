import { describe, it, expect, beforeEach } from 'vitest';
import {
  VersionedExtension,
  ExtensionRegistryEntry,
  ExtensionState,
  ExtensionError,
  ExtensionErrorCode,
  ExtensionPointType,
  ExtensionValidationResult,
  parseSemver,
  isVersionCompatible,
  SUPPORTED_VERSION_RANGES,
} from '../../src/extensions/types.js';
import { ExtensionRegistry } from '../../src/extensions/registry.js';

class TestAdapter implements VersionedExtension {
  readonly type = 'adapter' as const;
  constructor(
    public readonly id: string,
    public readonly version: string = '1.0.0',
    public readonly name: string = `Test Adapter ${id}`
  ) {}

  validate(): ExtensionValidationResult {
    return { valid: true, errors: [], warnings: [] };
  }
}

class TestStrategy implements VersionedExtension {
  readonly type = 'strategy' as const;
  constructor(
    public readonly id: string,
    public readonly version: string = '1.0.0',
    public readonly name: string = `Test Strategy ${id}`
  ) {}

  validate(): ExtensionValidationResult {
    return { valid: true, errors: [], warnings: [] };
  }
}

class InvalidAdapter implements VersionedExtension {
  readonly type = 'adapter' as const;
  readonly id = 'invalid';
  readonly version = 'invalid-version';
  readonly name = 'Invalid Adapter';

  validate(): ExtensionValidationResult {
    return { valid: false, errors: ['Invalid version format'], warnings: [] };
  }
}

class IncompatibleAdapter implements VersionedExtension {
  readonly type = 'adapter' as const;
  readonly id = 'incompatible';
  readonly version = '3.0.0';
  readonly name = 'Incompatible Adapter';
}

describe('Extension Model (ADR-002)', () => {
  let registry: ExtensionRegistry;

  beforeEach(() => {
    registry = new ExtensionRegistry();
  });

  describe('Extension Substitution', () => {
    it('can register and retrieve different adapters', () => {
      const adapter1 = new TestAdapter('adapter-1', '1.0.0', 'Adapter 1');
      const adapter2 = new TestAdapter('adapter-2', '1.0.0', 'Adapter 2');

      registry.register(adapter1);
      registry.register(adapter2);

      expect(registry.has('adapter-1', 'adapter')).toBe(false);
      expect(registry.has('adapter-2', 'adapter')).toBe(false);

      registry.activate('adapter-1', 'adapter');
      expect(registry.has('adapter-1', 'adapter')).toBe(true);
      expect(registry.has('adapter-2', 'adapter')).toBe(false);

      registry.deactivate('adapter-1', 'adapter');
      registry.activate('adapter-2', 'adapter');
      expect(registry.has('adapter-1', 'adapter')).toBe(false);
      expect(registry.has('adapter-2', 'adapter')).toBe(true);
    });

    it('can register and retrieve different strategies', () => {
      const strategy1 = new TestStrategy('strategy-1', '1.0.0', 'Strategy 1');
      const strategy2 = new TestStrategy('strategy-2', '1.0.0', 'Strategy 2');

      registry.register(strategy1);
      registry.register(strategy2);

      registry.activate('strategy-1', 'strategy');
      expect(registry.get('strategy-1', 'strategy')).toBeDefined();
      expect(registry.get('strategy-2', 'strategy')).toBeUndefined();

      registry.deactivate('strategy-1', 'strategy');
      registry.activate('strategy-2', 'strategy');
      expect(registry.get('strategy-1', 'strategy')).toBeUndefined();
      expect(registry.get('strategy-2', 'strategy')).toBeDefined();
    });
  });

  describe('Multiple Extension Coexistence', () => {
    it('can activate multiple adapters simultaneously', () => {
      const adapter1 = new TestAdapter('adapter-1', '1.0.0');
      const adapter2 = new TestAdapter('adapter-2', '1.0.0');
      const adapter3 = new TestAdapter('adapter-3', '1.0.0');

      registry.register(adapter1);
      registry.register(adapter2);
      registry.register(adapter3);

      registry.activate('adapter-1', 'adapter');
      registry.activate('adapter-2', 'adapter');
      registry.activate('adapter-3', 'adapter');

      expect(registry.has('adapter-1', 'adapter')).toBe(true);
      expect(registry.has('adapter-2', 'adapter')).toBe(true);
      expect(registry.has('adapter-3', 'adapter')).toBe(true);

      const allAdapters = registry.getAll('adapter');
      expect(allAdapters).toHaveLength(3);
    });

    it('can activate extensions of different types simultaneously', () => {
      const adapter = new TestAdapter('adapter-1', '1.0.0');
      const strategy = new TestStrategy('strategy-1', '1.0.0');

      registry.register(adapter);
      registry.register(strategy);

      registry.activate('adapter-1', 'adapter');
      registry.activate('strategy-1', 'strategy');

      expect(registry.has('adapter-1', 'adapter')).toBe(true);
      expect(registry.has('strategy-1', 'strategy')).toBe(true);
    });
  });

  describe('Invalid Extension Rejection', () => {
    it('rejects extension with invalid version', () => {
      const invalid = new InvalidAdapter();
      expect(() => registry.register(invalid)).toThrow(ExtensionError);
    });

    it('rejects extension with incompatible version', () => {
      const incompatible = new IncompatibleAdapter();
      expect(() => registry.register(incompatible)).toThrow(ExtensionError);
    });

    it('rejects duplicate extension id', () => {
      const adapter1 = new TestAdapter('adapter-1', '1.0.0');
      const adapter2 = new TestAdapter('adapter-1', '1.0.0');

      registry.register(adapter1);
      expect(() => registry.register(adapter2)).toThrow(ExtensionError);
    });

    it('throws ExtensionError with correct code', () => {
      const invalid = new InvalidAdapter();
      try {
        registry.register(invalid);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ExtensionError);
        expect((e as ExtensionError).code).toBe('INCOMPATIBLE_VERSION');
      }
    });
  });

  describe('Missing Extension Recovery', () => {
    it('returns undefined for non-existent extension', () => {
      expect(registry.get('non-existent', 'adapter')).toBeUndefined();
    });

    it('returns empty array for non-existent type', () => {
      expect(registry.getAll('adapter')).toHaveLength(0);
    });

    it('has returns false for non-existent extension', () => {
      expect(registry.has('non-existent', 'adapter')).toBe(false);
    });

    it('list returns empty array for non-existent type', () => {
      expect(registry.list('adapter')).toHaveLength(0);
    });

    it('validate returns error for non-existent extension', () => {
      const result = registry.validate('non-existent', 'adapter');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Version Compatibility', () => {
    it('parses valid semver', () => {
      const parsed = parseSemver('1.2.3');
      expect(parsed).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('returns null for invalid semver', () => {
      expect(parseSemver('invalid')).toBeNull();
      expect(parseSemver('1.2')).toBeNull();
      expect(parseSemver('v1.2.3')).toBeNull();
    });

    it('checks version compatibility', () => {
      expect(isVersionCompatible('1.0.0', '>=1.0.0')).toBe(true);
      expect(isVersionCompatible('2.0.0', '>=1.0.0')).toBe(true);
      expect(isVersionCompatible('0.9.0', '>=1.0.0')).toBe(false);
    });

    it('accepts compatible versions', () => {
      const adapter = new TestAdapter('adapter-1', '1.0.0');
      expect(() => registry.register(adapter)).not.toThrow();
    });

    it('rejects incompatible versions', () => {
      const adapter = new TestAdapter('adapter-1', '3.0.0');
      expect(() => registry.register(adapter)).toThrow(ExtensionError);
    });
  });

  describe('Extension Lifecycle', () => {
    it('tracks extension state', () => {
      const adapter = new TestAdapter('adapter-1', '1.0.0');
      registry.register(adapter);

      let list = registry.list('adapter');
      expect(list[0].state).toBe('registered');

      registry.activate('adapter-1', 'adapter');
      list = registry.list('adapter');
      expect(list[0].state).toBe('activated');

      registry.deactivate('adapter-1', 'adapter');
      list = registry.list('adapter');
      expect(list[0].state).toBe('deactivated');
    });

    it('prevents activation of already activated extension', () => {
      const adapter = new TestAdapter('adapter-1', '1.0.0');
      registry.register(adapter);
      registry.activate('adapter-1', 'adapter');

      expect(() => registry.activate('adapter-1', 'adapter')).toThrow(ExtensionError);
    });

    it('prevents deactivation of non-activated extension', () => {
      const adapter = new TestAdapter('adapter-1', '1.0.0');
      registry.register(adapter);

      expect(() => registry.deactivate('adapter-1', 'adapter')).toThrow(ExtensionError);
    });
  });

  describe('Registry Operations', () => {
    it('lists all registered extensions', () => {
      const adapter1 = new TestAdapter('adapter-1', '1.0.0');
      const adapter2 = new TestAdapter('adapter-2', '1.0.0');

      registry.register(adapter1);
      registry.register(adapter2);

      const list = registry.list('adapter');
      expect(list).toHaveLength(2);
      expect(list.map(e => e.id)).toContain('adapter-1');
      expect(list.map(e => e.id)).toContain('adapter-2');
    });

    it('clears all extensions of a type', () => {
      const adapter1 = new TestAdapter('adapter-1', '1.0.0');
      const adapter2 = new TestAdapter('adapter-2', '1.0.0');

      registry.register(adapter1);
      registry.register(adapter2);

      registry.clear('adapter');
      expect(registry.list('adapter')).toHaveLength(0);
    });

    it('clears all extensions', () => {
      const adapter = new TestAdapter('adapter-1', '1.0.0');
      const strategy = new TestStrategy('strategy-1', '1.0.0');

      registry.register(adapter);
      registry.register(strategy);

      registry.clear();
      expect(registry.list('adapter')).toHaveLength(0);
      expect(registry.list('strategy')).toHaveLength(0);
    });
  });
});
