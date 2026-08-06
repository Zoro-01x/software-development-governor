/**
 * Kernel Contract Types
 * 
 * These are the contracts that the bridge translates to.
 * These types come from the Governance Framework kernel.
 * DO NOT MODIFY - these are the source of truth for governance events.
 */

// ============================================================================
// Event Types
// ============================================================================

export type GovernanceEventType =
  | 'governance:tool:before'
  | 'governance:tool:after'
  | 'governance:permission:request'
  | 'governance:permission:response'
  | 'governance:message:received'
  | 'governance:message:transform'
  | 'governance:system:transform'
  | 'governance:compaction:transform';

// ============================================================================
// Event Payloads
// ============================================================================

export interface ToolBeforePayload {
  toolName: string;
  toolType: string;
  args: Record<string, unknown>;
  correlationId: string;
}

export interface ToolAfterPayload {
  toolName: string;
  toolType: string;
  result?: unknown;
  error?: string;
  correlationId: string;
}

export interface PermissionRequestPayload {
  permissionType: string;
  toolName?: string;
  args?: Record<string, unknown>;
  correlationId: string;
}

export interface PermissionResponsePayload {
  status: 'allow' | 'deny' | 'ask';
  correlationId: string;
}

export interface MessageReceivedPayload {
  role: 'user' | 'assistant' | 'system';
  content: unknown;
  correlationId: string;
}

export interface MessageTransformPayload {
  role: 'user' | 'assistant' | 'system';
  content: unknown;
  correlationId: string;
}

export interface SystemTransformPayload {
  systemPrompt: string[];
  correlationId: string;
}

export interface CompactionTransformPayload {
  context: string[];
  correlationId: string;
}

// ============================================================================
// Governance Event
// ============================================================================

export interface GovernanceEvent {
  readonly type: GovernanceEventType;
  readonly timestamp: Date;
  readonly correlationId: string;
  readonly payload: unknown;
}

// ============================================================================
// Governance Decision
// ============================================================================

export type GovernanceDecision =
  | { action: 'allow' }
  | { action: 'deny'; reason?: string }
  | { action: 'transform'; transform: unknown }
  | { action: 'passthrough' };

// ============================================================================
// Bridge Interface
// ============================================================================

export interface GovernanceBridge {
  translateToolBefore(
    input: { name: string; type: string; args: Record<string, unknown> },
    output: { args: Record<string, unknown> }
  ): Promise<GovernanceEvent>;
  
  translateToolAfter(
    input: { name: string; type: string },
    output: { result?: unknown; error?: string }
  ): Promise<GovernanceEvent>;
  
  translatePermissionRequest(
    input: { type: string; tool?: string; args?: Record<string, unknown> },
    output: { status: 'allow' | 'deny' | 'ask' }
  ): Promise<GovernanceEvent>;
  
  translateMessageReceived(
    input: { parts: unknown[]; role: string },
    output: { parts: unknown[] }
  ): Promise<GovernanceEvent>;
  
  translateSystemTransform(
    input: { system: string[] },
    output: { system: string[] }
  ): Promise<GovernanceEvent>;
  
  translateCompactionTransform(
    input: { context: string[] },
    output: { context: string[]; prompt?: string }
  ): Promise<GovernanceEvent>;
}
