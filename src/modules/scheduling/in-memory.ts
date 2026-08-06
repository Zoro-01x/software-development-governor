/**
 * In-Memory Scheduling Store Implementation
 */

import {
  SchedulingStore,
  SchedulingModule,
  SchedulingError,
  SchedulingStats,
  Schedule,
  Job,
  JobRun,
  JobType,
  JobStatus,
  RunStatus,
  ScheduleQuery,
  JobQuery,
  ScheduleId,
  JobId,
} from './types.js';

export class InMemorySchedulingStore implements SchedulingModule {
  private schedules = new Map<ScheduleId, Schedule>();
  private jobs = new Map<JobId, Job>();
  private runs = new Map<JobId, JobRun[]>();
  
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  // ========================================================================
  // Schedules
  // ========================================================================
  
  async createSchedule(schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> {
    this._ensureOpen();
    
    const id = this.generateId();
    const now = new Date();
    
    const newSchedule: Schedule = {
      ...schedule,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }
  
  async getSchedule(id: ScheduleId): Promise<Schedule | null> {
    this._ensureOpen();
    return this.schedules.get(id) || null;
  }
  
  async updateSchedule(id: ScheduleId, updates: Partial<Schedule>): Promise<Schedule> {
    this._ensureOpen();
    
    const existing = this.schedules.get(id);
    if (!existing) {
      throw new SchedulingError('SCHEDULE_NOT_FOUND', `Schedule not found: "${id}"`);
    }
    
    const updated: Schedule = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.schedules.set(id, updated);
    return updated;
  }
  
  async deleteSchedule(id: ScheduleId): Promise<void> {
    this._ensureOpen();
    
    // Delete all jobs in this schedule
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.scheduleId === id) {
        this.jobs.delete(jobId);
      }
    }
    
    this.schedules.delete(id);
  }
  
  async querySchedules(query: ScheduleQuery): Promise<Schedule[]> {
    this._ensureOpen();
    
    let results = Array.from(this.schedules.values());
    
    if (query.enabled !== undefined) {
      results = results.filter(s => s.enabled === query.enabled);
    }
    if (query.name) {
      results = results.filter(s => s.name.includes(query.name!));
    }
    
    return results;
  }
  
  // ========================================================================
  // Jobs
  // ========================================================================
  
  async addJob(scheduleId: ScheduleId, job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    this._ensureOpen();
    
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new SchedulingError('SCHEDULE_NOT_FOUND', `Schedule not found: "${scheduleId}"`);
    }
    
    const id = this.generateId();
    const now = new Date();
    
    const newJob: Job = {
      ...job,
      id,
      scheduleId,
      createdAt: now,
      updatedAt: now,
    };
    
    this.jobs.set(id, newJob);
    this.runs.set(id, []);
    
    return newJob;
  }
  
  async getJob(id: JobId): Promise<Job | null> {
    this._ensureOpen();
    return this.jobs.get(id) || null;
  }
  
  async updateJob(id: JobId, updates: Partial<Job>): Promise<Job> {
    this._ensureOpen();
    
    const existing = this.jobs.get(id);
    if (!existing) {
      throw new SchedulingError('JOB_NOT_FOUND', `Job not found: "${id}"`);
    }
    
    const updated: Job = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    this.jobs.set(id, updated);
    return updated;
  }
  
  async removeJob(id: JobId): Promise<void> {
    this._ensureOpen();
    this.jobs.delete(id);
    this.runs.delete(id);
  }
  
  async queryJobs(query: JobQuery): Promise<Job[]> {
    this._ensureOpen();
    
    let results = Array.from(this.jobs.values());
    
    if (query.scheduleId) {
      results = results.filter(j => j.scheduleId === query.scheduleId);
    }
    if (query.status) {
      results = results.filter(j => j.status === query.status);
    }
    if (query.type) {
      results = results.filter(j => j.type === query.type);
    }
    
    return results;
  }
  
  // ========================================================================
  // Execution
  // ========================================================================
  
  async runJob(id: JobId): Promise<JobRun> {
    this._ensureOpen();
    
    const job = this.jobs.get(id);
    if (!job) {
      throw new SchedulingError('JOB_NOT_FOUND', `Job not found: "${id}"`);
    }
    
    const run: JobRun = {
      jobId: id,
      status: 'running',
      startedAt: new Date(),
    };
    
    // Simulate execution
    run.status = 'completed';
    run.completedAt = new Date();
    run.result = { executed: true };
    
    // Store run
    const runs = this.runs.get(id) || [];
    runs.push(run);
    this.runs.set(id, runs);
    
    // Update job
    job.lastRun = new Date();
    job.updatedAt = new Date();
    
    return run;
  }
  
  async getJobRuns(jobId: JobId): Promise<JobRun[]> {
    this._ensureOpen();
    return this.runs.get(jobId) || [];
  }
  
  // ========================================================================
  // Stats & Health
  // ========================================================================
  
  async getStats(): Promise<SchedulingStats> {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalSchedules: this.schedules.size,
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'pending' || j.status === 'running').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
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
      throw new SchedulingError('STORE_CLOSED', 'Store is not open');
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createSchedulingStore(): InMemorySchedulingStore {
  return new InMemorySchedulingStore();
}
