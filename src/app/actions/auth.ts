'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function superAdminLoginAction() {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: 'danieljohnabrahamson@gmail.com',
    password: 'CompSyncSALogin',
  });

  if (error) {
    console.error('SA login error:', error);
    redirect('/login?error=sa_login_failed');
  }

  // Force Next.js to refetch all data
  revalidatePath('/', 'layout');

  redirect('/dashboard');
}
