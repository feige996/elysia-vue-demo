import { Cron } from 'croner';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../infra/db/client';
import { sysJobsTable } from '../../infra/db/schema';
import { features } from '../config/env';
import { logService } from '../logger/log.service';

type ScheduledTask = {
  id: number;
  cron: Cron;
};

const scheduledTasks = new Map<number, ScheduledTask>();
let schedulerStarted = false;

const toDateOrNull = (value: Date | null | undefined) =>
  value ? new Date(value) : null;

const updateNextRunAt = async (jobId: number, nextRunAt: Date | null) => {
  await db
    .update(sysJobsTable)
    .set({
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(and(eq(sysJobsTable.id, jobId), isNull(sysJobsTable.deletedAt)));
};

export const triggerJobRun = async (
  jobId: number,
  source: 'manual' | 'scheduler',
) => {
  const task = scheduledTasks.get(jobId);
  const nextRunAt = task ? toDateOrNull(task.cron.nextRun()) : null;
  const rows = await db
    .update(sysJobsTable)
    .set({
      runCount: sql`${sysJobsTable.runCount} + 1`,
      lastRunAt: new Date(),
      lastRunStatus: 1,
      lastRunMessage:
        source === 'manual'
          ? 'manual trigger success'
          : 'scheduler trigger success',
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(and(eq(sysJobsTable.id, jobId), isNull(sysJobsTable.deletedAt)))
    .returning({
      id: sysJobsTable.id,
      name: sysJobsTable.name,
      cron: sysJobsTable.cron,
      status: sysJobsTable.status,
      args: sysJobsTable.args,
      runCount: sysJobsTable.runCount,
      nextRunAt: sysJobsTable.nextRunAt,
      lastRunAt: sysJobsTable.lastRunAt,
      lastRunStatus: sysJobsTable.lastRunStatus,
      lastRunMessage: sysJobsTable.lastRunMessage,
      remark: sysJobsTable.remark,
      updatedAt: sysJobsTable.updatedAt,
    });
  return rows[0];
};

const unscheduleJob = async (jobId: number) => {
  const task = scheduledTasks.get(jobId);
  if (!task) {
    return;
  }
  task.cron.stop();
  scheduledTasks.delete(jobId);
  await updateNextRunAt(jobId, null);
};

const scheduleJob = async (job: { id: number; cron: string }) => {
  const previous = scheduledTasks.get(job.id);
  if (previous) {
    previous.cron.stop();
    scheduledTasks.delete(job.id);
  }
  const cronTask = new Cron(job.cron, async () => {
    try {
      await triggerJobRun(job.id, 'scheduler');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logService.error('job_scheduler_run_failed', {
        jobId: job.id,
        error: message,
      });
      await db
        .update(sysJobsTable)
        .set({
          lastRunAt: new Date(),
          lastRunStatus: 0,
          lastRunMessage: message.slice(0, 250),
          updatedAt: new Date(),
        })
        .where(
          and(eq(sysJobsTable.id, job.id), isNull(sysJobsTable.deletedAt)),
        );
    }
  });
  scheduledTasks.set(job.id, { id: job.id, cron: cronTask });
  await updateNextRunAt(job.id, toDateOrNull(cronTask.nextRun()));
};

export const syncJobScheduleById = async (jobId: number) => {
  if (!features.cron) {
    await unscheduleJob(jobId);
    return;
  }
  const rows = await db
    .select({
      id: sysJobsTable.id,
      cron: sysJobsTable.cron,
      status: sysJobsTable.status,
    })
    .from(sysJobsTable)
    .where(and(eq(sysJobsTable.id, jobId), isNull(sysJobsTable.deletedAt)))
    .limit(1);
  const job = rows[0];
  if (!job || job.status !== 1) {
    await unscheduleJob(jobId);
    return;
  }
  await scheduleJob(job);
};

export const startJobScheduler = async () => {
  if (schedulerStarted) {
    return;
  }
  schedulerStarted = true;
  if (!features.cron) {
    logService.info('job_scheduler_disabled_by_feature_flag');
    return;
  }
  const jobs = await db
    .select({
      id: sysJobsTable.id,
      cron: sysJobsTable.cron,
      status: sysJobsTable.status,
    })
    .from(sysJobsTable)
    .where(and(eq(sysJobsTable.status, 1), isNull(sysJobsTable.deletedAt)));
  for (const job of jobs) {
    await scheduleJob(job);
  }
  logService.info('job_scheduler_started', {
    jobCount: jobs.length,
  });
};
