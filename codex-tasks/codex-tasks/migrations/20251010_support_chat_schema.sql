-- Support chat schema (conversations + messages)
-- Uses SQL-only per .codexrc (no Prisma schema changes)

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- 'user' | 'admin'
  content TEXT NOT NULL,
  sent_via TEXT NULL,   -- 'email' | 'web' | 'inbound'
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_token ON public.chat_conversations(token);

-- Trigger to keep updated_at current
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'chat_conversations_touch_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION chat_conversations_touch_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_chat_conversations_touch_updated_at'
  ) THEN
    CREATE TRIGGER tr_chat_conversations_touch_updated_at
    BEFORE UPDATE ON public.chat_conversations
    FOR EACH ROW EXECUTE PROCEDURE chat_conversations_touch_updated_at();
  END IF;
END $$;

