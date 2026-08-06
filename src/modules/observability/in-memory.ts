/**
 * In-Memory Observability Store Implementation
 */

import {
  ObservabilityStore,
  ObservabilityModule,
  ObservabilityError,
  ObservabilityStats,
  LogEntry,
  Metric,
  Trace,
  Span,
  LogLevel,
  MetricType,
  TraceStatus,
  SpanStatus,
  LogQuery,
  MetricQuery,
  TraceQuery,
  LogEntryId,
  MetricId,
  TraceId,
  SpanId,
} from './types.js';

export class InMemoryObservabilityStore implements ObservabilityModule {
  private logs = new Map<LogEntryId, LogEntry>();
  private metrics = new Map<MetricId, Metric>();
  private traces = new Map<TraceId, Trace>();
  private spans = new Map<SpanId, Span>();
  
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  // ========================================================================
  // Logs
  // ========================================================================
  
  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newEntry: LogEntry = {
      ...entry,
      id,
      timestamp: now,
    };
    
    this.logs.set(id, newEntry);
    return newEntry;
  }
  
  async queryLogs(query: LogQuery): Promise<LogEntry[]> {
    this._ensureOpen();
    
    let results = Array.from(this.logs.values());
    
    if (query.level) {
      results = results.filter(l => l.level === query.level);
    }
    if (query.source) {
      results = results.filter(l => l.source === query.source);
    }
    if (query.startTime) {
      results = results.filter(l => l.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter(l => l.timestamp <= query.endTime!);
    }
    
    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }
  
  // ========================================================================
  // Metrics
  // ========================================================================
  
  async recordMetric(metric: Omit<Metric, 'id' | 'timestamp'>): Promise<Metric> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newMetric: Metric = {
      ...metric,
      id,
      timestamp: now,
    };
    
    this.metrics.set(id, newMetric);
    return newMetric;
  }
  
  async queryMetrics(query: MetricQuery): Promise<Metric[]> {
    this._ensureOpen();
    
    let results = Array.from(this.metrics.values());
    
    if (query.name) {
      results = results.filter(m => m.name === query.name);
    }
    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }
    if (query.tags) {
      results = results.filter(m => {
        for (const [key, value] of Object.entries(query.tags!)) {
          if (m.tags[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    return results;
  }
  
  async incrementCounter(name: string, tags: Record<string, string> = {}): Promise<void> {
    this._ensureOpen();
    
    // Find existing counter or create new one
    const existing = Array.from(this.metrics.values()).find(
      m => m.name === name && m.type === 'counter' && JSON.stringify(m.tags) === JSON.stringify(tags)
    );
    
    if (existing) {
      existing.value += 1;
      existing.timestamp = new Date();
    } else {
      await this.recordMetric({
        name,
        type: 'counter',
        value: 1,
        tags,
      });
    }
  }
  
  async setGauge(name: string, value: number, tags: Record<string, string> = {}): Promise<void> {
    this._ensureOpen();
    
    // Find existing gauge or create new one
    const existing = Array.from(this.metrics.values()).find(
      m => m.name === name && m.type === 'gauge' && JSON.stringify(m.tags) === JSON.stringify(tags)
    );
    
    if (existing) {
      existing.value = value;
      existing.timestamp = new Date();
    } else {
      await this.recordMetric({
        name,
        type: 'gauge',
        value,
        tags,
      });
    }
  }
  
  // ========================================================================
  // Traces
  // ========================================================================
  
  async startTrace(name: string, metadata: Record<string, unknown> = {}): Promise<Trace> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const trace: Trace = {
      id,
      name,
      spans: [],
      startTime: now,
      status: 'active',
      metadata,
    };
    
    this.traces.set(id, trace);
    return trace;
  }
  
  async startSpan(traceId: string, name: string, parentId?: SpanId): Promise<Span> {
    this._ensureOpen();
    
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new ObservabilityError('TRACE_NOT_FOUND', `Trace not found: "${traceId}"`);
    }
    
    const id = this.generateId();
    const now = new Date();
    
    const span: Span = {
      id,
      traceId,
      parentId,
      name,
      startTime: now,
      status: 'unspecified',
      attributes: {},
    };
    
    this.spans.set(id, span);
    trace.spans.push(span);
    
    return span;
  }
  
  async endSpan(spanId: string, status: SpanStatus = 'ok'): Promise<void> {
    this._ensureOpen();
    
    const span = this.spans.get(spanId);
    if (!span) {
      throw new ObservabilityError('SPAN_NOT_FOUND', `Span not found: "${spanId}"`);
    }
    
    span.endTime = new Date();
    span.status = status;
  }
  
  async endTrace(traceId: string, status: TraceStatus = 'completed'): Promise<void> {
    this._ensureOpen();
    
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new ObservabilityError('TRACE_NOT_FOUND', `Trace not found: "${traceId}"`);
    }
    
    trace.endTime = new Date();
    trace.status = status;
  }
  
  async getTrace(id: TraceId): Promise<Trace | null> {
    this._ensureOpen();
    return this.traces.get(id) || null;
  }
  
  async queryTraces(query: TraceQuery): Promise<Trace[]> {
    this._ensureOpen();
    
    let results = Array.from(this.traces.values());
    
    if (query.name) {
      results = results.filter(t => t.name === query.name);
    }
    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }
    if (query.startTime) {
      results = results.filter(t => t.startTime >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter(t => t.startTime <= query.endTime!);
    }
    
    return results;
  }
  
  // ========================================================================
  // Stats & Health
  // ========================================================================
  
  async getStats(): Promise<ObservabilityStats> {
    const traces = Array.from(this.traces.values());
    
    return {
      totalLogs: this.logs.size,
      totalMetrics: this.metrics.size,
      totalTraces: traces.length,
      activeTraces: traces.filter(t => t.status === 'active').length,
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
      throw new ObservabilityError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createObservabilityStore(): InMemoryObservabilityStore {
  return new InMemoryObservabilityStore();
}
