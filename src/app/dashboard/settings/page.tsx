import ProfileSettingsForm from '@/components/ProfileSettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Profile Settings
        </h1>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <ProfileSettingsForm />
        </div>
      </div>
    </main>
  );
}

