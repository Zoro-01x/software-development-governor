/**
 * Knowledge Module — Contract Interfaces
 * 
 * Facts, relationships, and context management.
 * Depends on Memory Module for persistence.
 */

// ============================================================================
// Core Types
// ============================================================================

export type FactId = string;
export type RelationId = string;
export type ContextId = string;
export type EntityId = string;

// ============================================================================
// Fact
// ============================================================================

export interface Fact {
  id: FactId;
  subject: EntityId;
  predicate: string;
  object: EntityValue;
  confidence: number;
  source: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityValue {
  type: 'string' | 'number' | 'boolean' | 'entity' | 'list';
  value: unknown;
}

// ============================================================================
// Relation
// ============================================================================

export interface Relation {
  id: RelationId;
  source: EntityId;
  target: EntityId;
  type: string;
  weight: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// Entity
// ============================================================================

export interface Entity {
  id: EntityId;
  type: string;
  properties: Record<string, unknown>;
  facts: FactId[];
  relations: RelationId[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Context
// ============================================================================

export interface Context {
  id: ContextId;
  name: string;
  description: string;
  facts: FactId[];
  entities: EntityId[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// Query Types
// ============================================================================

export interface FactQuery {
  subject?: EntityId;
  predicate?: string;
  object?: EntityValue;
  minConfidence?: number;
  source?: string;
}

export interface EntityQuery {
  type?: string;
  properties?: Record<string, unknown>;
}

export interface RelationQuery {
  source?: EntityId;
  target?: EntityId;
  type?: string;
  minWeight?: number;
}

// ============================================================================
// Knowledge Store Interface
// ============================================================================

export interface KnowledgeStore {
  // Facts
  addFact(fact: Omit<Fact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Fact>;
  getFact(id: FactId): Promise<Fact | null>;
  updateFact(id: FactId, updates: Partial<Fact>): Promise<Fact>;
  deleteFact(id: FactId): Promise<void>;
  queryFacts(query: FactQuery): Promise<Fact[]>;
  
  // Entities
  addEntity(entity: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Entity>;
  getEntity(id: EntityId): Promise<Entity | null>;
  updateEntity(id: EntityId, updates: Partial<Entity>): Promise<Entity>;
  deleteEntity(id: EntityId): Promise<void>;
  queryEntities(query: EntityQuery): Promise<Entity[]>;
  
  // Relations
  addRelation(relation: Omit<Relation, 'id' | 'createdAt'>): Promise<Relation>;
  getRelation(id: RelationId): Promise<Relation | null>;
  deleteRelation(id: RelationId): Promise<void>;
  queryRelations(query: RelationQuery): Promise<Relation[]>;
  
  // Context
  createContext(context: Omit<Context, 'id' | 'createdAt'>): Promise<Context>;
  getContext(id: ContextId): Promise<Context | null>;
  updateContext(id: ContextId, updates: Partial<Context>): Promise<Context>;
  deleteContext(id: ContextId): Promise<void>;
  
  // Graph traversal
  getNeighbors(entityId: EntityId, depth?: number): Promise<Entity[]>;
  findPath(source: EntityId, target: EntityId): Promise<Entity[]>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Knowledge Module Interface
// ============================================================================

export interface KnowledgeModule extends KnowledgeStore {
  // Statistics
  getStats(): Promise<KnowledgeStats>;
  
  // Health
  isHealthy(): Promise<boolean>;
}

export interface KnowledgeStats {
  totalFacts: number;
  totalEntities: number;
  totalRelations: number;
  totalContexts: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class KnowledgeError extends Error {
  constructor(
    code: KnowledgeErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'KnowledgeError';
    this.code = code;
  }
  
  public readonly code: KnowledgeErrorCode;
}

export type KnowledgeErrorCode =
  | 'FACT_NOT_FOUND'
  | 'ENTITY_NOT_FOUND'
  | 'RELATION_NOT_FOUND'
  | 'CONTEXT_NOT_FOUND'
  | 'DUPLICATE_FACT'
  | 'DUPLICATE_ENTITY'
  | 'INVALID_CONFIDENCE'
  | 'INVALID_WEIGHT'
  | 'STORE_CLOSED';
