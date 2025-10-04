'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    agent_first_name: '',
    agent_last_name: '',
    agent_email: '',
    agent_phone: '',
    agent_title: '',
    age_of_consent: false,
    waiver_consent: false,
    media_consent: false,
  });

  // Fetch competitions
  const { data: competitionsData } = trpc.competition.getAll.useQuery({
    status: 'registration_open',
    isPublic: true,
  });

  const createReservation = trpc.reservation.create.useMutation({
    onSuccess: () => {
      utils.reservation.getAll.invalidate();
      router.push('/dashboard/reservations');
    },
  });

  const competitions = competitionsData?.competitions || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      return;
    }

    try {
      await createReservation.mutateAsync({
        studio_id: studioId,
        competition_id: formData.competition_id,
        spaces_requested: formData.spaces_requested,
        agent_first_name: formData.agent_first_name || undefined,
        agent_last_name: formData.agent_last_name || undefined,
        agent_email: formData.agent_email || undefined,
        agent_phone: formData.agent_phone || undefined,
        agent_title: formData.agent_title || undefined,
        age_of_consent: formData.age_of_consent,
        waiver_consent: formData.waiver_consent,
        media_consent: formData.media_consent,
        status: 'pending',
        payment_status: 'pending',
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      alert(error instanceof Error ? error.message : 'Failed to create reservation');
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
          {[1, 2, 3, 4, 5].map((step) => (
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
              {step < 5 && (
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
          {currentStep === 3 && 'Agent Information'}
          {currentStep === 4 && 'Consents & Waivers'}
          {currentStep === 5 && 'Review & Submit'}
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
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="" className="text-gray-900">Select a competition</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id} className="text-gray-900">
                  {comp.name} {comp.year}
                </option>
              ))}
            </select>
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
              onChange={(e) => setFormData({ ...formData, spaces_requested: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter number of routines"
            />
            <p className="mt-2 text-sm text-gray-400">
              Number of performance entries you plan to register for this competition.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Agent Information */}
      {currentStep === 3 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Agent Information</h2>
          <p className="text-gray-400 mb-6">Primary contact person for this reservation (optional)</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="agent_first_name" className="block text-sm font-medium text-gray-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="agent_first_name"
                maxLength={100}
                value={formData.agent_first_name}
                onChange={(e) => setFormData({ ...formData, agent_first_name: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Agent first name"
              />
            </div>

            <div>
              <label htmlFor="agent_last_name" className="block text-sm font-medium text-gray-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="agent_last_name"
                maxLength={100}
                value={formData.agent_last_name}
                onChange={(e) => setFormData({ ...formData, agent_last_name: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Agent last name"
              />
            </div>

            <div>
              <label htmlFor="agent_email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="agent_email"
                value={formData.agent_email}
                onChange={(e) => setFormData({ ...formData, agent_email: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="agent@example.com"
              />
            </div>

            <div>
              <label htmlFor="agent_phone" className="block text-sm font-medium text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                id="agent_phone"
                maxLength={50}
                value={formData.agent_phone}
                onChange={(e) => setFormData({ ...formData, agent_phone: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="agent_title" className="block text-sm font-medium text-gray-300 mb-2">
                Title/Role
              </label>
              <input
                type="text"
                id="agent_title"
                maxLength={100}
                value={formData.agent_title}
                onChange={(e) => setFormData({ ...formData, agent_title: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Studio Director, Dance Teacher"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Consents */}
      {currentStep === 4 && (
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

      {/* Step 5: Review */}
      {currentStep === 5 && (
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

            {(formData.agent_first_name || formData.agent_last_name) && (
              <div>
                <h3 className="font-semibold text-white mb-2">Agent Information</h3>
                <p>{formData.agent_first_name} {formData.agent_last_name}</p>
                {formData.agent_email && <p>{formData.agent_email}</p>}
                {formData.agent_phone && <p>{formData.agent_phone}</p>}
                {formData.agent_title && <p className="text-gray-400">{formData.agent_title}</p>}
              </div>
            )}

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
            disabled={!isStepValid() || (currentStep === 5 && createReservation.isPending)}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {currentStep === 5
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
    </form>
  );
}
