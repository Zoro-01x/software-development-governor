/**
 * File-based Memory Backend
 * 
 * Implements the MemoryStore interface using file system storage.
 */

import { MemoryStore, MemoryEntry, MemoryQuery } from '@framework/core';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export class FileMemoryStore implements MemoryStore {
  private basePath: string;
  private data = new Map<string, MemoryEntry>();
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  constructor(basePath: string = './data/memory') {
    this.basePath = basePath;
  }
  
  async open(): Promise<void> {
    await mkdir(this.basePath, { recursive: true });
    await this.loadAll();
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    await this.saveAll();
    this._status = 'closed';
  }
  
  async put(key: string, value: unknown): Promise<void> {
    this._ensureOpen();
    
    const entry: MemoryEntry = {
      key,
      value,
      version: (this.data.get(key)?.version || 0) + 1,
      createdAt: this.data.get(key)?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.data.set(key, entry);
    await this.save(key);
  }
  
  async get(key: string): Promise<unknown | null> {
    this._ensureOpen();
    
    const entry = this.data.get(key);
    return entry?.value ?? null;
  }
  
  async delete(key: string): Promise<boolean> {
    this._ensureOpen();
    
    const existed = this.data.has(key);
    this.data.delete(key);
    
    if (existed) {
      await this.remove(key);
    }
    
    return existed;
  }
  
  async exists(key: string): Promise<boolean> {
    this._ensureOpen();
    return this.data.has(key);
  }
  
  async query(query: MemoryQuery): Promise<{ keys: string[]; total: number; hasMore: boolean }> {
    this._ensureOpen();
    
    const allKeys = Array.from(this.data.keys());
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    
    const keys = allKeys.slice(offset, offset + limit);
    
    return {
      keys,
      total: allKeys.length,
      hasMore: offset + limit < allKeys.length,
    };
  }
  
  get stats(): { totalKeys: number; open: boolean } {
    return {
      totalKeys: this.data.size,
      open: this._status === 'open',
    };
  }
  
  private _ensureOpen(): void {
    if (this._status !== 'open') {
      throw new Error('Store is not open');
    }
  }
  
  private async loadAll(): Promise<void> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(this.basePath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = file.replace('.json', '');
          const content = await readFile(join(this.basePath, file), 'utf-8');
          this.data.set(key, JSON.parse(content));
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
  }
  
  private async saveAll(): Promise<void> {
    for (const key of this.data.keys()) {
      await this.save(key);
    }
  }
  
  private async save(key: string): Promise<void> {
    const entry = this.data.get(key);
    if (entry) {
      const filePath = join(this.basePath, `${key}.json`);
      await writeFile(filePath, JSON.stringify(entry, null, 2));
    }
  }
  
  private async remove(key: string): Promise<void> {
    const { unlink } = await import('fs/promises');
    const filePath = join(this.basePath, `${key}.json`);
    try {
      await unlink(filePath);
    } catch {
      // File doesn't exist
    }
  }
}

export function createFileMemoryStore(basePath?: string): FileMemoryStore {
  return new FileMemoryStore(basePath);
}
