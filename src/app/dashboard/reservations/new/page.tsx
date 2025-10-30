import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import { getTenantData } from '@/lib/tenant-context';
import Link from 'next/link';
import ReservationForm from '@/components/ReservationForm';

export default async function NewReservationPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get current tenant from subdomain
  const tenant = await getTenantData();
  const tenantId = tenant?.id;

  // Fetch studio where user is the owner on THIS tenant
  const studio = await prisma.studios.findFirst({
    where: {
      owner_id: user.id,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    select: { id: true },
  });

  if (!studio?.id) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Studio Association Required</h2>
            <p className="text-gray-300">
              You must be associated with a studio to create a reservation. Please contact an administrator.
            </p>
            <Link
              href="/dashboard/reservations"
              className="mt-4 inline-block px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              ← Back to Reservations
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/reservations"
            className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
          >
            ← Back to Reservations
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Create New Reservation</h1>
          <p className="text-gray-400">Reserve your spots for an upcoming competition</p>
        </div>

        {/* Reservation Form */}
        <ReservationForm studioId={studio.id} />
      </div>
    </main>
  );
}
