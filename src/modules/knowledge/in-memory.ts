/**
 * In-Memory Knowledge Store Implementation
 * 
 * Default provider for testing and development.
 * All state is held in JavaScript Maps.
 */

import {
  KnowledgeStore,
  KnowledgeModule,
  KnowledgeError,
  KnowledgeErrorCode,
  KnowledgeStats,
  Fact,
  Relation,
  Entity,
  Context,
  EntityValue,
  FactQuery,
  EntityQuery,
  RelationQuery,
  FactId,
  RelationId,
  ContextId,
  EntityId,
} from './types.js';

export class InMemoryKnowledgeStore implements KnowledgeModule {
  private facts = new Map<FactId, Fact>();
  private entities = new Map<EntityId, Entity>();
  private relations = new Map<RelationId, Relation>();
  private contexts = new Map<ContextId, Context>();
  
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  // ========================================================================
  // Facts
  // ========================================================================
  
  async addFact(fact: Omit<Fact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Fact> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newFact: Fact = {
      ...fact,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.facts.set(id, newFact);
    
    // Add to entity if exists
    const entity = this.entities.get(fact.subject);
    if (entity) {
      entity.facts.push(id);
    }
    
    return newFact;
  }
  
  async getFact(id: FactId): Promise<Fact | null> {
    this._ensureOpen();
    return this.facts.get(id) || null;
  }
  
  async updateFact(id: FactId, updates: Partial<Fact>): Promise<Fact> {
    this._ensureOpen();
    
    const existing = this.facts.get(id);
    if (!existing) {
      throw new KnowledgeError('FACT_NOT_FOUND', `Fact not found: "${id}"`);
    }
    
    const updated: Fact = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.facts.set(id, updated);
    return updated;
  }
  
  async deleteFact(id: FactId): Promise<void> {
    this._ensureOpen();
    
    const fact = this.facts.get(id);
    if (!fact) {
      return;
    }
    
    // Remove from entity
    const entity = this.entities.get(fact.subject);
    if (entity) {
      entity.facts = entity.facts.filter(f => f !== id);
    }
    
    this.facts.delete(id);
  }
  
  async queryFacts(query: FactQuery): Promise<Fact[]> {
    this._ensureOpen();
    
    let results = Array.from(this.facts.values());
    
    if (query.subject) {
      results = results.filter(f => f.subject === query.subject);
    }
    if (query.predicate) {
      results = results.filter(f => f.predicate === query.predicate);
    }
    if (query.minConfidence !== undefined) {
      results = results.filter(f => f.confidence >= query.minConfidence!);
    }
    if (query.source) {
      results = results.filter(f => f.source === query.source);
    }
    
    return results;
  }
  
  // ========================================================================
  // Entities
  // ========================================================================
  
  async addEntity(entity: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Entity> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newEntity: Entity = {
      ...entity,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.entities.set(id, newEntity);
    return newEntity;
  }
  
  async getEntity(id: EntityId): Promise<Entity | null> {
    this._ensureOpen();
    return this.entities.get(id) || null;
  }
  
  async updateEntity(id: EntityId, updates: Partial<Entity>): Promise<Entity> {
    this._ensureOpen();
    
    const existing = this.entities.get(id);
    if (!existing) {
      throw new KnowledgeError('ENTITY_NOT_FOUND', `Entity not found: "${id}"`);
    }
    
    const updated: Entity = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.entities.set(id, updated);
    return updated;
  }
  
  async deleteEntity(id: EntityId): Promise<void> {
    this._ensureOpen();
    
    const entity = this.entities.get(id);
    if (!entity) {
      return;
    }
    
    // Remove related facts
    for (const factId of entity.facts) {
      this.facts.delete(factId);
    }
    
    // Remove related relations
    for (const relationId of entity.relations) {
      this.relations.delete(relationId);
    }
    
    this.entities.delete(id);
  }
  
  async queryEntities(query: EntityQuery): Promise<Entity[]> {
    this._ensureOpen();
    
    let results = Array.from(this.entities.values());
    
    if (query.type) {
      results = results.filter(e => e.type === query.type);
    }
    
    return results;
  }
  
  // ========================================================================
  // Relations
  // ========================================================================
  
  async addRelation(relation: Omit<Relation, 'id' | 'createdAt'>): Promise<Relation> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newRelation: Relation = {
      ...relation,
      id,
      createdAt: now,
    };
    
    this.relations.set(id, newRelation);
    
    // Add to entities
    const source = this.entities.get(relation.source);
    if (source) {
      source.relations.push(id);
    }
    
    const target = this.entities.get(relation.target);
    if (target) {
      target.relations.push(id);
    }
    
    return newRelation;
  }
  
  async getRelation(id: RelationId): Promise<Relation | null> {
    this._ensureOpen();
    return this.relations.get(id) || null;
  }
  
  async deleteRelation(id: RelationId): Promise<void> {
    this._ensureOpen();
    
    const relation = this.relations.get(id);
    if (!relation) {
      return;
    }
    
    // Remove from entities
    const source = this.entities.get(relation.source);
    if (source) {
      source.relations = source.relations.filter(r => r !== id);
    }
    
    const target = this.entities.get(relation.target);
    if (target) {
      target.relations = target.relations.filter(r => r !== id);
    }
    
    this.relations.delete(id);
  }
  
  async queryRelations(query: RelationQuery): Promise<Relation[]> {
    this._ensureOpen();
    
    let results = Array.from(this.relations.values());
    
    if (query.source) {
      results = results.filter(r => r.source === query.source);
    }
    if (query.target) {
      results = results.filter(r => r.target === query.target);
    }
    if (query.type) {
      results = results.filter(r => r.type === query.type);
    }
    if (query.minWeight !== undefined) {
      results = results.filter(r => r.weight >= query.minWeight!);
    }
    
    return results;
  }
  
  // ========================================================================
  // Context
  // ========================================================================
  
  async createContext(context: Omit<Context, 'id' | 'createdAt'>): Promise<Context> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newContext: Context = {
      ...context,
      id,
      createdAt: now,
    };
    
    this.contexts.set(id, newContext);
    return newContext;
  }
  
