/**
 * Observability Module — Barrel Exports
 */

export type {
  LogEntryId,
  MetricId,
  TraceId,
  SpanId,
  LogEntry,
  LogLevel,
  Metric,
  MetricType,
  Trace,
  TraceStatus,
  Span,
  SpanStatus,
  LogQuery,
  MetricQuery,
  TraceQuery,
  ObservabilityStore,
  ObservabilityModule,
  ObservabilityStats,
  ObservabilityErrorCode,
} from './types.js';

export { ObservabilityError } from './types.js';
export { InMemoryObservabilityStore, createObservabilityStore } from './in-memory.js';
