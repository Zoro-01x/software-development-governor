/**
 * In-Memory Multi-Agent Store Implementation
 */

import {
  MultiAgentStore,
  MultiAgentModule,
  MultiAgentError,
  MultiAgentStats,
  Agent,
  Message,
  Session,
  AgentType,
  AgentStatus,
  MessageType,
  SessionStatus,
  AgentQuery,
  SessionQuery,
  AgentId,
  MessageId,
  SessionId,
} from './types.js';

export class InMemoryMultiAgentStore implements MultiAgentModule {
  private agents = new Map<AgentId, Agent>();
  private sessions = new Map<SessionId, Session>();
  private messages = new Map<MessageId, Message>();
  
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  // ========================================================================
  // Agents
  // ========================================================================
  
  async registerAgent(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newAgent: Agent = {
      ...agent,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.agents.set(id, newAgent);
    return newAgent;
  }
  
  async getAgent(id: AgentId): Promise<Agent | null> {
    this._ensureOpen();
    return this.agents.get(id) || null;
  }
  
  async updateAgent(id: AgentId, updates: Partial<Agent>): Promise<Agent> {
    this._ensureOpen();
    
    const existing = this.agents.get(id);
    if (!existing) {
      throw new MultiAgentError('AGENT_NOT_FOUND', `Agent not found: "${id}"`);
    }
    
    const updated: Agent = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.agents.set(id, updated);
    return updated;
  }
  
  async unregisterAgent(id: AgentId): Promise<void> {
    this._ensureOpen();
    this.agents.delete(id);
  }
  
  async queryAgents(query: AgentQuery): Promise<Agent[]> {
    this._ensureOpen();
    
    let results = Array.from(this.agents.values());
    
    if (query.type) {
      results = results.filter(a => a.type === query.type);
    }
    if (query.status) {
      results = results.filter(a => a.status === query.status);
    }
    if (query.capability) {
      results = results.filter(a => a.capabilities.includes(query.capability!));
    }
    
    return results;
  }
  
  // ========================================================================
  // Sessions
  // ========================================================================
  
  async createSession(agentIds: AgentId[]): Promise<Session> {
    this._ensureOpen();
    
    // Verify all agents exist
    for (const agentId of agentIds) {
      if (!this.agents.has(agentId)) {
        throw new MultiAgentError('AGENT_NOT_FOUND', `Agent not found: "${agentId}"`);
      }
    }
    
    const id = this.generateId();
    const now = new Date();
    
    const session: Session = {
      id,
      agents: agentIds,
      messages: [],
      status: 'active',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    
    this.sessions.set(id, session);
    return session;
  }
  
  async getSession(id: SessionId): Promise<Session | null> {
    this._ensureOpen();
    return this.sessions.get(id) || null;
  }
  
  async closeSession(id: SessionId): Promise<void> {
    this._ensureOpen();
    
    const session = this.sessions.get(id);
    if (!session) {
      throw new MultiAgentError('SESSION_NOT_FOUND', `Session not found: "${id}"`);
    }
    
    session.status = 'completed';
    session.updatedAt = new Date();
  }
  
  async querySessions(query: SessionQuery): Promise<Session[]> {
    this._ensureOpen();
    
    let results = Array.from(this.sessions.values());
    
    if (query.status) {
      results = results.filter(s => s.status === query.status);
    }
    if (query.agentId) {
      results = results.filter(s => s.agents.includes(query.agentId!));
    }
    
    return results;
  }
  
  // ========================================================================
  // Messages
  // ========================================================================
  
  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    this._ensureOpen();
    
    const session = this.sessions.get(message.sessionId);
    if (!session) {
      throw new MultiAgentError('SESSION_NOT_FOUND', `Session not found: "${message.sessionId}"`);
    }
    
    if (session.status !== 'active') {
      throw new MultiAgentError('INVALID_STATUS', 'Session is not active');
    }
    
    const id = this.generateId();
    const now = new Date();
    
    const newMessage: Message = {
      ...message,
      id,
      timestamp: now,
    };
    
    this.messages.set(id, newMessage);
    session.messages.push(newMessage);
    session.updatedAt = now;
    
    return newMessage;
  }
  
  async getMessages(sessionId: SessionId): Promise<Message[]> {
    this._ensureOpen();
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new MultiAgentError('SESSION_NOT_FOUND', `Session not found: "${sessionId}"`);
    }
    
    return session.messages;
  }
  
  // ========================================================================
  // Stats & Health
  // ========================================================================
  
  async getStats(): Promise<MultiAgentStats> {
    const sessions = Array.from(this.sessions.values());
    
    return {
      totalAgents: this.agents.size,
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      totalMessages: this.messages.size,
    };
  }
  
  async isHealthy(): Promise<boolean> {
    return this._status === 'open';
  }
  
  // ========================================================================
  // Private Helpers
  // ========================================================================
  
  private _ensureOpen(): void {
    if (this._status !== 'open') {
      throw new MultiAgentError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createMultiAgentStore(): InMemoryMultiAgentStore {
  return new InMemoryMultiAgentStore();
}
