'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function ProfileSettingsPage() {
  const utils = trpc.useUtils();
  const { data: user, isLoading: userLoading } = trpc.user.getCurrentUser.useQuery();
  const { data: studioData, isLoading: studioLoading } = trpc.studio.getAll.useQuery();
  const studio = studioData?.studios?.[0];

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getCurrentUser.invalidate();
      utils.studio.getAll.invalidate();
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const updateStudioMutation = trpc.studio.update.useMutation({
    onSuccess: () => {
      utils.studio.getAll.invalidate();
      toast.success('Studio information updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update studio: ${error.message}`);
    },
  });

  const updateNotificationsMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getCurrentUser.invalidate();
      toast.success('Notification preferences updated');
    },
    onError: (error) => {
      toast.error(`Failed to update notifications: ${error.message}`);
      // Revert toggle on error
      setNotificationsEnabled(!notificationsEnabled);
    },
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [studioName, setStudioName] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [studioEmail, setStudioEmail] = useState('');
  const [studioPhone, setStudioPhone] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      setNotificationsEnabled(user.notificationsEnabled || true);
    }
  }, [user]);

  useEffect(() => {
    if (studio) {
      setStudioName(studio.name || '');
      setAddress1(studio.address1 || '');
      setCity(studio.city || '');
      setProvince(studio.province || '');
      setPostalCode(studio.postal_code || '');
      setStudioEmail(studio.email || '');
      setStudioPhone(studio.phone || '');
    }
  }, [studio]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update user profile
    updateProfileMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
      notificationsEnabled,
    });

    // Update studio if exists
    if (studio?.id) {
      updateStudioMutation.mutate({
        id: studio.id,
        data: {
          name: studioName,
          address1,
          city,
          province,
          postal_code: postalCode,
          email: studioEmail,
          phone: studioPhone,
        },
      });
    }
  };

  const isLoading = userLoading || studioLoading;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-8 bg-white/20 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-12 bg-white/20 rounded"></div>
              <div className="h-12 bg-white/20 rounded"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        </div>

      <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 space-y-6">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-semibold text-white mb-2">
            First Name <span className="text-red-400">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter your first name"
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-semibold text-white mb-2">
            Last Name <span className="text-red-400">*</span>
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter your last name"
          />
        </div>

        {/* Email (Read-only) */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-white mb-2">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Studio Information Section */}
        {studio && (
          <>
            <div className="pt-6 border-t border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Studio Information</h2>
            </div>

            {/* Studio Name */}
            <div>
              <label htmlFor="studioName" className="block text-sm font-semibold text-white mb-2">
                Studio Name <span className="text-red-400">*</span>
              </label>
              <input
                id="studioName"
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter studio name"
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address1" className="block text-sm font-semibold text-white mb-2">
                Street Address
              </label>
              <input
                id="address1"
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="123 Main St"
              />
            </div>

            {/* City, Province, Postal Code Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-white mb-2">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Toronto"
                />
              </div>
              <div>
                <label htmlFor="province" className="block text-sm font-semibold text-white mb-2">
                  Province
                </label>
                <input
                  id="province"
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="ON"
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="block text-sm font-semibold text-white mb-2">
                  Postal Code
                </label>
                <input
                  id="postalCode"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="M5H 2N2"
                />
              </div>
            </div>

            {/* Studio Email */}
            <div>
              <label htmlFor="studioEmail" className="block text-sm font-semibold text-white mb-2">
                Studio Email
              </label>
              <input
                id="studioEmail"
                type="email"
                value={studioEmail}
                onChange={(e) => setStudioEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="studio@example.com"
              />
            </div>

            {/* Studio Phone */}
            <div>
              <label htmlFor="studioPhone" className="block text-sm font-semibold text-white mb-2">
                Studio Phone
              </label>
              <input
                id="studioPhone"
                type="tel"
                value={studioPhone}
                onChange={(e) => setStudioPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="(555) 987-6543"
              />
            </div>
          </>
        )}

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div>
            <h3 className="text-white font-semibold">Email Notifications</h3>
            <p className="text-sm text-gray-400">Receive updates about your competitions and entries</p>
          </div>
          <button
            type="button"
            disabled={updateNotificationsMutation.isPending}
            onClick={() => {
              const newValue = !notificationsEnabled;
              setNotificationsEnabled(newValue);
              updateNotificationsMutation.mutate({
                first_name: firstName,
                last_name: lastName,
                phone: phone || undefined,
                notificationsEnabled: newValue,
              });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              notificationsEnabled ? 'bg-purple-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Studio Info (if SD) */}
      {user?.studio && (
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Studio Information</h2>
          <div className="space-y-2 text-gray-300">
            <p><span className="font-semibold text-white">Studio Name:</span> {user.studio.name}</p>
            <p><span className="font-semibold text-white">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                user.studio.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                user.studio.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {user.studio.status}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  </main>
  );
}
