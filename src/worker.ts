import { PrismaClient } from '@prisma/client';
import os from 'os';

const prisma = new PrismaClient();
const WORKER_ID = `${os.hostname()}-${process.pid}`;

let isRunning = true;
let activeJobs = 0;

async function registerWorker() {
  const worker = await prisma.worker.create({
    data: {
      id: WORKER_ID,
      hostname: os.hostname(),
      pid: process.pid,
      status: 'ACTIVE',
    },
  });
  console.log(`[Worker ${WORKER_ID}] Registered successfully.`);
  return worker;
}

async function updateHeartbeat() {
  if (!isRunning) return;
  try {
    await prisma.worker.update({
      where: { id: WORKER_ID },
      data: { lastHeartbeat: new Date() },
    });
  } catch (error) {
    console.error(`[Worker ${WORKER_ID}] Failed to update heartbeat:`, error);
  }
}

async function claimJob() {
  // Find a pending job
  const pendingJobs = await prisma.job.findMany({
    where: {
      status: 'QUEUED',
      scheduledFor: { lte: new Date() },
      queue: { isPaused: false },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: 1,
  });

  if (pendingJobs.length === 0) return null;

  const candidate = pendingJobs[0];

  // Try to atomically claim it
  try {
    const [claimedJob] = await prisma.$queryRaw<any[]>`
      UPDATE "Job"
      SET status = 'RUNNING', "lockedAt" = ${new Date()}, "lockedBy" = ${WORKER_ID}
      WHERE id = ${candidate.id} AND status = 'QUEUED'
      RETURNING *;
    `;
    return claimedJob ? candidate : null; // If not returned, someone else claimed it
  } catch (err) {
    // queryRaw issues with RETURNING in some sqlite setups? Let's use Prisma native updateMany since it's atomic in SQLite
    const result = await prisma.job.updateMany({
      where: { id: candidate.id, status: 'QUEUED' },
      data: { status: 'RUNNING', lockedAt: new Date(), lockedBy: WORKER_ID },
    });
    
    if (result.count > 0) {
      return candidate;
    }
    return null;
  }
}

async function executeJob(job: any) {
  activeJobs++;
  const execution = await prisma.jobExecution.create({
    data: {
      jobId: job.id,
      workerId: WORKER_ID,
      status: 'RUNNING',
    },
  });

  console.log(`[Worker ${WORKER_ID}] Executing job ${job.id}`);

  try {
    // Mock processing based on payload
    const payload = JSON.parse(job.payload || '{}');
    if (payload.sleep) {
      await new Promise((res) => setTimeout(res, payload.sleep));
    }
    if (payload.shouldFail) {
      throw new Error(payload.errorMessage || 'Job deliberately failed');
    }

    // Success
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: { status: 'COMPLETED', finishedAt: new Date() },
    });
    
    await prisma.jobLog.create({
      data: { jobId: job.id, message: `Job completed successfully by ${WORKER_ID}` },
    });

  } catch (error: any) {
    console.error(`[Worker ${WORKER_ID}] Job ${job.id} failed:`, error.message);
    const newAttempts = job.attempts + 1;
    let nextStatus = 'QUEUED';
    let nextRun = new Date();

    if (newAttempts >= job.maxAttempts) {
      nextStatus = 'FAILED';
      await prisma.deadLetterQueue.create({
        data: { jobId: job.id, reason: error.message },
      });
    } else {
      // Calculate backoff
      let delay = job.retryDelay;
      if (job.retryBackoff === 'LINEAR') delay = delay * newAttempts;
      if (job.retryBackoff === 'EXPONENTIAL') delay = delay * Math.pow(2, newAttempts - 1);
      nextRun = new Date(Date.now() + delay);
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        attempts: newAttempts,
        scheduledFor: nextRun,
        lockedBy: null,
        lockedAt: null,
      },
    });

    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: { status: 'FAILED', finishedAt: new Date(), error: error.message },
    });
    
    await prisma.jobLog.create({
      data: { jobId: job.id, message: `Job failed: ${error.message}. Attempt ${newAttempts}/${job.maxAttempts}`, level: 'ERROR' },
    });
  } finally {
    activeJobs--;
  }
}

async function start() {
  await registerWorker();
  setInterval(updateHeartbeat, 10000);

  console.log(`[Worker ${WORKER_ID}] Waiting for jobs...`);
  while (isRunning) {
    try {
      const job = await claimJob();
      if (job) {
        // Execute asynchronously (allows concurrency)
        // Note: For strict concurrency limit per worker, we should check activeJobs
        executeJob(job).catch(console.error);
      } else {
        // Sleep before polling again
        await new Promise((res) => setTimeout(res, 2000));
      }
    } catch (error) {
      console.error(`[Worker ${WORKER_ID}] Error in polling loop:`, error);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
}

// Graceful shutdown
async function shutdown() {
  console.log(`[Worker ${WORKER_ID}] Shutting down...`);
  isRunning = false;
  
  await prisma.worker.update({
    where: { id: WORKER_ID },
    data: { status: 'OFFLINE' },
  });

  while (activeJobs > 0) {
    console.log(`[Worker ${WORKER_ID}] Waiting for ${activeJobs} jobs to finish...`);
    await new Promise((res) => setTimeout(res, 1000));
  }
  
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
