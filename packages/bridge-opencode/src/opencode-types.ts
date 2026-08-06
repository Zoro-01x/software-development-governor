/**
 * Open Code Event Types
 * 
 * These are the exact types from Open Code's plugin API.
 * DO NOT MODIFY - these are the source of truth for Open Code events.
 */

// ============================================================================
// Tool Events
// ============================================================================

export interface OpenCodeToolExecuteBeforeInput {
  name: string;
  type: string;
  args: Record<string, unknown>;
}

export interface OpenCodeToolExecuteBeforeOutput {
  args: Record<string, unknown>;
}

export interface OpenCodeToolExecuteAfterInput {
  name: string;
  type: string;
}

export interface OpenCodeToolExecuteAfterOutput {
  result?: unknown;
  error?: string;
}

// ============================================================================
// Permission Events
// ============================================================================

export type OpenCodePermissionType = 
  | 'bash'
  | 'edit'
  | 'write'
  | 'read'
  | 'glob'
  | 'grep'
  | string;

export interface OpenCodePermissionAskInput {
  type: OpenCodePermissionType;
  tool?: string;
  args?: Record<string, unknown>;
}

export interface OpenCodePermissionAskOutput {
  status: 'allow' | 'deny' | 'ask';
}

// ============================================================================
// Chat Events
// ============================================================================

export interface OpenCodeChatMessagePart {
  type: 'text' | 'image' | 'tool-result';
  text?: string;
  image?: string;
  toolResult?: unknown;
}

export interface OpenCodeChatMessageInput {
  parts: OpenCodeChatMessagePart[];
  role: 'user' | 'assistant' | 'system';
}

export interface OpenCodeChatMessageOutput {
  parts: OpenCodeChatMessagePart[];
}

// ============================================================================
// System Transform Events
// ============================================================================

export interface OpenCodeSystemTransformInput {
  system: string[];
}

export interface OpenCodeSystemTransformOutput {
  system: string[];
}

// ============================================================================
// Session Compacting Events
// ============================================================================

export interface OpenCodeSessionCompactingInput {
  context: string[];
}

export interface OpenCodeSessionCompactingOutput {
  context: string[];
  prompt?: string;
}

// ============================================================================
// Plugin Context
// ============================================================================

export interface OpenCodePluginContext {
  project: {
    name: string;
    path: string;
  };
  directory: string;
  worktree: string;
  client: unknown;
  $: unknown;
}
