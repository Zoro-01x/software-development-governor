/**
 * Scheduling Module — Contract Interfaces
 * 
 * Cron-like job execution.
 * Depends on Multi-Agent Module for agent scheduling.
 */

// ============================================================================
// Core Types
// ============================================================================

export type ScheduleId = string;
export type JobId = string;

// ============================================================================
// Schedule
// ============================================================================

export interface Schedule {
  id: ScheduleId;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Job
// ============================================================================

export interface Job {
  id: JobId;
  scheduleId: ScheduleId;
  name: string;
  type: JobType;
  config: Record<string, unknown>;
  status: JobStatus;
  lastRun?: Date;
  nextRun?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type JobType = 'once' | 'recurring' | 'interval';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'disabled';

// ============================================================================
// Job Run
// ============================================================================

export interface JobRun {
  jobId: JobId;
  status: RunStatus;
  result?: unknown;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export type RunStatus = 'running' | 'completed' | 'failed';

// ============================================================================
// Query Types
// ============================================================================

export interface ScheduleQuery {
  enabled?: boolean;
  name?: string;
}

export interface JobQuery {
  scheduleId?: ScheduleId;
  status?: JobStatus;
  type?: JobType;
}

// ============================================================================
// Scheduling Store Interface
// ============================================================================

export interface SchedulingStore {
  // Schedules
  createSchedule(schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule>;
  getSchedule(id: ScheduleId): Promise<Schedule | null>;
  updateSchedule(id: ScheduleId, updates: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: ScheduleId): Promise<void>;
  querySchedules(query: ScheduleQuery): Promise<Schedule[]>;
  
  // Jobs
  addJob(scheduleId: ScheduleId, job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job>;
  getJob(id: JobId): Promise<Job | null>;
  updateJob(id: JobId, updates: Partial<Job>): Promise<Job>;
  removeJob(id: JobId): Promise<void>;
  queryJobs(query: JobQuery): Promise<Job[]>;
  
  // Execution
  runJob(id: JobId): Promise<JobRun>;
  getJobRuns(jobId: JobId): Promise<JobRun[]>;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// Scheduling Module Interface
// ============================================================================

export interface SchedulingModule extends SchedulingStore {
  // Statistics
  getStats(): Promise<SchedulingStats>;
  
  // Health
  isHealthy(): Promise<boolean>;
}

export interface SchedulingStats {
  totalSchedules: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class SchedulingError extends Error {
  constructor(
    code: SchedulingErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SchedulingError';
    this.code = code;
  }
  
  public readonly code: SchedulingErrorCode;
}

export type SchedulingErrorCode =
  | 'SCHEDULE_NOT_FOUND'
  | 'JOB_NOT_FOUND'
  | 'INVALID_STATUS'
  | 'EXECUTION_FAILED'
  | 'STORE_CLOSED';
