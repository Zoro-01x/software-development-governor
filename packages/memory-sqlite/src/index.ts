/**
 * SQLite Memory Backend
 * 
 * Implements the MemoryStore interface using SQLite storage.
 */

import { MemoryStore, MemoryEntry, MemoryQuery } from '@framework/core';

export interface SQLiteMemoryConfig {
  path?: string;
}

export class SQLiteMemoryStore implements MemoryStore {
  private config: SQLiteMemoryConfig;
  private db: any;
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  constructor(config: SQLiteMemoryConfig = {}) {
    this.config = {
      path: './data/memory.db',
      ...config,
    };
  }
  
  async open(): Promise<void> {
    const Database = await import('better-sqlite3');
    this.db = new Database.default(this.config.path);
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
    this._status = 'closed';
  }
  
  async put(key: string, value: unknown): Promise<void> {
    this._ensureOpen();
    
    const existing = this.db.prepare('SELECT version FROM memory WHERE key = ?').get(key);
    const version = existing ? existing.version + 1 : 1;
    
    this.db.prepare(`
      INSERT OR REPLACE INTO memory (key, value, version, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(key, JSON.stringify(value), version);
  }
  
  async get(key: string): Promise<unknown | null> {
    this._ensureOpen();
    
    const row = this.db.prepare('SELECT value FROM memory WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : null;
  }
  
  async delete(key: string): Promise<boolean> {
    this._ensureOpen();
    
    const result = this.db.prepare('DELETE FROM memory WHERE key = ?').run(key);
    return result.changes > 0;
  }
  
  async exists(key: string): Promise<boolean> {
    this._ensureOpen();
    
    const row = this.db.prepare('SELECT 1 FROM memory WHERE key = ?').get(key);
    return !!row;
  }
  
  async query(query: MemoryQuery): Promise<{ keys: string[]; total: number; hasMore: boolean }> {
    this._ensureOpen();
    
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM memory').get();
    const total = countRow.count;
    
    const rows = this.db.prepare('SELECT key FROM memory LIMIT ? OFFSET ?').all(limit, offset);
    const keys = rows.map((row: any) => row.key);
    
    return {
      keys,
      total,
      hasMore: offset + limit < total,
    };
  }
  
  get stats(): { totalKeys: number; open: boolean } {
    const totalKeys = this.db ? this.db.prepare('SELECT COUNT(*) as count FROM memory').get().count : 0;
    return {
      totalKeys,
      open: this._status === 'open',
    };
  }
  
  private _ensureOpen(): void {
    if (this._status !== 'open') {
      throw new Error('Store is not open');
    }
  }
}

export function createSQLiteMemoryStore(config?: SQLiteMemoryConfig): SQLiteMemoryStore {
  return new SQLiteMemoryStore(config);
}
