'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';

/**
 * Studio Invitation Button (Link to Studio Invitations Suite)
 * Super Admin only - navigates to comprehensive studio invitations management page
 */
export default function StudioInvitationButton() {
  const { data } = trpc.studioInvitations.getAllStudios.useQuery();
  const unclaimedCount = data?.stats.unclaimed || 0;

  return (
    <Link
      href="/dashboard/admin/studio-invitations"
      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
    >
      <span>📧</span>
      <span>Studio Invitations</span>
      {unclaimedCount > 0 && (
        <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
          {unclaimedCount}
        </span>
      )}
    </Link>
  );
}
