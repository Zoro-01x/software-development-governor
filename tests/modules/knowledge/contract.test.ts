/**
 * Knowledge Module — Contract Verification Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryKnowledgeStore, createKnowledgeStore } from '../../../src/modules/knowledge/index.js';
import { KnowledgeError } from '../../../src/modules/knowledge/types.js';

describe('Knowledge Module Contract', () => {
  let store: InMemoryKnowledgeStore;
  
  beforeEach(async () => {
    store = createKnowledgeStore();
    await store.open();
  });
  
  afterEach(async () => {
    await store.close();
  });
  
  // ==========================================================================
  // Facts
  // ==========================================================================
  
  describe('Facts', () => {
    it('adds and gets a fact', async () => {
      const fact = await store.addFact({
        subject: 'entity-1',
        predicate: 'knows',
        object: { type: 'entity', value: 'entity-2' },
        confidence: 0.9,
        source: 'test',
        metadata: {},
      });
      
      const retrieved = await store.getFact(fact.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.subject).toBe('entity-1');
      expect(retrieved?.predicate).toBe('knows');
    });
    
    it('updates a fact', async () => {
      const fact = await store.addFact({
        subject: 'entity-1',
        predicate: 'knows',
        object: { type: 'entity', value: 'entity-2' },
        confidence: 0.9,
        source: 'test',
        metadata: {},
      });
      
      const updated = await store.updateFact(fact.id, { confidence: 0.95 });
      expect(updated.confidence).toBe(0.95);
    });
    
    it('deletes a fact', async () => {
      const fact = await store.addFact({
        subject: 'entity-1',
        predicate: 'knows',
        object: { type: 'entity', value: 'entity-2' },
        confidence: 0.9,
        source: 'test',
        metadata: {},
      });
      
      await store.deleteFact(fact.id);
      const retrieved = await store.getFact(fact.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries facts by subject', async () => {
      await store.addFact({
        subject: 'entity-1',
        predicate: 'knows',
        object: { type: 'entity', value: 'entity-2' },
        confidence: 0.9,
        source: 'test',
        metadata: {},
      });
      
      await store.addFact({
        subject: 'entity-1',
        predicate: 'likes',
        object: { type: 'string', value: 'pizza' },
        confidence: 0.8,
        source: 'test',
        metadata: {},
      });
      
      await store.addFact({
        subject: 'entity-2',
        predicate: 'knows',
        object: { type: 'entity', value: 'entity-1' },
        confidence: 0.7,
        source: 'test',
        metadata: {},
      });
      
      const results = await store.queryFacts({ subject: 'entity-1' });
      expect(results).toHaveLength(2);
    });
    
    it('queries facts by confidence', async () => {
      await store.addFact({
        subject: 'entity-1',
        predicate: 'knows',
        object: { type: 'entity', value: 'entity-2' },
        confidence: 0.9,
        source: 'test',
        metadata: {},
      });
      
      await store.addFact({
        subject: 'entity-1',
        predicate: 'likes',
        object: { type: 'string', value: 'pizza' },
        confidence: 0.5,
        source: 'test',
        metadata: {},
      });
      
      const results = await store.queryFacts({ minConfidence: 0.8 });
      expect(results).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Entities
  // ==========================================================================
  
  describe('Entities', () => {
    it('adds and gets an entity', async () => {
      const entity = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      const retrieved = await store.getEntity(entity.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('person');
      expect(retrieved?.properties.name).toBe('Alice');
    });
    
    it('updates an entity', async () => {
      const entity = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      const updated = await store.updateEntity(entity.id, { 
        properties: { name: 'Alice Smith' } 
      });
      expect(updated.properties.name).toBe('Alice Smith');
    });
    
    it('deletes an entity and its facts/relations', async () => {
      const entity = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      await store.addFact({
        subject: entity.id,
        predicate: 'knows',
        object: { type: 'entity', value: 'entity-2' },
        confidence: 0.9,
        source: 'test',
        metadata: {},
      });
      
      await store.deleteEntity(entity.id);
      
      const retrieved = await store.getEntity(entity.id);
      expect(retrieved).toBeNull();
      
      const facts = await store.queryFacts({ subject: entity.id });
      expect(facts).toHaveLength(0);
    });
    
    it('queries entities by type', async () => {
      await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      await store.addEntity({
        type: 'person',
        properties: { name: 'Bob' },
        facts: [],
        relations: [],
      });
      
      await store.addEntity({
        type: 'place',
        properties: { name: 'Paris' },
        facts: [],
        relations: [],
      });
      
      const people = await store.queryEntities({ type: 'person' });
      expect(people).toHaveLength(2);
      
      const places = await store.queryEntities({ type: 'place' });
      expect(places).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Relations
  // ==========================================================================
  
  describe('Relations', () => {
    it('adds and gets a relation', async () => {
      const entity1 = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      const entity2 = await store.addEntity({
        type: 'person',
        properties: { name: 'Bob' },
        facts: [],
        relations: [],
      });
      
      const relation = await store.addRelation({
        source: entity1.id,
        target: entity2.id,
        type: 'knows',
        weight: 0.9,
        metadata: {},
      });
      
      const retrieved = await store.getRelation(relation.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('knows');
    });
    
    it('deletes a relation', async () => {
      const entity1 = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      const entity2 = await store.addEntity({
        type: 'person',
        properties: { name: 'Bob' },
        facts: [],
        relations: [],
      });
      
      const relation = await store.addRelation({
        source: entity1.id,
        target: entity2.id,
        type: 'knows',
        weight: 0.9,
        metadata: {},
      });
      
      await store.deleteRelation(relation.id);
      const retrieved = await store.getRelation(relation.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries relations by type', async () => {
      const entity1 = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      const entity2 = await store.addEntity({
        type: 'person',
        properties: { name: 'Bob' },
        facts: [],
        relations: [],
      });
      
      await store.addRelation({
        source: entity1.id,
        target: entity2.id,
        type: 'knows',
        weight: 0.9,
        metadata: {},
      });
      
      await store.addRelation({
        source: entity1.id,
        target: entity2.id,
        type: 'likes',
        weight: 0.7,
        metadata: {},
      });
      
      const knows = await store.queryRelations({ type: 'knows' });
      expect(knows).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Context
  // ==========================================================================
  
  describe('Context', () => {
    it('creates and gets a context', async () => {
      const context = await store.createContext({
        name: 'Test Context',
        description: 'A test context',
        facts: [],
        entities: [],
        metadata: {},
      });
      
      const retrieved = await store.getContext(context.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Context');
    });
    
    it('updates a context', async () => {
      const context = await store.createContext({
        name: 'Test Context',
        description: 'A test context',
        facts: [],
        entities: [],
        metadata: {},
      });
      
      const updated = await store.updateContext(context.id, { 
        name: 'Updated Context' 
      });
      expect(updated.name).toBe('Updated Context');
    });
    
    it('deletes a context', async () => {
      const context = await store.createContext({
        name: 'Test Context',
        description: 'A test context',
        facts: [],
        entities: [],
        metadata: {},
      });
      
      await store.deleteContext(context.id);
      const retrieved = await store.getContext(context.id);
      expect(retrieved).toBeNull();
    });
  });
  
  // ==========================================================================
  // Graph Traversal
  // ==========================================================================
  
  describe('Graph Traversal', () => {
    it('gets neighbors', async () => {
      const entity1 = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      const entity2 = await store.addEntity({
        type: 'person',
        properties: { name: 'Bob' },
        facts: [],
        relations: [],
      });
      
      await store.addRelation({
        source: entity1.id,
        target: entity2.id,
        type: 'knows',
        weight: 0.9,
        metadata: {},
      });
      
      const neighbors = await store.getNeighbors(entity1.id);
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe(entity2.id);
    });
    
    it('finds path', async () => {
      const entity1 = await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      const entity2 = await store.addEntity({
        type: 'person',
        properties: { name: 'Bob' },
        facts: [],
        relations: [],
      });
      
      const entity3 = await store.addEntity({
        type: 'person',
        properties: { name: 'Charlie' },
        facts: [],
        relations: [],
      });
      
      await store.addRelation({
        source: entity1.id,
        target: entity2.id,
        type: 'knows',
        weight: 0.9,
        metadata: {},
      });
      
      await store.addRelation({
        source: entity2.id,
        target: entity3.id,
        type: 'knows',
        weight: 0.8,
        metadata: {},
      });
      
      const path = await store.findPath(entity1.id, entity3.id);
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(entity1.id);
      expect(path[1].id).toBe(entity2.id);
      expect(path[2].id).toBe(entity3.id);
    });
  });
  
  // ==========================================================================
  // Stats & Health
  // ==========================================================================
  
  describe('Stats & Health', () => {
    it('returns stats', async () => {
      await store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      });
      
      await store.addFact({
        subject: 'entity-1',
        predicate: 'knows',
        object: { type: 'entity', value: 'entity-2' },
        confidence: 0.9,
        source: 'test',
        metadata: {},
      });
      
      const stats = await store.getStats();
      expect(stats.totalEntities).toBe(1);
      expect(stats.totalFacts).toBe(1);
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
      await expect(store.addEntity({
        type: 'person',
        properties: { name: 'Alice' },
        facts: [],
        relations: [],
      })).rejects.toThrow(KnowledgeError);
    });
  });
});
