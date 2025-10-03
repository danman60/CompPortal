'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { redirect } from 'next/navigation';

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/');
}
