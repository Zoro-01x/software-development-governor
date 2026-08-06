/**
 * Multi-Agent Module — Contract Interfaces
 * 
 * Agent coordination and communication.
 * Depends on Workflows Module for orchestration.
 */

// ============================================================================
// Core Types
// ============================================================================

export type AgentId = string;
export type MessageId = string;
export type SessionId = string;

// ============================================================================
// Agent
// ============================================================================

export interface Agent {
  id: AgentId;
  name: string;
  type: AgentType;
  capabilities: string[];
  status: AgentStatus;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentType = 'llm' | 'tool' | 'hybrid' | 'custom';
export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error';

// ============================================================================
// Message
// ============================================================================

export interface Message {
  id: MessageId;
  sessionId: SessionId;
  from: AgentId;
  to: AgentId | 'broadcast';
  content: unknown;
  type: MessageType;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export type MessageType = 'request' | 'response' | 'notification' | 'error';

// ============================================================================
// Session
// ============================================================================

export interface Session {
  id: SessionId;
  agents: AgentId[];
  messages: Message[];
  status: SessionStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionStatus = 'active' | 'completed' | 'failed';

// ============================================================================
// Query Types
// ============================================================================

export interface AgentQuery {
  type?: AgentType;
  status?: AgentStatus;
  capability?: string;
}

export interface SessionQuery {
  status?: SessionStatus;
  agentId?: AgentId;
}

// ============================================================================
// Multi-Agent Store Interface
// ============================================================================

export interface MultiAgentStore {
  // Agents
  registerAgent(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent>;
  getAgent(id: AgentId): Promise<Agent | null>;
  updateAgent(id: AgentId, updates: Partial<Agent>): Promise<Agent>;
  unregisterAgent(id: AgentId): Promise<void>;
  queryAgents(query: AgentQuery): Promise<Agent[]>;
  
  // Sessions
  createSession(agentIds: AgentId[]): Promise<Session>;
  getSession(id: SessionId): Promise<Session | null>;
  closeSession(id: SessionId): Promise<void>;
  querySessions(query: SessionQuery): Promise<Session[]>;
  
  // Messages
  sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message>;
  getMessages(sessionId: SessionId): Promise<Message[]>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Multi-Agent Module Interface
// ============================================================================

export interface MultiAgentModule extends MultiAgentStore {
  // Statistics
  getStats(): Promise<MultiAgentStats>;
  
  // Health
  isHealthy(): Promise<boolean>;
}

export interface MultiAgentStats {
  totalAgents: number;
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class MultiAgentError extends Error {
  constructor(
    code: MultiAgentErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MultiAgentError';
    this.code = code;
  }
  
  public readonly code: MultiAgentErrorCode;
}

export type MultiAgentErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_STATUS'
  | 'AGENT_BUSY'
  | 'STORE_CLOSED';