  async getContext(id: ContextId): Promise<Context | null> {
    this._ensureOpen();
    return this.contexts.get(id) || null;
  }
  
  async updateContext(id: ContextId, updates: Partial<Context>): Promise<Context> {
    this._ensureOpen();
    
    const existing = this.contexts.get(id);
    if (!existing) {
      throw new KnowledgeError('CONTEXT_NOT_FOUND', `Context not found: "${id}"`);
    }
    
    const updated: Context = {
      ...existing,
      ...updates,
      id,
    };
    
    this.contexts.set(id, updated);
    return updated;
  }
  
  async deleteContext(id: ContextId): Promise<void> {
    this._ensureOpen();
    this.contexts.delete(id);
  }
  
  // ========================================================================
  // Graph Traversal
  // ========================================================================
  
  async getNeighbors(entityId: EntityId, depth: number = 1): Promise<Entity[]> {
    this._ensureOpen();
    
    const visited = new Set<EntityId>();
    const neighbors: Entity[] = [];
    
    const traverse = async (id: EntityId, currentDepth: number) => {
      if (currentDepth > depth || visited.has(id)) {
        return;
      }
      
      visited.add(id);
      
      const relations = await this.queryRelations({ source: id });
      for (const relation of relations) {
        const entity = await this.getEntity(relation.target);
        if (entity && !visited.has(entity.id)) {
          neighbors.push(entity);
          await traverse(entity.id, currentDepth + 1);
        }
      }
    };
    
    await traverse(entityId, 0);
    return neighbors;
  }
  
  async findPath(source: EntityId, target: EntityId): Promise<Entity[]> {
    this._ensureOpen();
    
    const visited = new Set<EntityId>();
    const path: Entity[] = [];
    
    const dfs = async (current: EntityId): Promise<boolean> => {
      if (current === target) {
        const entity = await this.getEntity(current);
        if (entity) {
          path.push(entity);
        }
        return true;
      }
      
      visited.add(current);
      
      const relations = await this.queryRelations({ source: current });
      for (const relation of relations) {
        if (!visited.has(relation.target)) {
          const found = await dfs(relation.target);
          if (found) {
            const entity = await this.getEntity(current);
            if (entity) {
              path.unshift(entity);
            }
            return true;
          }
        }
      }
      
      return false;
    };
    
    await dfs(source);
    return path;
  }
  
  // ========================================================================
  // Stats & Health
  // ========================================================================
  
  async getStats(): Promise<KnowledgeStats> {
    return {
      totalFacts: this.facts.size,
      totalEntities: this.entities.size,
      totalRelations: this.relations.size,
      totalContexts: this.contexts.size,
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
      throw new KnowledgeError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createKnowledgeStore(): InMemoryKnowledgeStore {
  return new InMemoryKnowledgeStore();
}
