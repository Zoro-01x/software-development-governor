/**
 * Multi-Agent Module — Contract Verification Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryMultiAgentStore, createMultiAgentStore } from '../../../src/modules/multi-agent/index.js';
import { MultiAgentError } from '../../../src/modules/multi-agent/types.js';

describe('Multi-Agent Module Contract', () => {
  let store: InMemoryMultiAgentStore;
  
  beforeEach(async () => {
    store = createMultiAgentStore();
    await store.open();
  });
  
  afterEach(async () => {
    await store.close();
  });
  
  // ==========================================================================
  // Agents
  // ==========================================================================
  
  describe('Agents', () => {
    it('registers and gets an agent', async () => {
      const agent = await store.registerAgent({
        name: 'Test Agent',
        type: 'llm',
        capabilities: ['chat', 'reasoning'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const retrieved = await store.getAgent(agent.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Agent');
    });
    
    it('updates an agent', async () => {
      const agent = await store.registerAgent({
        name: 'Test Agent',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const updated = await store.updateAgent(agent.id, { status: 'busy' });
      expect(updated.status).toBe('busy');
    });
    
    it('unregisters an agent', async () => {
      const agent = await store.registerAgent({
        name: 'Test Agent',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      await store.unregisterAgent(agent.id);
      const retrieved = await store.getAgent(agent.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries agents by type', async () => {
      await store.registerAgent({
        name: 'LLM Agent',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      await store.registerAgent({
        name: 'Tool Agent',
        type: 'tool',
        capabilities: ['execute'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const llms = await store.queryAgents({ type: 'llm' });
      expect(llms).toHaveLength(1);
      
      const tools = await store.queryAgents({ type: 'tool' });
      expect(tools).toHaveLength(1);
    });
    
    it('queries agents by capability', async () => {
      await store.registerAgent({
        name: 'Agent 1',
        type: 'llm',
        capabilities: ['chat', 'reasoning'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      await store.registerAgent({
        name: 'Agent 2',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const reasoning = await store.queryAgents({ capability: 'reasoning' });
      expect(reasoning).toHaveLength(1);
      
      const chat = await store.queryAgents({ capability: 'chat' });
      expect(chat).toHaveLength(2);
    });
  });
  
  // ==========================================================================
  // Sessions
  // ==========================================================================
  
  describe('Sessions', () => {
    it('creates and gets a session', async () => {
      const agent = await store.registerAgent({
        name: 'Test Agent',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const session = await store.createSession([agent.id]);
      expect(session.status).toBe('active');
      expect(session.agents).toContain(agent.id);
      
      const retrieved = await store.getSession(session.id);
      expect(retrieved).toBeDefined();
    });
    
    it('closes a session', async () => {
      const agent = await store.registerAgent({
        name: 'Test Agent',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const session = await store.createSession([agent.id]);
      await store.closeSession(session.id);
      
      const retrieved = await store.getSession(session.id);
      expect(retrieved?.status).toBe('completed');
    });
    
    it('queries sessions by agent', async () => {
      const agent1 = await store.registerAgent({
        name: 'Agent 1',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const agent2 = await store.registerAgent({
        name: 'Agent 2',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      await store.createSession([agent1.id, agent2.id]);
      await store.createSession([agent1.id]);
      
      const sessions1 = await store.querySessions({ agentId: agent1.id });
      expect(sessions1).toHaveLength(2);
      
      const sessions2 = await store.querySessions({ agentId: agent2.id });
      expect(sessions2).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Messages
  // ==========================================================================
  
  describe('Messages', () => {
    it('sends and gets messages', async () => {
      const agent1 = await store.registerAgent({
        name: 'Agent 1',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const agent2 = await store.registerAgent({
        name: 'Agent 2',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const session = await store.createSession([agent1.id, agent2.id]);
      
      await store.sendMessage({
        sessionId: session.id,
        from: agent1.id,
        to: agent2.id,
        content: 'Hello!',
        type: 'request',
        metadata: {},
      });
      
      await store.sendMessage({
        sessionId: session.id,
        from: agent2.id,
        to: agent1.id,
        content: 'Hi there!',
        type: 'response',
        metadata: {},
      });
      
      const messages = await store.getMessages(session.id);
      expect(messages).toHaveLength(2);
    });
    
    it('rejects message to inactive session', async () => {
      const agent = await store.registerAgent({
        name: 'Test Agent',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      const session = await store.createSession([agent.id]);
      await store.closeSession(session.id);
      
      await expect(store.sendMessage({
        sessionId: session.id,
        from: agent.id,
        to: 'broadcast',
        content: 'Hello!',
        type: 'notification',
        metadata: {},
      })).rejects.toThrow(MultiAgentError);
    });
  });
  
  // ==========================================================================
  // Stats & Health
  // ==========================================================================
  
  describe('Stats & Health', () => {
    it('returns stats', async () => {
      const agent = await store.registerAgent({
        name: 'Test Agent',
        type: 'llm',
        capabilities: ['chat'],
        status: 'idle',
        config: {},
        metadata: {},
      });
      
      await store.createSession([agent.id]);
      
      const stats = await store.getStats();
      expect(stats.totalAgents).toBe(1);
      expect(stats.totalSessions).toBe(1);
      expect(stats.activeSessions).toBe(1);
    });
    
    it('checks health', async () => {
      expect(await store.isHealthy()).toBe(true);
      await store.close();
      expect(await store.isHealthy()).toBe(false);
    });
  });
  
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  
  describe('Lifecycle', () => {
    it('rejects operations when closed', async () => {
      await store.close();
      await expect(store.registerAgent({
        name: 'Test',
        type: 'llm',
        capabilities: [],
        status: 'idle',
        config: {},
        metadata: {},
      })).rejects.toThrow(MultiAgentError);
    });
  });
});
