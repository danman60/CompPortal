'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';
import { useAutoSave } from '@/hooks/useAutoSave';
import AutoSaveIndicator from '@/components/AutoSaveIndicator';
import toast from 'react-hot-toast';

interface ReservationFormProps {
  studioId: string;
}

export default function ReservationForm({ studioId }: ReservationFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    competition_id: '',
    spaces_requested: 1,
    age_of_consent: false,
    waiver_consent: false,
    media_consent: false,
  });
  const [showErrors, setShowErrors] = useState(false);

  // Smart defaults integration
  const smartDefaults = useSmartDefaults({
    key: 'reservation-form-smart-defaults',
    enabled: true,
  });

  // Auto-save integration
  const autoSave = useAutoSave(formData, {
    key: `reservation-form-draft-${studioId}`,
    debounceMs: 2000,
    enabled: true,
  });

  // Load saved draft on mount (takes priority over smart defaults)
  useEffect(() => {
    const savedData = autoSave.loadSaved();
    if (savedData) {
      setFormData(savedData);
    } else if (smartDefaults.defaults) {
      // Fall back to smart defaults if no draft
      setFormData((prev) => ({
        ...prev,
        competition_id: smartDefaults.defaults.competition_id || prev.competition_id,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch competitions (only active/upcoming)
  const { data: competitionsData } = trpc.competition.getAll.useQuery({
    isPublic: true,
    status: 'upcoming',
  });

  const createReservation = trpc.reservation.create.useMutation({
    onSuccess: () => {
      toast.success('Reservation submitted successfully! Awaiting approval.');
      // Clear draft on successful creation
      autoSave.clearSaved();
      // Save smart defaults for next reservation
      smartDefaults.saveDefaults({
        competition_id: formData.competition_id,
      });
      utils.reservation.getAll.invalidate();
      router.push('/dashboard/reservations');
    },
    onError: (error) => {
      toast.error(`Failed to create reservation: ${error.message}`);
    },
  });

  const competitions = competitionsData?.competitions || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate current step; if invalid, show error feedback
    if (!isStepValid()) {
      setShowErrors(true);
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      return;
    }

    try {
      await createReservation.mutateAsync({
        studio_id: studioId,
        competition_id: formData.competition_id,
        spaces_requested: formData.spaces_requested,
        age_of_consent: formData.age_of_consent,
        waiver_consent: formData.waiver_consent,
        media_consent: formData.media_consent,
        status: 'pending',
        payment_status: 'pending',
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      // Error toast already shown in onError handler
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.competition_id !== '';
      case 2:
        return formData.spaces_requested > 0;
      case 3:
        return true; // Agent info is optional
      case 4:
        return formData.age_of_consent && formData.waiver_consent;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex justify-between items-center mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step === currentStep
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-gray-400'
                }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {step < 4 && (
                <div
                  className={`w-12 md:w-24 h-1 ${
                    step < currentStep ? 'bg-green-500' : 'bg-white/20'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-white">
          {currentStep === 1 && 'Select Competition'}
          {currentStep === 2 && 'Routines Requested'}
          {currentStep === 3 && 'Consents & Waivers'}
          {currentStep === 4 && 'Review & Submit'}
        </h3>
      </div>

      {/* Step 1: Competition Selection */}
      {currentStep === 1 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Select Competition</h2>

          <div>
            <label htmlFor="competition_id" className="block text-sm font-medium text-gray-300 mb-2">
              Competition <span className="text-red-400">*</span>
            </label>
            <select
              id="competition_id"
              required
              value={formData.competition_id}
              onChange={(e) => setFormData({ ...formData, competition_id: e.target.value })}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                showErrors && currentStep === 1 && formData.competition_id === '' ? 'border-red-500' : 'border-white/20'
              }`}
            >
              <option value="" className="bg-gray-900 text-white">Select a competition</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
                  {comp.name} {comp.year}
                </option>
              ))}
            </select>
            {showErrors && currentStep === 1 && formData.competition_id === '' && (
              <p className="text-red-400 text-sm mt-1">Please select a competition</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Routines Requested */}
      {currentStep === 2 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Routines Requested</h2>

          <div>
            <label htmlFor="spaces_requested" className="block text-sm font-medium text-gray-300 mb-2">
              Number of Routines <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              id="spaces_requested"
              required
              min="1"
              max="1000"
              value={formData.spaces_requested}
              onChange={(e) => setFormData({ ...formData, spaces_requested: parseInt(e.target.value, 10) || 1 })}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                showErrors && currentStep === 2 && (!formData.spaces_requested || formData.spaces_requested < 1) ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="Enter number of routines"
            />
            {showErrors && currentStep === 2 && (!formData.spaces_requested || formData.spaces_requested < 1) && (
              <p className="text-red-400 text-sm mt-1">Please enter a valid number of routines</p>
            )}
            <p className="mt-2 text-sm text-gray-400">
              Number of performance entries you plan to register for this competition.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Consents */}
      {currentStep === 3 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Consents & Waivers</h2>
          <p className="text-gray-400 mb-6">Required agreements for participation</p>

          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="age_of_consent"
                checked={formData.age_of_consent}
                onChange={(e) => setFormData({ ...formData, age_of_consent: e.target.checked })}
                className="mt-1 w-5 h-5 bg-white/5 border-white/20 rounded focus:ring-purple-500"
              />
              <label htmlFor="age_of_consent" className="ml-3 text-gray-300">
                <span className="text-red-400">*</span> I confirm that I am of legal age to enter into this agreement
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="waiver_consent"
                checked={formData.waiver_consent}
                onChange={(e) => setFormData({ ...formData, waiver_consent: e.target.checked })}
                className="mt-1 w-5 h-5 bg-white/5 border-white/20 rounded focus:ring-purple-500"
              />
              <label htmlFor="waiver_consent" className="ml-3 text-gray-300">
                <span className="text-red-400">*</span> I agree to the liability waiver and release of claims
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="media_consent"
                checked={formData.media_consent}
                onChange={(e) => setFormData({ ...formData, media_consent: e.target.checked })}
                className="mt-1 w-5 h-5 bg-white/5 border-white/20 rounded focus:ring-purple-500"
              />
              <label htmlFor="media_consent" className="ml-3 text-gray-300">
                I consent to photo and video recording for promotional purposes (optional)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Review & Submit</h2>

          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">Competition</h3>
              <p>{competitions.find((c) => c.id === formData.competition_id)?.name} {competitions.find((c) => c.id === formData.competition_id)?.year}</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Routines Requested</h3>
              <p>{formData.spaces_requested} routines</p>
            </div>


            <div>
              <h3 className="font-semibold text-white mb-2">Consents</h3>
              <ul className="space-y-1">
                <li>✓ Age of consent confirmed</li>
                <li>✓ Liability waiver agreed</li>
                {formData.media_consent && <li>✓ Media consent provided</li>}
              </ul>
            </div>

            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg">
              <p className="text-blue-400 text-sm">
                <strong>Note:</strong> This reservation will be submitted for approval by the competition director.
                You will receive a confirmation email once approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard/reservations')}
          className="px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
        >
          Cancel
        </button>

        <div className="flex gap-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              Back
            </button>
          )}

          <button
            type="submit"
            disabled={!isStepValid() || (currentStep === 4 && createReservation.isPending)}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {currentStep === 4
              ? createReservation.isPending
                ? 'Submitting...'
                : 'Submit Reservation'
              : 'Next'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {createReservation.error && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">{createReservation.error.message}</p>
        </div>
      )}

      {/* Auto-save Indicator */}
      <AutoSaveIndicator status={autoSave.status.status} lastSaved={autoSave.status.lastSaved} />
    </form>
  );
}
