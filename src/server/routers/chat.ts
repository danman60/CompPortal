import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

function genToken() {
  return 'CHT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

export const chatRouter = router({
  createQuestion: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100).optional(),
        email: z.string().email(),
        message: z.string().trim().min(1).max(5000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const token = genToken();
      const inserted = (await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO public.chat_conversations (user_id, user_email, user_name, status, token)
        VALUES (${ctx.userId ?? null}::uuid, ${input.email}, ${input.name ?? null}, 'open', ${token})
        RETURNING id
      `)[0];
      const conversationId = inserted.id;

      await prisma.$executeRaw`
        INSERT INTO public.chat_messages (conversation_id, sender, content, sent_via)
        VALUES (${conversationId}::uuid, 'user', ${input.message}, 'web')
      `;

      const subject = `New Chat Question ${token}`;
      const html = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
          <p><strong>From:</strong> ${input.name ?? 'Anonymous'} &lt;${input.email}&gt;</p>
          <p><strong>Token:</strong> ${token}</p>
          <p><strong>Message:</strong></p>
          <pre style="white-space:pre-wrap">${input.message}</pre>
          <hr />
          <p>Reply to this email (keep the subject) and your response will appear in the user chat.</p>
        </div>
      `;
      await sendEmail({
        to: process.env.SUPPORT_EMAIL || 'danieljohnabrahamson@gmail.com',
        subject,
        html,
        templateType: 'entry-submitted',
      });

      return { token, conversationId };
    }),

  getMessages: publicProcedure
    .input(z.object({ token: z.string().min(5) }))
    .query(async ({ input }) => {
      const conv = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM public.chat_conversations WHERE token = ${input.token} LIMIT 1
      `;
      if (!conv.length) return { messages: [] };
      const conversationId = conv[0].id;
      const rows = await prisma.$queryRaw<Array<{ id: string; sender: string; content: string; created_at: Date }>>`
        SELECT id, sender, content, created_at FROM public.chat_messages
        WHERE conversation_id = ${conversationId}::uuid
        ORDER BY created_at ASC
      `;
      return { messages: rows };
    }),

  addAdminReply: protectedProcedure
    .input(z.object({ token: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const conv = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM public.chat_conversations WHERE token = ${input.token} LIMIT 1
      `;
      if (!conv.length) throw new Error('Conversation not found');
      const conversationId = conv[0].id;
      await prisma.$executeRaw`
        INSERT INTO public.chat_messages (conversation_id, sender, content, sent_via)
        VALUES (${conversationId}::uuid, 'admin', ${input.content}, 'web')
      `;
      return { success: true };
    }),
});

