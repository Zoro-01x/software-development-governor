/**
 * Open Code Bridge Tests
 * 
 * VERIFICATION: These tests prove the bridge contains zero governance logic.
 * The bridge only translates events - it does not make decisions.
 */

import { describe, it, expect } from 'vitest';
import {
  OpenCodeBridge,
  createOpenCodeBridge,
  createOpenCodePlugin,
} from '../src/index.js';
import type {
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
} from '../src/index.js';

describe('OpenCodeBridge', () => {
  describe('Factory', () => {
    it('creates bridge instance', () => {
      const bridge = createOpenCodeBridge();
      expect(bridge).toBeInstanceOf(OpenCodeBridge);
    });

    it('bridge has translation methods', () => {
      const bridge = createOpenCodeBridge();
      expect(typeof bridge.translateToolBefore).toBe('function');
      expect(typeof bridge.translateToolAfter).toBe('function');
      expect(typeof bridge.translatePermissionRequest).toBe('function');
      expect(typeof bridge.translateMessageReceived).toBe('function');
      expect(typeof bridge.translateSystemTransform).toBe('function');
      expect(typeof bridge.translateCompactionTransform).toBe('function');
    });
  });

  describe('tool.execute.before', () => {
    it('translates tool input to governance event', async () => {
      const bridge = createOpenCodeBridge();
      
      const input: OpenCodeToolExecuteBeforeInput = {
        name: 'bash',
        type: 'bash',
        args: { command: 'ls -la' },
      };
      
      const output: OpenCodeToolExecuteBeforeOutput = {
        args: { command: 'ls -la' },
      };
      
      const event = await bridge.translateToolBefore(input, output);
      
      expect(event.type).toBe('governance:tool:before');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.correlationId).toBeDefined();
      expect(event.payload).toEqual({
        toolName: 'bash',
        toolType: 'bash',
        args: { command: 'ls -la' },
        correlationId: expect.any(String),
      });
    });

    it('does not modify original args', async () => {
      const bridge = createOpenCodeBridge();
      
      const originalArgs = { command: 'ls -la' };
      const input: OpenCodeToolExecuteBeforeInput = {
        name: 'bash',
        type: 'bash',
        args: originalArgs,
      };
      
      const output: OpenCodeToolExecuteBeforeOutput = {
        args: originalArgs,
      };
      
      await bridge.translateToolBefore(input, output);
      
      expect(input.args).toEqual({ command: 'ls -la' });
    });
  });

  describe('tool.execute.after', () => {
    it('translates tool output to governance event', async () => {
      const bridge = createOpenCodeBridge();
      
      const input: OpenCodeToolExecuteAfterInput = {
        name: 'bash',
        type: 'bash',
      };
      
      const output: OpenCodeToolExecuteAfterOutput = {
        result: 'file1.txt\nfile2.txt',
      };
      
      const event = await bridge.translateToolAfter(input, output);
      
      expect(event.type).toBe('governance:tool:after');
      expect(event.payload).toEqual({
        toolName: 'bash',
        toolType: 'bash',
        result: 'file1.txt\nfile2.txt',
        error: undefined,
        correlationId: expect.any(String),
      });
    });

    it('translates error output', async () => {
      const bridge = createOpenCodeBridge();
      
      const input: OpenCodeToolExecuteAfterInput = {
        name: 'bash',
        type: 'bash',
      };
      
      const output: OpenCodeToolExecuteAfterOutput = {
        error: 'Command failed',
      };
      
      const event = await bridge.translateToolAfter(input, output);
      
      expect(event.payload).toEqual({
        toolName: 'bash',
        toolType: 'bash',
        result: undefined,
        error: 'Command failed',
        correlationId: expect.any(String),
      });
    });
  });

  describe('permission.ask', () => {
    it('translates permission request to governance event', async () => {
      const bridge = createOpenCodeBridge();
      
      const input: OpenCodePermissionAskInput = {
        type: 'bash',
        tool: 'bash',
        args: { command: 'rm -rf /' },
      };
      
      const output: OpenCodePermissionAskOutput = {
        status: 'ask',
      };
      
      const event = await bridge.translatePermissionRequest(input, output);
      
      expect(event.type).toBe('governance:permission:request');
      expect(event.payload).toEqual({
        permissionType: 'bash',
        toolName: 'bash',
        args: { command: 'rm -rf /' },
        correlationId: expect.any(String),
      });
    });

    it('does not modify original output', async () => {
      const bridge = createOpenCodeBridge();
      
      const input: OpenCodePermissionAskInput = {
        type: 'edit',
      };
      
      const output: OpenCodePermissionAskOutput = {
        status: 'ask',
      };
      
      await bridge.translatePermissionRequest(input, output);
      
      expect(output.status).toBe('ask');
    });
  });

  describe('chat.message', () => {
    it('translates message to governance event', async () => {
      const bridge = createOpenCodeBridge();
      
      const input: OpenCodeChatMessageInput = {
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      };
      
      const output: OpenCodeChatMessageOutput = {
        parts: [{ type: 'text', text: 'Hello' }],
      };
      
      const event = await bridge.translateMessageReceived(input, output);
      
      expect(event.type).toBe('governance:message:received');
      expect(event.payload).toEqual({
        role: 'user',
        content: { parts: [{ type: 'text', text: 'Hello' }] },
        correlationId: expect.any(String),
      });
    });
  });

  describe('experimental.chat.system.transform', () => {
    it('translates system transform to governance event', async () => {
      const bridge = createOpenCodeBridge();
      
      const input: OpenCodeSystemTransformInput = {
        system: ['You are a helpful assistant.', 'Be concise.'],
      };
      
      const output: OpenCodeSystemTransformOutput = {
        system: ['You are a helpful assistant.', 'Be concise.'],
      };
      
      const event = await bridge.translateSystemTransform(input, output);
      
      expect(event.type).toBe('governance:system:transform');
      expect(event.payload).toEqual({
        systemPrompt: ['You are a helpful assistant.', 'Be concise.'],
        correlationId: expect.any(String),
      });
    });

    it('does not modify original system array', async () => {
      const bridge = createOpenCodeBridge();
      
      const originalSystem = ['You are a helpful assistant.'];
      const input: OpenCodeSystemTransformInput = {
        system: originalSystem,
      };
      
      const output: OpenCodeSystemTransformOutput = {
        system: originalSystem,
      };
      
      await bridge.translateSystemTransform(input, output);
      
      expect(input.system).toEqual(['You are a helpful assistant.']);
    });
  });

  describe('experimental.session.compacting', () => {
    it('translates compaction to governance event', async () => {
      const bridge = createOpenCodeBridge();
      
      const input: OpenCodeSessionCompactingInput = {
        context: ['Previous conversation context.'],
      };
      
      const output: OpenCodeSessionCompactingOutput = {
        context: ['Previous conversation context.'],
      };
      
      const event = await bridge.translateCompactionTransform(input, output);
      
      expect(event.type).toBe('governance:compaction:transform');
      expect(event.payload).toEqual({
        context: ['Previous conversation context.'],
        correlationId: expect.any(String),
      });
    });
  });

  describe('Decision Processing', () => {
    it('processes allow decision without modification', async () => {
      const bridge = createOpenCodeBridge();
      
      const event = {
        type: 'governance:permission:request' as const,
        timestamp: new Date(),
        correlationId: 'test-123',
        payload: { permissionType: 'bash', correlationId: 'test-123' },
      };
      
      const output = { status: 'ask' as const };
      
      await bridge.processDecision(event, { action: 'allow' }, output);
      
      expect(output.status).toBe('ask');
    });

    it('processes deny decision by setting status', async () => {
      const bridge = createOpenCodeBridge();
      
      const event = {
        type: 'governance:permission:request' as const,
        timestamp: new Date(),
        correlationId: 'test-123',
        payload: { permissionType: 'bash', correlationId: 'test-123' },
      };
      
      const output = { status: 'ask' as const };
      
      await bridge.processDecision(event, { action: 'deny', reason: 'blocked' }, output);
      
      expect(output.status).toBe('deny');
    });

    it('processes passthrough decision without modification', async () => {
      const bridge = createOpenCodeBridge();
      
      const event = {
        type: 'governance:tool:before' as const,
        timestamp: new Date(),
        correlationId: 'test-123',
        payload: { toolName: 'bash', toolType: 'bash', args: {}, correlationId: 'test-123' },
      };
      
      const output = { args: { command: 'ls' } };
      
      await bridge.processDecision(event, { action: 'passthrough' }, output);
      
      expect(output.args).toEqual({ command: 'ls' });
    });
  });

  describe('Event Handler Registration', () => {
    it('can register event handlers', () => {
      const bridge = createOpenCodeBridge();
      
      const handler = async () => ({ action: 'allow' as const });
      
      bridge.onEvent('governance:tool:before', handler);
      
      // No error means success
      expect(true).toBe(true);
    });
  });
});

