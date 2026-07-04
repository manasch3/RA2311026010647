import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CronExpressionParser } from 'cron-parser';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.cronExpression) {
      return NextResponse.json({ error: 'cronExpression is required' }, { status: 400 });
    }

    let nextRunAt: Date;
    try {
      // CronExpressionParser.parse() is the correct method in this version
      const parsed = CronExpressionParser.parse(body.cronExpression);
      nextRunAt = parsed.next().toDate();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
    }

    const scheduledJob = await prisma.scheduledJob.create({
      data: {
        name: body.name,
        queueId: body.queueId,
        cronExpression: body.cronExpression,
        payload: JSON.stringify(body.payload || {}),
        nextRunAt,
      },
    });

    return NextResponse.json(scheduledJob, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
