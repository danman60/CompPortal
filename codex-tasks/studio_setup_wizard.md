## Task: Studio Setup Wizard Component

**Context:**
- File: src/components/StudioSetupWizard.tsx
- Usage: Show modal on first login for Studio Directors
- Pattern: Multi-step form with progress indicator

**Requirements:**
1. 3-step wizard:
   - Step 1: Studio Info (name, address, phone)
   - Step 2: Logo Upload (optional)
   - Step 3: Preferences (notifications, etc.)
2. Progress indicator (1/3, 2/3, 3/3)
3. Next/Previous navigation
4. Skip button (saves as incomplete)
5. Glassmorphic modal design

**Deliverables:**
- Complete StudioSetupWizard.tsx component
- Export StudioSetupWizard and useStudioSetupWizard hook
- Multi-step state management

**Component Structure:**
```tsx
interface StudioSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: StudioSetupData) => void;
  initialData?: Partial<StudioSetupData>;
}

interface StudioSetupData {
  studioName: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  logoUrl?: string;
  notificationsEnabled: boolean;
}

export default function StudioSetupWizard({ isOpen, onClose, onComplete, initialData }: StudioSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StudioSetupData>({
    studioName: '',
    address: '',
    // ... defaults
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(formData);
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 shadow-2xl max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="p-6 border-b border-white/20">
          <div className="flex justify-between mb-4">
            {[1, 2, 3].map(step => (
              <div key={step} className={`flex-1 h-2 rounded-full mx-1 ${
                step <= currentStep ? 'bg-purple-500' : 'bg-gray-600'
              }`} />
            ))}
          </div>
          <h2 className="text-2xl font-bold text-white">
            Studio Setup - Step {currentStep} of {totalSteps}
          </h2>
        </div>

        {/* Step content */}
        <div className="p-6">
          {currentStep === 1 && <Step1StudioInfo formData={formData} setFormData={setFormData} />}
          {currentStep === 2 && <Step2LogoUpload formData={formData} setFormData={setFormData} />}
          {currentStep === 3 && <Step3Preferences formData={formData} setFormData={setFormData} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between p-6 border-t border-white/20 bg-white/5">
          <div>
            {currentStep > 1 && (
              <button onClick={handlePrevious} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
                Previous
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSkip} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
              Skip for Now
            </button>
            <button onClick={handleNext} className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white">
              {currentStep === totalSteps ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate step components
function Step1StudioInfo({ formData, setFormData }) { /* ... */ }
function Step2LogoUpload({ formData, setFormData }) { /* ... */ }
function Step3Preferences({ formData, setFormData }) { /* ... */ }
```

**Validation:**
- Step 1: Required fields (name, address, phone)
- Step 2: Optional logo upload (accept .png, .jpg, .svg)
- Step 3: Preferences (defaults to enabled)

**Codex will**: Generate complete wizard component
**Claude will**: Integrate with dashboard, connect to backend mutation