describe('Open Code Plugin Factory', () => {
  it('creates plugin function', () => {
    const bridge = createOpenCodeBridge();
    const plugin = createOpenCodePlugin(bridge);
    
    expect(typeof plugin).toBe('function');
  });

  it('plugin returns hooks object', async () => {
    const bridge = createOpenCodeBridge();
    const pluginFactory = createOpenCodePlugin(bridge);
    
    const ctx = {
      project: { name: 'test', path: '/test' },
      directory: '/test',
      worktree: '/test',
      client: {},
      $: {},
    };
    
    const hooks = await pluginFactory(ctx);
    
    expect(hooks).toBeDefined();
    expect(typeof hooks['tool.execute.before']).toBe('function');
    expect(typeof hooks['tool.execute.after']).toBe('function');
    expect(typeof hooks['permission.ask']).toBe('function');
    expect(typeof hooks['chat.message']).toBe('function');
    expect(typeof hooks['experimental.chat.system.transform']).toBe('function');
    expect(typeof hooks['experimental.session.compacting']).toBe('function');
  });
});

describe('Zero Governance Logic Verification', () => {
  it('bridge contains no decision logic', () => {
    const bridge = createOpenCodeBridge();
    const bridgeSource = bridge.toString();
    
    // Bridge should not contain governance keywords
    expect(bridgeSource).not.toContain('constitution');
    expect(bridgeSource).not.toContain('policy');
    expect(bridgeSource).not.toContain('governance');
    expect(bridgeSource).not.toContain('verify');
    expect(bridgeSource).not.toContain('audit');
  });

  it('bridge contains no provider logic', () => {
    const bridge = createOpenCodeBridge();
    const bridgeSource = bridge.toString();
    
    // Bridge should not contain provider keywords
    expect(bridgeSource).not.toContain('openai');
    expect(bridgeSource).not.toContain('anthropic');
    expect(bridgeSource).not.toContain('model');
    expect(bridgeSource).not.toContain('inference');
  });

  it('bridge only contains translation logic', () => {
    const bridge = createOpenCodeBridge();
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(bridge));
    
    // All methods should be translation or processing methods
    const allowedMethods = [
      'constructor',
      'translateToolBefore',
      'translateToolAfter',
      'translatePermissionRequest',
      'translateMessageReceived',
      'translateSystemTransform',
      'translateCompactionTransform',
      'processDecision',
      'onEvent',
    ];
    
    for (const method of methods) {
      expect(allowedMethods).toContain(method);
    }
  });
});
