## Task: Form Validation Visual Feedback (Quick Win)

**Context:**
- Files: src/components/DancerForm.tsx, src/components/ReservationForm.tsx, potentially src/components/EntryForm.tsx
- Issue: Forms need better visual feedback for validation errors
- Pattern: Red border + error message for invalid fields

**Requirements:**
1. Add error state styling to input fields
2. Show error messages below fields
3. Use existing FieldValidation components if available (src/components/FieldValidation.tsx)
4. If no FieldValidation, add manual error display
5. Maintain existing glassmorphic design

**Deliverables:**
- Updated form components with validation feedback
- Consistent error styling across all forms
- Error messages displayed clearly

**Implementation Pattern:**

**Option A - If using React Hook Form (check imports):**
```tsx
import { useForm } from 'react-hook-form';

const { register, formState: { errors } } = useForm();

<div>
  <label className="block text-sm font-medium text-gray-200 mb-2">
    Dancer Name <span className="text-red-400">*</span>
  </label>
  <input
    {...register('name', { required: 'Name is required' })}
    className={`w-full px-4 py-2 rounded-lg bg-white/10 border ${
      errors.name ? 'border-red-500' : 'border-white/20'
    } text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
  />
  {errors.name && (
    <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
  )}
</div>
```

**Option B - If using FieldValidation component:**
```tsx
import { ValidatedInput } from '@/components/FieldValidation';

<ValidatedInput
  label="Dancer Name"
  error={errors.name?.message}
  required
  {...register('name', { required: 'Name is required' })}
/>
```

**Forms to Update:**
1. DancerForm.tsx - name, age, contact fields
2. ReservationForm.tsx - studio, competition, spaces
3. EntryForm.tsx (if validation missing) - routine title, category

**Validation Rules:**
- Required fields: "This field is required"
- Email: "Please enter a valid email"
- Numbers: "Please enter a valid number"
- Min/Max: "Value must be between X and Y"

**Styling Consistency:**
- Error border: border-red-500
- Error text: text-red-400 text-sm mt-1
- Success border: border-green-500 (optional)
- Required asterisk: text-red-400

**Codex will**: Update forms with validation feedback
**Claude will**: Test validation, verify error states work correctly
