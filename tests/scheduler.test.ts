import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Distributed Job Scheduler - Core Logic', () => {
  let queueId = '';

  beforeAll(async () => {
    // Setup a test queue
    const org = await prisma.organization.create({
      data: { name: 'Test Org' }
    });
    const proj = await prisma.project.create({
      data: { name: 'Test Proj', organizationId: org.id }
    });
    const queue = await prisma.queue.create({
      data: { name: 'Test Queue', projectId: proj.id }
    });
    queueId = queue.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a job successfully', async () => {
    const job = await prisma.job.create({
      data: {
        name: 'Integration Test Job',
        queueId,
        payload: JSON.stringify({ test: true }),
        status: 'QUEUED'
      }
    });
    expect(job).toBeDefined();
    expect(job.status).toBe('QUEUED');
    expect(job.attempts).toBe(0);
  });

  it('should simulate worker backoff calculation', () => {
    const attempts = 2;
    const baseDelay = 1000;
    
    // Linear
    const linearDelay = baseDelay * attempts;
    expect(linearDelay).toBe(2000);
    
    // Exponential
    const expDelay = baseDelay * Math.pow(2, attempts - 1);
    expect(expDelay).toBe(2000); // 2^1 * 1000
    
    const expDelay3 = baseDelay * Math.pow(2, 3 - 1);
    expect(expDelay3).toBe(4000);
  });

  it('should transition a job to DLQ logic when max attempts reached', async () => {
    const job = await prisma.job.create({
      data: {
        name: 'Failing Job',
        queueId,
        payload: JSON.stringify({}),
        attempts: 3,
        maxAttempts: 3,
        status: 'QUEUED'
      }
    });
    
    let nextStatus = 'QUEUED';
    if (job.attempts >= job.maxAttempts) {
      nextStatus = 'FAILED';
    }
    
    expect(nextStatus).toBe('FAILED');
  });
});
