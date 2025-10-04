'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { redirect } from 'next/navigation';

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function demoLoginAction(role: 'studio_director' | 'competition_director' | 'super_admin') {
  const supabase = await createServerSupabaseClient();

  // Demo account credentials
  const credentials = {
    studio_director: {
      email: 'demo.studio@gmail.com',
      password: 'StudioDemo123!',
    },
    competition_director: {
      email: 'demo.director@gmail.com',
      password: 'DirectorDemo123!',
    },
    super_admin: {
      email: 'demo.admin@gmail.com',
      password: 'AdminDemo123!',
    },
  };

  const { email, password } = credentials[role];

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Demo login error:', error);
    redirect('/login?error=demo_login_failed');
  }

  redirect('/dashboard');
}
