/**
 * Observability Module — Contract Interfaces
 * 
 * Logging, metrics, and tracing.
 * Depends on Scheduling Module for log rotation.
 */

// ============================================================================
// Core Types
// ============================================================================

export type LogEntryId = string;
export type MetricId = string;
export type TraceId = string;
export type SpanId = string;

// ============================================================================
// Log Entry
// ============================================================================

export interface LogEntry {
  id: LogEntryId;
  level: LogLevel;
  message: string;
  source: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// ============================================================================
// Metric
// ============================================================================

export interface Metric {
  id: MetricId;
  name: string;
  type: MetricType;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

// ============================================================================
// Trace
// ============================================================================

export interface Trace {
  id: TraceId;
  name: string;
  spans: Span[];
  startTime: Date;
  endTime?: Date;
  status: TraceStatus;
  metadata: Record<string, unknown>;
}

export type TraceStatus = 'active' | 'completed' | 'error';

// ============================================================================
// Span
// ============================================================================

export interface Span {
  id: SpanId;
  traceId: TraceId;
  parentId?: SpanId;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: SpanStatus;
  attributes: Record<string, unknown>;
}

export type SpanStatus = 'unspecified' | 'ok' | 'error';

// ============================================================================
// Query Types
// ============================================================================

export interface LogQuery {
  level?: LogLevel;
  source?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

export interface MetricQuery {
  name?: string;
  type?: MetricType;
  tags?: Record<string, string>;
}

export interface TraceQuery {
  name?: string;
  status?: TraceStatus;
  startTime?: Date;
  endTime?: Date;
}

// ============================================================================
// Observability Store Interface
// ============================================================================

export interface ObservabilityStore {
  // Logs
  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry>;
  queryLogs(query: LogQuery): Promise<LogEntry[]>;
  
  // Metrics
  recordMetric(metric: Omit<Metric, 'id' | 'timestamp'>): Promise<Metric>;
  queryMetrics(query: MetricQuery): Promise<Metric[]>;
  incrementCounter(name: string, tags?: Record<string, string>): Promise<void>;
  setGauge(name: string, value: number, tags?: Record<string, string>): Promise<void>;
  
  // Traces
  startTrace(name: string, metadata?: Record<string, unknown>): Promise<Trace>;
  startSpan(traceId: string, name: string, parentId?: SpanId): Promise<Span>;
  endSpan(spanId: string, status?: SpanStatus): Promise<void>;
  endTrace(traceId: string, status?: TraceStatus): Promise<void>;
  getTrace(id: TraceId): Promise<Trace | null>;
  queryTraces(query: TraceQuery): Promise<Trace[]>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Observability Module Interface
// ============================================================================

export interface ObservabilityModule extends ObservabilityStore {
  // Statistics
  getStats(): Promise<ObservabilityStats>;
  
  // Health
  isHealthy(): Promise<boolean>;
}

export interface ObservabilityStats {
  totalLogs: number;
  totalMetrics: number;
  totalTraces: number;
  activeTraces: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class ObservabilityError extends Error {
  constructor(
    code: ObservabilityErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ObservabilityError';
    this.code = code;
  }
  
  public readonly code: ObservabilityErrorCode;
}

export type ObservabilityErrorCode =
  | 'TRACE_NOT_FOUND'
  | 'SPAN_NOT_FOUND'
  | 'INVALID_STATUS'
  | 'STORE_CLOSED';
