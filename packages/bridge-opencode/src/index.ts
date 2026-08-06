/**
 * @framework/bridge-opencode
 * 
 * Pure translation layer between Open Code lifecycle events and Governance Kernel contracts.
 * 
 * This package contains ZERO governance logic.
 * This package contains ZERO provider logic.
 * This package only maps events.
 * 
 * The bridge is replaceable.
 * The framework must run without Open Code.
 * Open Code must run without the framework.
 */

// Export Open Code types
export type {
  OpenCodeToolExecuteBeforeInput,
  OpenCodeToolExecuteBeforeOutput,
  OpenCodeToolExecuteAfterInput,
  OpenCodeToolExecuteAfterOutput,
  OpenCodePermissionAskInput,
  OpenCodePermissionAskOutput,
  OpenCodeChatMessageInput,
  OpenCodeChatMessageOutput,
  OpenCodeChatMessagePart,
  OpenCodeSystemTransformInput,
  OpenCodeSystemTransformOutput,
  OpenCodeSessionCompactingInput,
  OpenCodeSessionCompactingOutput,
  OpenCodePluginContext,
  OpenCodePermissionType,
} from './opencode-types.js';

// Export Kernel contract types
export type {
  GovernanceEventType,
  GovernanceEvent,
  GovernanceDecision,
  GovernanceBridge,
  ToolBeforePayload,
  ToolAfterPayload,
  PermissionRequestPayload,
  PermissionResponsePayload,
  MessageReceivedPayload,
  MessageTransformPayload,
  SystemTransformPayload,
  CompactionTransformPayload,
} from './kernel-types.js';

// Export bridge implementation
export {
  OpenCodeBridge,
  createOpenCodeBridge,
  createOpenCodePlugin,
} from './bridge.js';
