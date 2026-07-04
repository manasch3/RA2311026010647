import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50
    });
    
    // Also get general stats
    const stats = {
      queued: await prisma.job.count({ where: { status: 'QUEUED' } }),
      running: await prisma.job.count({ where: { status: 'RUNNING' } }),
      completed: await prisma.job.count({ where: { status: 'COMPLETED' } }),
      failed: await prisma.job.count({ where: { status: 'FAILED' } }),
      deadLetter: await prisma.deadLetterQueue.count()
    };

    return NextResponse.json({ workers, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
