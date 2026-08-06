/**
 * Postgres Memory Backend
 * 
 * Implements the MemoryStore interface using PostgreSQL storage.
 */

import { MemoryStore, MemoryEntry, MemoryQuery } from '@framework/core';

export interface PostgresMemoryConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  table?: string;
}

export class PostgresMemoryStore implements MemoryStore {
  private config: PostgresMemoryConfig;
  private pool: any;
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  constructor(config: PostgresMemoryConfig = {}) {
    this.config = {
      table: 'memory',
      ...config,
    };
  }
  
  async open(): Promise<void> {
    const { Pool } = await import('pg');
    
    this.pool = new Pool({
      connectionString: this.config.connectionString,
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });
    
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.config.table} (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
    this._status = 'closed';
  }
  
  async put(key: string, value: unknown): Promise<void> {
    this._ensureOpen();
    
    const result = await this.pool.query(
      `INSERT INTO ${this.config.table} (key, value, version, updated_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE
       SET value = $2, version = ${this.config.table}.version + 1, updated_at = CURRENT_TIMESTAMP
       RETURNING version`,
      [key, JSON.stringify(value)]
    );
  }
  
  async get(key: string): Promise<unknown | null> {
    this._ensureOpen();
    
    const result = await this.pool.query(
      `SELECT value FROM ${this.config.table} WHERE key = $1`,
      [key]
    );
    
    return result.rows[0] ? JSON.parse(result.rows[0].value) : null;
  }
  
  async delete(key: string): Promise<boolean> {
    this._ensureOpen();
    
    const result = await this.pool.query(
      `DELETE FROM ${this.config.table} WHERE key = $1`,
      [key]
    );
    
    return result.rowCount > 0;
  }
  
  async exists(key: string): Promise<boolean> {
    this._ensureOpen();
    
    const result = await this.pool.query(
      `SELECT 1 FROM ${this.config.table} WHERE key = $1`,
      [key]
    );
    
    return result.rows.length > 0;
  }
  
  async query(query: MemoryQuery): Promise<{ keys: string[]; total: number; hasMore: boolean }> {
    this._ensureOpen();
    
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM ${this.config.table}`
    );
    const total = parseInt(countResult.rows[0].count);
    
    const result = await this.pool.query(
      `SELECT key FROM ${this.config.table} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const keys = result.rows.map((row: any) => row.key);
    
    return {
      keys,
      total,
      hasMore: offset + limit < total,
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

export function createPostgresMemoryStore(config?: PostgresMemoryConfig): PostgresMemoryStore {
  return new PostgresMemoryStore(config);
}
