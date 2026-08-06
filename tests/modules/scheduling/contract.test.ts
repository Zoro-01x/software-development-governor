/**
 * Scheduling Module — Contract Verification Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemorySchedulingStore, createSchedulingStore } from '../../../src/modules/scheduling/index.js';
import { SchedulingError } from '../../../src/modules/scheduling/types.js';

describe('Scheduling Module Contract', () => {
  let store: InMemorySchedulingStore;
  
  beforeEach(async () => {
    store = createSchedulingStore();
    await store.open();
  });
  
  afterEach(async () => {
    await store.close();
  });
  
  // ==========================================================================
  // Schedules
  // ==========================================================================
  
  describe('Schedules', () => {
    it('creates and gets a schedule', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      const retrieved = await store.getSchedule(schedule.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Daily Cleanup');
    });
    
    it('updates a schedule', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      const updated = await store.updateSchedule(schedule.id, { enabled: false });
      expect(updated.enabled).toBe(false);
    });
    
    it('deletes a schedule', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      await store.deleteSchedule(schedule.id);
      const retrieved = await store.getSchedule(schedule.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries schedules by enabled', async () => {
      await store.createSchedule({
        name: 'Schedule 1',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      await store.createSchedule({
        name: 'Schedule 2',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: false,
        metadata: {},
      });
      
      const enabled = await store.querySchedules({ enabled: true });
      expect(enabled).toHaveLength(1);
      
      const disabled = await store.querySchedules({ enabled: false });
      expect(disabled).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Jobs
  // ==========================================================================
  
  describe('Jobs', () => {
    it('adds and gets a job', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      const job = await store.addJob(schedule.id, {
        name: 'Cleanup Task',
        type: 'recurring',
        config: { command: 'cleanup' },
        status: 'pending',
        metadata: {},
      });
      
      const retrieved = await store.getJob(job.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Cleanup Task');
    });
    
    it('updates a job', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      const job = await store.addJob(schedule.id, {
        name: 'Cleanup Task',
        type: 'recurring',
        config: { command: 'cleanup' },
        status: 'pending',
        metadata: {},
      });
      
      const updated = await store.updateJob(job.id, { status: 'running' });
      expect(updated.status).toBe('running');
    });
    
    it('removes a job', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      const job = await store.addJob(schedule.id, {
        name: 'Cleanup Task',
        type: 'recurring',
        config: { command: 'cleanup' },
        status: 'pending',
        metadata: {},
      });
      
      await store.removeJob(job.id);
      const retrieved = await store.getJob(job.id);
      expect(retrieved).toBeNull();
    });
    
    it('queries jobs by schedule', async () => {
      const schedule1 = await store.createSchedule({
        name: 'Schedule 1',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      const schedule2 = await store.createSchedule({
        name: 'Schedule 2',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      await store.addJob(schedule1.id, {
        name: 'Job 1',
        type: 'recurring',
        config: {},
        status: 'pending',
        metadata: {},
      });
      
      await store.addJob(schedule2.id, {
        name: 'Job 2',
        type: 'recurring',
        config: {},
        status: 'pending',
        metadata: {},
      });
      
      const jobs1 = await store.queryJobs({ scheduleId: schedule1.id });
      expect(jobs1).toHaveLength(1);
      
      const jobs2 = await store.queryJobs({ scheduleId: schedule2.id });
      expect(jobs2).toHaveLength(1);
    });
  });
  
  // ==========================================================================
  // Execution
  // ==========================================================================
  
  describe('Execution', () => {
    it('runs a job', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      const job = await store.addJob(schedule.id, {
        name: 'Cleanup Task',
        type: 'recurring',
        config: { command: 'cleanup' },
        status: 'pending',
        metadata: {},
      });
      
      const run = await store.runJob(job.id);
      expect(run.status).toBe('completed');
      expect(run.result).toBeDefined();
    });
    
    it('gets job runs', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      const job = await store.addJob(schedule.id, {
        name: 'Cleanup Task',
        type: 'recurring',
        config: { command: 'cleanup' },
        status: 'pending',
        metadata: {},
      });
      
      await store.runJob(job.id);
      await store.runJob(job.id);
      
      const runs = await store.getJobRuns(job.id);
      expect(runs).toHaveLength(2);
    });
  });
  
  // ==========================================================================
  // Stats & Health
  // ==========================================================================
  
  describe('Stats & Health', () => {
    it('returns stats', async () => {
      const schedule = await store.createSchedule({
        name: 'Daily Cleanup',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      });
      
      await store.addJob(schedule.id, {
        name: 'Cleanup Task',
        type: 'recurring',
        config: {},
        status: 'pending',
        metadata: {},
      });
      
      const stats = await store.getStats();
      expect(stats.totalSchedules).toBe(1);
      expect(stats.totalJobs).toBe(1);
      expect(stats.activeJobs).toBe(1);
    });
    
    it('checks health', async () => {
      expect(await store.isHealthy()).toBe(true);
      await store.close();
      expect(await store.isHealthy()).toBe(false);
    });
  });
  
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  
  describe('Lifecycle', () => {
    it('rejects operations when closed', async () => {
      await store.close();
      await expect(store.createSchedule({
        name: 'Test',
        cron: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        metadata: {},
      })).rejects.toThrow(SchedulingError);
    });
  });
});
