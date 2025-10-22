'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studioName: '',
    address1: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    consentPhotoVideo: false,
    consentLegalInfo: false,
  });

  const updateFormData = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName) {
      setError('First and last name are required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.studioName) {
      setError('Studio name is required');
      return false;
    }
    if (!formData.consentPhotoVideo) {
      setError('You must consent to photo/video usage to continue');
      return false;
    }
    if (!formData.consentLegalInfo) {
      setError('You must consent to sharing legal information to continue');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');

    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Update user profile with first and last name
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
        })
        .eq('id', user.id);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      // Check if studio already exists
      const { data: existingStudio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      let studioError;
      const now = new Date().toISOString();

      if (existingStudio) {
        // Update existing studio
        const { error } = await supabase
          .from('studios')
          .update({
            name: formData.studioName,
            address1: formData.address1,
            city: formData.city,
            province: formData.province,
            postal_code: formData.postalCode,
            phone: formData.phone,
            email: formData.email || user.email,
            status: 'approved',
            country: 'Canada',
            consent_photo_video: formData.consentPhotoVideo,
            consent_photo_video_at: formData.consentPhotoVideo ? now : null,
            consent_legal_info: formData.consentLegalInfo,
            consent_legal_info_at: formData.consentLegalInfo ? now : null,
          })
          .eq('owner_id', user.id);
        studioError = error;
      } else {
        // Create new studio
        const { error } = await supabase
          .from('studios')
          .insert({
            tenant_id: '00000000-0000-0000-0000-000000000001', // EMPWR tenant
            owner_id: user.id,
            name: formData.studioName,
            address1: formData.address1,
            city: formData.city,
            province: formData.province,
            postal_code: formData.postalCode,
            phone: formData.phone,
            email: formData.email || user.email,
            status: 'approved',
            country: 'Canada',
            consent_photo_video: formData.consentPhotoVideo,
            consent_photo_video_at: formData.consentPhotoVideo ? now : null,
            consent_legal_info: formData.consentLegalInfo,
            consent_legal_info_at: formData.consentLegalInfo ? now : null,
          });
        studioError = error;
      }

      if (studioError) {
        throw new Error(`Failed to save studio: ${studioError.message}`);
      }

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  const stepTitles = [
    'Your Information',
    'Studio Details',
    'Contact Information',
  ];

  const stepDescriptions = [
    'Tell us about yourself',
    'Set up your dance studio profile',
    'How should we reach you?',
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🎭</div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome to CompPortal!
          </h1>
          <p className="text-gray-300">
            Let's get your studio set up in just a few steps
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center font-semibold text-lg transition-all ${
                      s === step
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 shadow-lg'
                        : s < step
                        ? 'bg-green-500/20 border-2 border-green-400/50 text-green-400'
                        : 'bg-white/5 border-2 border-white/20 text-gray-400'
                    }`}
                  >
                    {s < step ? '✓' : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`h-1 w-20 md:w-32 mx-3 rounded transition-all ${
                        s < step ? 'bg-green-400' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                {stepTitles[step - 1]}
              </h2>
              <p className="text-gray-300 text-sm">
                {stepDescriptions[step - 1]}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 animate-shake">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Onboarding Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="John"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="Doe"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Continue →
                </button>
              </div>
            )}

            {/* Step 2: Studio Details */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Studio Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.studioName}
                    onChange={(e) => updateFormData('studioName', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="Your Dance Studio"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.address1}
                    onChange={(e) => updateFormData('address1', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateFormData('city', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="Toronto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Province
                    </label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => updateFormData('province', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="ON"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Postal Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => updateFormData('postalCode', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="M5H 2N2"
                  />
                </div>

                {/* Consent Waivers */}
                <div className="pt-4 pb-2 border-t border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3">Required Consents</h3>

                  <div className="space-y-4">
                    {/* Photo/Video Consent */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.consentPhotoVideo}
                        onChange={(e) => updateFormData('consentPhotoVideo', e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-purple-500 focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          I consent to the use of photos and videos of my studio's dancers for competition materials, promotional purposes, and event documentation. <span className="text-red-400">*</span>
                        </span>
                      </div>
                    </label>

                    {/* Legal Info Consent */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.consentLegalInfo}
                        onChange={(e) => updateFormData('consentLegalInfo', e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-purple-500 focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          I consent to sharing legal information (studio name, contact details, liability acknowledgment) with the CompSync platform for registration and competition management purposes. <span className="text-red-400">*</span>
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 bg-white/10 text-white font-semibold py-3 px-6 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Information */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="(416) 555-0123"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Studio Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="studio@example.com"
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    Leave blank to use your login email
                  </p>
                </div>

                <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                  <p className="text-sm text-purple-200">
                    ✨ You're almost done! Click below to complete your studio setup.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 bg-white/10 text-white font-semibold py-3 px-6 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? 'Setting up...' : 'Complete Setup ✓'}
                  </button>
                </div>

                <p className="text-center text-xs text-gray-400 pt-2">
                  You can update these details anytime in Studio Settings
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
