import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret') || '';
    const expected = process.env.INBOUND_EMAIL_SECRET || '';
    if (!expected || secret !== expected) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const subject: string = body?.subject || '';
    const text: string = body?.text || body?.html || '';

    const match = subject.match(/CHT-[A-Z0-9]{6}/i);
    if (!match) return NextResponse.json({ ok: true, skipped: 'no token' });
    const token = match[0].toUpperCase();

    const conv = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM public.chat_conversations WHERE token = ${token} LIMIT 1
    `;
    if (!conv.length) return NextResponse.json({ ok: true, skipped: 'no conversation' });
    const conversationId = conv[0].id;

    await prisma.$executeRaw`
      INSERT INTO public.chat_messages (conversation_id, sender, content, sent_via)
      VALUES (${conversationId}::uuid, 'admin', ${text}, 'inbound')
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error('Inbound email error', { error: e instanceof Error ? e : new Error(String(e)) });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

