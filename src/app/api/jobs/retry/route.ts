import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'FAILED') {
      return NextResponse.json({ error: 'Job not found or not FAILED' }, { status: 400 });
    }

    // Reset attempts and set back to QUEUED
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'QUEUED',
        attempts: 0,
        scheduledFor: new Date(),
        lockedBy: null,
        lockedAt: null
      },
    });

    // Optionally remove from DLQ if it was there
    try {
      await prisma.deadLetterQueue.delete({ where: { jobId } });
    } catch (e) {
      // ignore if not in dlq
    }

    return NextResponse.json(updatedJob, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
