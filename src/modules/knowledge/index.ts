/**
 * Knowledge Module — Barrel Exports
 */

export type {
  FactId,
  RelationId,
  ContextId,
  EntityId,
  Fact,
  EntityValue,
  Relation,
  Entity,
  Context,
  FactQuery,
  EntityQuery,
  RelationQuery,
  KnowledgeStore,
  KnowledgeModule,
  KnowledgeStats,
  KnowledgeErrorCode,
} from './types.js';

export { KnowledgeError } from './types.js';
export { InMemoryKnowledgeStore, createKnowledgeStore } from './in-memory.js';
