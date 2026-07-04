import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queueId = searchParams.get('queueId');
    const status = searchParams.get('status');

    const where: any = {};
    if (queueId) where.queueId = queueId;
    if (status) where.status = status;

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // pagination limit for demo
    });
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Calculate scheduled time (delayed jobs)
    let scheduledFor = new Date();
    if (body.delayMs) {
      scheduledFor = new Date(Date.now() + body.delayMs);
    }

    const job = await prisma.job.create({
      data: {
        name: body.name,
        queueId: body.queueId,
        payload: JSON.stringify(body.payload || {}),
        priority: body.priority || 0,
        maxAttempts: body.maxAttempts || 3,
        retryDelay: body.retryDelay || 1000,
        retryBackoff: body.retryBackoff || 'FIXED',
        scheduledFor,
      },
    });
    return NextResponse.json(job, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
