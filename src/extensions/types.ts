/**
 * Extension Point Base Interfaces
 * 
 * ADR-002: Extension Model
 * Status: FROZEN
 */

export const SUPPORTED_VERSION_RANGES = {
  adapter: '>=1.0.0 <2.0.0',
  strategy: '>=1.0.0 <2.0.0',
  rule: '>=1.0.0 <2.0.0',
  policy: '>=1.0.0 <2.0.0',
  graph: '>=1.0.0 <2.0.0',
  memory: '>=1.0.0 <2.0.0',
  tool: '>=1.0.0 <2.0.0',
  observability: '>=1.0.0 <2.0.0',
} as const;

export type ExtensionPointType = 
  | 'adapter' 
  | 'strategy' 
  | 'rule' 
  | 'policy' 
  | 'graph' 
  | 'memory' 
  | 'tool' 
  | 'observability';

export interface ExtensionMetadata {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description?: string;
  readonly author?: string;
  readonly dependencies?: string[];
}

export interface ExtensionValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export interface ExtensionLifecycle {
  onRegister?(): Promise<void>;
  onActivate?(): Promise<void>;
  onDeactivate?(): Promise<void>;
  onDestroy?(): Promise<void>;
}

export interface VersionedExtension extends ExtensionMetadata, ExtensionLifecycle {
  readonly type: ExtensionPointType;
  
  validate?(): ExtensionValidationResult;
  getCapabilities?(): Record<string, unknown>;
}

export interface ExtensionRegistryEntry<T extends VersionedExtension> {
  readonly extension: T;
  readonly registeredAt: Date;
  readonly activatedAt?: Date;
  readonly state: ExtensionState;
}

export type ExtensionState = 
  | 'registered' 
  | 'validated' 
  | 'activated' 
  | 'deactivated' 
  | 'error';

export class ExtensionError extends Error {
  constructor(
    public readonly extensionId: string,
    public readonly code: ExtensionErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(`[${extensionId}] ${message}`);
    this.name = 'ExtensionError';
  }
}

export type ExtensionErrorCode = 
  | 'INVALID_VERSION'
  | 'DUPLICATE_ID'
  | 'VALIDATION_FAILED'
  | 'REGISTRATION_FAILED'
  | 'ACTIVATION_FAILED'
  | 'INCOMPATIBLE_VERSION'
  | 'MISSING_DEPENDENCY';

export function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

export function isVersionCompatible(version: string, range: string): boolean {
  const parsed = parseSemver(version);
  if (!parsed) return false;

  const versionNum = parsed.major * 10000 + parsed.minor * 100 + parsed.patch;

  const parts = range.split(/\s+/);
  for (const part of parts) {
    const match = part.match(/^(>=|>|<=|<)?(\d+)\.(\d+)\.(\d+)$/);
    if (!match) continue;

    const operator = match[1] || '>=';
    const target = {
      major: parseInt(match[2], 10),
      minor: parseInt(match[3], 10),
      patch: parseInt(match[4], 10),
    };

    const targetNum = target.major * 10000 + target.minor * 100 + target.patch;

    switch (operator) {
      case '>=':
        if (versionNum < targetNum) return false;
        break;
      case '>':
        if (versionNum <= targetNum) return false;
        break;
      case '<=':
        if (versionNum > targetNum) return false;
        break;
      case '<':
        if (versionNum >= targetNum) return false;
        break;
      default:
        return false;
    }
  }

  return true;
}
