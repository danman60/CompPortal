#!/usr/bin/env markdown
# bulk_judge_import_result

File
- src/components/JudgeBulkImportModal.tsx

Summary
- Glassmorphic CSV import modal with validation and preview.
- Valid rows highlighted green; errors in red with messages.
- Import button prepared (calls tRPC mutation when available).

Usage
```tsx
import JudgeBulkImportModal from '@/components/JudgeBulkImportModal';

const [open, setOpen] = useState(false);
<JudgeBulkImportModal isOpen={open} onClose={() => setOpen(false)} onImportComplete={() => {/* refetch judges */}} />
```

Validation Rules
- firstName, lastName: required
- email: required, must match simple pattern
- phone, certification: optional

