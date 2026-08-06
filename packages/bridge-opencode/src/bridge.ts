/**
 * Open Code Bridge
 * 
 * Pure translation layer between Open Code lifecycle events and Governance Kernel contracts.
 * 
 * RULES:
 * - Zero governance logic
 * - Zero provider logic
 * - Only maps events
 * - Bridge is replaceable
 * - Framework must run without Open Code
 * - Open Code must run without Framework
 */

import {
  OpenCodeToolExecuteBeforeInput,
  OpenCodeToolExecuteBeforeOutput,
  OpenCodeToolExecuteAfterInput,
  OpenCodeToolExecuteAfterOutput,
  OpenCodePermissionAskInput,
  OpenCodePermissionAskOutput,
  OpenCodeChatMessageInput,
  OpenCodeChatMessageOutput,
  OpenCodeSystemTransformInput,
  OpenCodeSystemTransformOutput,
  OpenCodeSessionCompactingInput,
  OpenCodeSessionCompactingOutput,
  OpenCodePluginContext,
} from './opencode-types.js';

import {
  GovernanceEvent,
  GovernanceEventType,
  GovernanceDecision,
  GovernanceBridge,
  ToolBeforePayload,
  ToolAfterPayload,
  PermissionRequestPayload,
  MessageReceivedPayload,
  SystemTransformPayload,
  CompactionTransformPayload,
} from './kernel-types.js';

// ============================================================================
// Correlation ID Generator
// ============================================================================

function generateCorrelationId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============================================================================
// Event Factory
// ============================================================================

function createEvent(
  type: GovernanceEventType,
  payload: unknown
): GovernanceEvent {
  return {
    type,
    timestamp: new Date(),
    correlationId: generateCorrelationId(),
    payload,
  };
}

// ============================================================================
// Bridge Implementation
// ============================================================================

export class OpenCodeBridge implements GovernanceBridge {
  private eventHandlers: Map<GovernanceEventType, (event: GovernanceEvent) => Promise<GovernanceDecision>> = new Map();

  /**
   * Register a handler for governance events.
   * This is the ONLY way to connect the bridge to the framework.
   */
  onEvent(
    eventType: GovernanceEventType,
    handler: (event: GovernanceEvent) => Promise<GovernanceDecision>
  ): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Translate tool.execute.before hook to governance event.
   */
  async translateToolBefore(
    input: OpenCodeToolExecuteBeforeInput,
    output: OpenCodeToolExecuteBeforeOutput
  ): Promise<GovernanceEvent> {
    const payload: ToolBeforePayload = {
      toolName: input.name,
      toolType: input.type,
      args: { ...input.args },
      correlationId: generateCorrelationId(),
    };

    return createEvent('governance:tool:before', payload);
  }

  /**
   * Translate tool.execute.after hook to governance event.
   */
  async translateToolAfter(
    input: OpenCodeToolExecuteAfterInput,
    output: OpenCodeToolExecuteAfterOutput
  ): Promise<GovernanceEvent> {
    const payload: ToolAfterPayload = {
      toolName: input.name,
      toolType: input.type,
      result: output.result,
      error: output.error,
      correlationId: generateCorrelationId(),
    };

    return createEvent('governance:tool:after', payload);
  }

  /**
   * Translate permission.ask hook to governance event.
   */
  async translatePermissionRequest(
    input: OpenCodePermissionAskInput,
    output: OpenCodePermissionAskOutput
  ): Promise<GovernanceEvent> {
    const payload: PermissionRequestPayload = {
      permissionType: input.type,
      toolName: input.tool,
      args: input.args ? { ...input.args } : undefined,
      correlationId: generateCorrelationId(),
    };

    return createEvent('governance:permission:request', payload);
  }

  /**
   * Translate chat.message hook to governance event.
   */
  async translateMessageReceived(
    input: OpenCodeChatMessageInput,
    output: OpenCodeChatMessageOutput
  ): Promise<GovernanceEvent> {
    const payload: MessageReceivedPayload = {
      role: input.role as 'user' | 'assistant' | 'system',
      content: { parts: [...input.parts] },
      correlationId: generateCorrelationId(),
    };

    return createEvent('governance:message:received', payload);
  }

