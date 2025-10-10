'use client';
import { useState } from 'react';

interface StudioData {
  studio_name: string;
  studio_city: string;
  studio_state: string;
  logo_url?: string;
  primary_color?: string;
  notifications_enabled?: boolean;
}

interface StudioSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: StudioData) => Promise<void>;
}

export default function StudioSetupWizard({ isOpen, onClose, onComplete }: StudioSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StudioData>({
    studio_name: '',
    studio_city: '',
    studio_state: '',
    logo_url: '',
    primary_color: '#8b5cf6',
    notifications_enabled: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.studio_name.trim()) newErrors.studio_name = 'Studio name is required';
    if (!formData.studio_city.trim()) newErrors.studio_city = 'City is required';
    if (!formData.studio_state.trim()) newErrors.studio_state = 'State is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSkip = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (currentStep === 1 && !validateStep1()) return;

    setIsSubmitting(true);
    try {
      await onComplete(formData);
      onClose();
    } catch (error) {
      console.error('Failed to complete setup:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-white/20">
            <h2 className="text-2xl font-bold text-white">Studio Setup</h2>
            <p className="text-sm text-gray-400 mt-1">Complete your studio profile</p>

            {/* Progress indicator */}
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map(step => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full ${
                    step <= currentStep ? 'bg-purple-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-280px)]">
            {/* Step 1: Studio Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Studio Name *
                  </label>
                  <input
                    type="text"
                    value={formData.studio_name}
                    onChange={(e) => setFormData({ ...formData, studio_name: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      errors.studio_name ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="e.g., Dance Studio Elite"
                  />
                  {errors.studio_name && (
                    <p className="text-red-400 text-sm mt-1">{errors.studio_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.studio_city}
                    onChange={(e) => setFormData({ ...formData, studio_city: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      errors.studio_city ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="e.g., Los Angeles"
                  />
                  {errors.studio_city && (
                    <p className="text-red-400 text-sm mt-1">{errors.studio_city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.studio_state}
                    onChange={(e) => setFormData({ ...formData, studio_state: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      errors.studio_state ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="e.g., CA"
                  />
                  {errors.studio_state && (
                    <p className="text-red-400 text-sm mt-1">{errors.studio_state}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Logo Upload */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Studio Logo (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Enter logo URL or upload later"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    You can skip this step and upload your logo later from settings
                  </p>
                </div>

                {formData.logo_url && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-300 mb-2">Preview:</p>
                    <img
                      src={formData.logo_url}
                      alt="Logo preview"
                      className="max-h-32 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Preferences */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-16 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notifications_enabled}
                      onChange={(e) => setFormData({ ...formData, notifications_enabled: e.target.checked })}
                      className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500/50"
                    />
                    <span className="text-sm font-medium text-gray-200">Enable email notifications</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1 ml-6">
                    Receive updates about entries, invoices, and competitions
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between p-6 border-t border-white/20 bg-white/5">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  Previous
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                Skip
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Completing...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
