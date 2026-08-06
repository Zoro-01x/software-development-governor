/**
 * Multi-Agent Module — Barrel Exports
 */

export type {
  AgentId,
  MessageId,
  SessionId,
  Agent,
  AgentType,
  AgentStatus,
  Message,
  MessageType,
  Session,
  SessionStatus,
  AgentQuery,
  SessionQuery,
  MultiAgentStore,
  MultiAgentModule,
  MultiAgentStats,
  MultiAgentErrorCode,
} from './types.js';

export { MultiAgentError } from './types.js';
export { InMemoryMultiAgentStore, createMultiAgentStore } from './in-memory.js';
