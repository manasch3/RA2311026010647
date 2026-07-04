import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const queues = await prisma.queue.findMany({
      include: {
        _count: {
          select: { jobs: true },
        },
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(queues);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const queue = await prisma.queue.create({
      data: {
        name: body.name,
        projectId: body.projectId,
        concurrencyLimit: body.concurrencyLimit || 10,
        defaultPriority: body.defaultPriority || 0,
      },
    });
    return NextResponse.json(queue, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
