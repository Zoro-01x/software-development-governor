/**
 * Memory Module — Contract Verification Tests
 * 
 * Verifies that the in-memory implementation satisfies all contract requirements.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryStore, createInMemoryStore } from '../../../src/modules/memory/index.js';
import { MemoryError } from '../../../src/modules/memory/types.js';

describe('Memory Module Contract', () => {
  let store: InMemoryStore;
  
  beforeEach(async () => {
    store = createInMemoryStore('test-store', 'Test Store');
    await store.open();
  });
  
  afterEach(async () => {
    try {
      await store.close();
    } catch {}
  });
  
  // ==========================================================================
  // Basic CRUD
  // ==========================================================================
  
  describe('Basic CRUD', () => {
    it('puts and gets a value', async () => {
      await store.put('key1', { name: 'test' });
      const result = await store.get<{ name: string }>('key1');
      expect(result).toEqual({ name: 'test' });
    });
    
    it('returns null for missing key', async () => {
      const result = await store.get('missing');
      expect(result).toBeNull();
    });
    
    it('deletes a value', async () => {
      await store.put('key1', 'value1');
      await store.delete('key1');
      const result = await store.get('key1');
      expect(result).toBeNull();
    });
    
    it('checks existence', async () => {
      await store.put('key1', 'value1');
      expect(await store.exists('key1')).toBe(true);
      expect(await store.exists('missing')).toBe(false);
    });
    
    it('validates keys', async () => {
      await expect(store.put('', 'value')).rejects.toThrow(MemoryError);
      await expect(store.get('')).rejects.toThrow(MemoryError);
      await expect(store.delete('')).rejects.toThrow(MemoryError);
    });
  });
  
  // ==========================================================================
  // Batch Operations
  // ==========================================================================
  
  describe('Batch Operations', () => {
    it('gets many values', async () => {
      await store.put('key1', 'value1');
      await store.put('key2', 'value2');
      await store.put('key3', 'value3');
      
      const result = await store.getMany(['key1', 'key2', 'missing', 'key3']);
      expect(result.size).toBe(3);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.get('key3')).toBe('value3');
    });
    
    it('puts many values', async () => {
      await store.putMany([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ]);
      
      expect(await store.get('key1')).toBe('value1');
      expect(await store.get('key2')).toBe('value2');
    });
    
    it('deletes many values', async () => {
      await store.put('key1', 'value1');
      await store.put('key2', 'value2');
      await store.put('key3', 'value3');
      
      await store.deleteMany(['key1', 'key3']);
      
      expect(await store.exists('key1')).toBe(false);
      expect(await store.exists('key2')).toBe(true);
      expect(await store.exists('key3')).toBe(false);
    });
  });
  
  // ==========================================================================
  // Query
  // ==========================================================================
  
  describe('Query', () => {
    it('queries by prefix', async () => {
      await store.put('user:1', 'alice');
      await store.put('user:2', 'bob');
      await store.put('post:1', 'hello');
      
      const result = await store.query({ prefix: 'user:' });
      expect(result.keys).toHaveLength(2);
      expect(result.keys).toContain('user:1');
      expect(result.keys).toContain('user:2');
    });
    
    it('queries by pattern', async () => {
      await store.put('file.txt', 'text');
      await store.put('file.md', 'markdown');
      await store.put('image.png', 'image');
      
      const result = await store.query('file.*');
      expect(result.keys).toHaveLength(2);
    });
    
    it('applies limit', async () => {
      for (let i = 0; i < 10; i++) {
        await store.put(`key${i}`, `value${i}`);
      }
      
      const result = await store.query({ limit: 3 });
      expect(result.keys).toHaveLength(3);
      expect(result.hasMore).toBe(true);
    });
    
    it('applies offset', async () => {
      for (let i = 0; i < 10; i++) {
        await store.put(`key${i}`, `value${i}`);
      }
      
      const result = await store.query({ offset: 5, limit: 3 });
      expect(result.keys).toHaveLength(3);
      expect(result.keys[0]).toBe('key5');
    });
    
    it('sorts descending', async () => {
      await store.put('c', '3');
      await store.put('a', '1');
      await store.put('b', '2');
      
      const result = await store.query({ order: 'desc' });
      expect(result.keys).toEqual(['c', 'b', 'a']);
    });
  });
  
  // ==========================================================================
  // Versioning
  // ==========================================================================
  
  describe('Versioning', () => {
    it('tracks version', async () => {
      await store.put('key1', 'value1');
      expect(await store.getVersion('key1')).toBe(1);
      
      await store.put('key1', 'value2');
      expect(await store.getVersion('key1')).toBe(2);
    });
    
    it('maintains history', async () => {
      await store.put('key1', 'value1');
      await store.put('key1', 'value2');
      await store.delete('key1');
      
      const history = await store.getHistory('key1');
      expect(history).toHaveLength(3);
      expect(history[0].operation).toBe('put');
      expect(history[1].operation).toBe('put');
      expect(history[2].operation).toBe('delete');
    });
    
    it('rejects version conflict', async () => {
      await store.put('key1', 'value1');
      
      await expect(store.put('key1', 'value2', { expectedVersion: 99 }))
        .rejects.toThrow(MemoryError);
    });
    
    it('putVersioned works', async () => {
      await store.put('key1', 'value1');
      await store.putVersioned('key1', 'value2', 1);
      expect(await store.get('key1')).toBe('value2');
    });
  });
  
  // ==========================================================================
  // Snapshots
  // ==========================================================================
  
  describe('Snapshots', () => {
    it('creates snapshot', async () => {
      await store.put('key1', 'value1');
      await store.put('key2', 'value2');
      
      const snapshot = await store.createSnapshot('test');
      expect(snapshot.label).toBe('test');
      expect(snapshot.entries.size).toBe(2);
    });
    
    it('lists snapshots', async () => {
      await store.createSnapshot('snap1');
      await store.createSnapshot('snap2');
      
      const snapshots = await store.listSnapshots();
      expect(snapshots).toHaveLength(2);
    });
    
    it('restores snapshot', async () => {
      await store.put('key1', 'value1');
      const snapshot = await store.createSnapshot();
      
      await store.put('key1', 'value2');
      await store.restoreSnapshot(snapshot.id);
      
      expect(await store.get('key1')).toBe('value1');
    });
    
    it('deletes snapshot', async () => {
      const snapshot = await store.createSnapshot();
      await store.deleteSnapshot(snapshot.id);
      
      const snapshots = await store.listSnapshots();
      expect(snapshots).toHaveLength(0);
    });
  });
  
  // ==========================================================================
  // Transactions
  // ==========================================================================
  
  describe('Transactions', () => {
    it('commits transaction', async () => {
      const tx = await store.beginTransaction();
      tx.put('key1', 'value1');
      tx.put('key2', 'value2');
      await store.commit(tx);
      
      expect(await store.get('key1')).toBe('value1');
      expect(await store.get('key2')).toBe('value2');
    });
    
    it('rolls back transaction', async () => {
      await store.put('key1', 'original');
      
      const tx = await store.beginTransaction();
      tx.put('key1', 'modified');
      await store.rollback(tx);
      
      expect(await store.get('key1')).toBe('original');
    });
    
    it('rejects concurrent transactions', async () => {
      await store.beginTransaction();
      await expect(store.beginTransaction()).rejects.toThrow(MemoryError);
    });
  });
  
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  
  describe('Lifecycle', () => {
    it('rejects operations when closed', async () => {
      await store.close();
      await expect(store.put('key1', 'value1')).rejects.toThrow(MemoryError);
    });
    
    it('rejects double open', async () => {
      await expect(store.open()).rejects.toThrow(MemoryError);
    });
    
    it('tracks stats', async () => {
      await store.put('key1', 'value1');
      await store.put('key2', 'value2');
      
      expect(store.stats.totalKeys).toBe(2);
    });
  });
});
