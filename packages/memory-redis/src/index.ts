/**
 * Redis Memory Backend
 * 
 * Implements the MemoryStore interface using Redis storage.
 */

import { MemoryStore, MemoryEntry, MemoryQuery } from '@framework/core';

export interface RedisMemoryConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  prefix?: string;
}

export class RedisMemoryStore implements MemoryStore {
  private config: RedisMemoryConfig;
  private redis: any;
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  constructor(config: RedisMemoryConfig = {}) {
    this.config = {
      prefix: 'memory:',
      ...config,
    };
  }
  
  async open(): Promise<void> {
    const Redis = await import('ioredis');
    
    this.redis = new Redis.default({
      url: this.config.url,
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
    });
    
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this._status = 'closed';
  }
  
  async put(key: string, value: unknown): Promise<void> {
    this._ensureOpen();
    
    const entry: MemoryEntry = {
      key,
      value,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await this.redis.set(
      `${this.config.prefix}${key}`,
      JSON.stringify(entry)
    );
  }
  
  async get(key: string): Promise<unknown | null> {
    this._ensureOpen();
    
    const data = await this.redis.get(`${this.config.prefix}${key}`);
    if (!data) return null;
    
    const entry: MemoryEntry = JSON.parse(data);
    return entry.value;
  }
  
  async delete(key: string): Promise<boolean> {
    this._ensureOpen();
    
    const result = await this.redis.del(`${this.config.prefix}${key}`);
    return result > 0;
  }
  
  async exists(key: string): Promise<boolean> {
    this._ensureOpen();
    
    const result = await this.redis.exists(`${this.config.prefix}${key}`);
    return result === 1;
  }
  
  async query(query: MemoryQuery): Promise<{ keys: string[]; total: number; hasMore: boolean }> {
    this._ensureOpen();
    
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    
    // Scan for keys
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const [newCursor, foundKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${this.config.prefix}*`,
        'COUNT',
        100
      );
      
      cursor = newCursor;
      
      for (const key of foundKeys) {
        const shortKey = key.replace(this.config.prefix, '');
        keys.push(shortKey);
        
        if (keys.length >= offset + limit) {
          break;
        }
      }
    } while (cursor !== '0' && keys.length < offset + limit);
    
    const slicedKeys = keys.slice(offset, offset + limit);
    
    // Get total count
    const allKeys: string[] = [];
    cursor = '0';
    do {
      const [newCursor, foundKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${this.config.prefix}*`,
        'COUNT',
        100
      );
      cursor = newCursor;
      allKeys.push(...foundKeys.map((k: string) => k.replace(this.config.prefix, '')));
    } while (cursor !== '0');
    
    return {
      keys: slicedKeys,
      total: allKeys.length,
      hasMore: offset + limit < allKeys.length,
    };
  }
  
  get stats(): { totalKeys: number; open: boolean } {
    // Sync stats not available for async backend
    return {
      totalKeys: 0,
      open: this._status === 'open',
    };
  }
  
  private _ensureOpen(): void {
    if (this._status !== 'open') {
      throw new Error('Store is not open');
    }
  }
}

export function createRedisMemoryStore(config?: RedisMemoryConfig): RedisMemoryStore {
  return new RedisMemoryStore(config);
}