  /**
   * Translate experimental.chat.system.transform hook to governance event.
   */
  async translateSystemTransform(
    input: OpenCodeSystemTransformInput,
    output: OpenCodeSystemTransformOutput
  ): Promise<GovernanceEvent> {
    const payload: SystemTransformPayload = {
      systemPrompt: [...input.system],
      correlationId: generateCorrelationId(),
    };

    return createEvent('governance:system:transform', payload);
  }

  /**
   * Translate experimental.session.compacting hook to governance event.
   */
  async translateCompactionTransform(
    input: OpenCodeSessionCompactingInput,
    output: OpenCodeSessionCompactingOutput
  ): Promise<GovernanceEvent> {
    const payload: CompactionTransformPayload = {
      context: [...input.context],
      correlationId: generateCorrelationId(),
    };

    return createEvent('governance:compaction:transform', payload);
  }

  /**
   * Process a governance decision and apply it to the Open Code output.
   */
  async processDecision(
    event: GovernanceEvent,
    decision: GovernanceDecision,
    output: Record<string, unknown>
  ): Promise<void> {
    switch (decision.action) {
      case 'allow':
        // No modification needed
        break;

      case 'deny':
        // For permission events, set status to deny
        if (event.type === 'governance:permission:request') {
          (output as OpenCodePermissionAskOutput).status = 'deny';
        }
        break;

      case 'transform':
        // For system transform events, apply the transform
        if (event.type === 'governance:system:transform' && decision.transform) {
          const transform = decision.transform as { system?: string[] };
          if (transform.system) {
            (output as OpenCodeSystemTransformOutput).system = transform.system;
          }
        }
        break;

      case 'passthrough':
        // No modification needed
        break;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOpenCodeBridge(): OpenCodeBridge {
  return new OpenCodeBridge();
}

// ============================================================================
// Open Code Plugin Factory
// 
// This is the entry point for Open Code to use the bridge.
// It creates a bridge and returns Open Code plugin hooks.
// ============================================================================

export function createOpenCodePlugin(bridge: OpenCodeBridge) {
  return async function opencodeGovernancePlugin(ctx: OpenCodePluginContext) {
    return {
      'tool.execute.before': async (
        input: OpenCodeToolExecuteBeforeInput,
        output: OpenCodeToolExecuteBeforeOutput
      ) => {
        const event = await bridge.translateToolBefore(input, output);
        // Event is ready for framework processing
        return event;
      },

      'tool.execute.after': async (
        input: OpenCodeToolExecuteAfterInput,
        output: OpenCodeToolExecuteAfterOutput
      ) => {
        const event = await bridge.translateToolAfter(input, output);
        // Event is ready for framework processing
        return event;
      },

      'permission.ask': async (
        input: OpenCodePermissionAskInput,
        output: OpenCodePermissionAskOutput
      ) => {
        const event = await bridge.translatePermissionRequest(input, output);
        // Event is ready for framework processing
        return event;
      },

      'chat.message': async (
        input: OpenCodeChatMessageInput,
        output: OpenCodeChatMessageOutput
      ) => {
        const event = await bridge.translateMessageReceived(input, output);
        // Event is ready for framework processing
        return event;
      },

      'experimental.chat.system.transform': async (
        input: OpenCodeSystemTransformInput,
        output: OpenCodeSystemTransformOutput
      ) => {
        const event = await bridge.translateSystemTransform(input, output);
        // Event is ready for framework processing
        return event;
      },

      'experimental.session.compacting': async (
        input: OpenCodeSessionCompactingInput,
        output: OpenCodeSessionCompactingOutput
      ) => {
        const event = await bridge.translateCompactionTransform(input, output);
        // Event is ready for framework processing
        return event;
      },
    };
  };
}
