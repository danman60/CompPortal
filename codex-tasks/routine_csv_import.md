# Task: Add Routine CSV Import

**Priority**: MEDIUM (Workflow Redesign)
**Estimate**: 2-3 hours
**Status**: Ready for Codex

---

## Context

Add bulk CSV import for routines, matching the existing Dancers CSV Import workflow pattern.

**Reference**: `src/components/DancerCSVImport.tsx` - Copy this pattern

---

## Component to Create

**File**: `src/components/RoutineCSVImport.tsx`

**Based on**: `src/components/DancerCSVImport.tsx`

---

## CSV Format

**Required columns**:
- `routine_title` (string, required)
- `choreographer` (string, optional)
- `dance_category` (string, required)
- `classification` (string, required)
- `props` (string, optional)

**Example CSV**:
```csv
routine_title,choreographer,dance_category,classification,props
"Shine Bright",Jane Smith,Contemporary,Small Group,"Chairs, scarves"
"Jump",Bob Johnson,Jazz,Duo/Trio,
"Swan Lake",Maria Garcia,Ballet,Solo,
```

---

## Implementation Steps

### Step 1: Copy DancerCSVImport Component

**Read**: `src/components/DancerCSVImport.tsx`

**Copy structure**:
- File upload handling
- CSV parsing with papaparse
- Validation logic
- Error display
- Preview table
- Import confirmation

### Step 2: Modify for Routine Data

**Update interface**:
```typescript
interface RoutineCSVRow {
  routine_title: string;
  choreographer?: string;
  dance_category: string;
  classification: string;
  props?: string;
  // Validation fields
  rowNumber?: number;
  errors?: string[];
}
```

**Validation rules**:
```typescript
function validateRoutineRow(row: any, rowNumber: number): RoutineCSVRow {
  const errors: string[] = [];

  // Required: routine_title
  if (!row.routine_title || row.routine_title.trim() === '') {
    errors.push('Routine title is required');
  }

  // Required: dance_category
  const validCategories = [
    'Ballet', 'Contemporary', 'Jazz', 'Tap', 'Hip Hop',
    'Lyrical', 'Musical Theatre', 'Acro', 'Open'
  ];
  if (!row.dance_category || !validCategories.includes(row.dance_category)) {
    errors.push(`Invalid dance category. Must be one of: ${validCategories.join(', ')}`);
  }

  // Required: classification
  const validClassifications = [
    'Solo', 'Duo/Trio', 'Small Group', 'Large Group', 'Production'
  ];
  if (!row.classification || !validClassifications.includes(row.classification)) {
    errors.push(`Invalid classification. Must be one of: ${validClassifications.join(', ')}`);
  }

  return {
    routine_title: row.routine_title,
    choreographer: row.choreographer || '',
    dance_category: row.dance_category,
    classification: row.classification,
    props: row.props || '',
    rowNumber,
    errors: errors.length > 0 ? errors : undefined
  };
}
```

### Step 3: Update tRPC Mutation

**File**: `src/server/routers/entry.ts`

**Add bulk import mutation**:
```typescript
bulkImport: protectedProcedure
  .input(z.object({
    routines: z.array(z.object({
      routine_title: z.string(),
      choreographer: z.string().optional(),
      dance_category: z.string(),
      classification: z.string(),
      props: z.string().optional()
    })),
    competition_id: z.string().uuid(),
    studio_id: z.string().uuid()
  }))
  .mutation(async ({ ctx, input }) => {
    const { routines, competition_id, studio_id } = input;

    // Bulk insert routines
    const result = await prisma.entries.createMany({
      data: routines.map(routine => ({
        ...routine,
        competition_id,
        studio_id,
        status: 'draft',
        created_at: new Date()
      })),
      skipDuplicates: true
    });

    return {
      imported: result.count,
      total: routines.length
    };
  })
```

### Step 4: Component Code

```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface RoutineCSVRow {
  routine_title: string;
  choreographer?: string;
  dance_category: string;
  classification: string;
  props?: string;
  rowNumber?: number;
  errors?: string[];
}

interface RoutineCSVImportProps {
  competitionId: string;
  studioId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function RoutineCSVImport({
  competitionId,
  studioId,
  onSuccess,
  onClose
}: RoutineCSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [routines, setRoutines] = useState<RoutineCSVRow[]>([]);
  const [hasErrors, setHasErrors] = useState(false);

  const bulkImportMutation = trpc.entry.bulkImport.useMutation({
    onSuccess: (result) => {
      toast.success(`Imported ${result.imported} routines successfully`, {
        position: 'top-right'
      });
      onSuccess?.();
      onClose?.();
    },
    onError: (error) => {
      toast.error(`Failed to import: ${error.message}`, { position: 'top-right' });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Parse CSV
    Papa.parse(selectedFile, {
      header: true,
      complete: (results) => {
        const parsedRoutines = results.data
          .map((row: any, index: number) => validateRoutineRow(row, index + 1))
          .filter(r => r.routine_title); // Filter out empty rows

        const errorCount = parsedRoutines.filter(r => r.errors && r.errors.length > 0).length;

        setRoutines(parsedRoutines);
        setHasErrors(errorCount > 0);
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`, { position: 'top-right' });
      }
    });
  };

  const handleImport = () => {
    if (hasErrors) {
      toast.error('Please fix errors before importing', { position: 'top-right' });
      return;
    }

    const validRoutines = routines
      .filter(r => !r.errors || r.errors.length === 0)
      .map(({ rowNumber, errors, ...routine }) => routine);

    bulkImportMutation.mutate({
      routines: validRoutines,
      competition_id: competitionId,
      studio_id: studioId
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-white mb-4">📄 Bulk Import Routines (CSV)</h3>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
          <h4 className="text-blue-200 font-semibold mb-2">CSV Format</h4>
          <p className="text-blue-300/70 text-sm mb-2">
            Required columns: <code className="bg-black/30 px-1">routine_title</code>,
            <code className="bg-black/30 px-1 ml-1">dance_category</code>,
            <code className="bg-black/30 px-1 ml-1">classification</code>
          </p>
          <p className="text-blue-300/70 text-sm">
            Optional columns: <code className="bg-black/30 px-1">choreographer</code>,
            <code className="bg-black/30 px-1 ml-1">props</code>
          </p>
        </div>

        {/* File Upload */}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-white bg-white/5 border border-white/20 rounded-lg px-4 py-2 mb-4"
        />

        {/* Preview */}
        {routines.length > 0 && (
          <div className="mt-6">
            <h4 className="text-white font-semibold mb-3">
              Preview ({routines.length} routines)
            </h4>

            {hasErrors && (
              <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">
                  ⚠️ {routines.filter(r => r.errors && r.errors.length > 0).length} rows have
                  errors. Fix them before importing.
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-gray-400">Row</th>
                    <th className="pb-2 text-gray-400">Title</th>
                    <th className="pb-2 text-gray-400">Category</th>
                    <th className="pb-2 text-gray-400">Classification</th>
                    <th className="pb-2 text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {routines.map((routine, index) => (
                    <tr
                      key={index}
                      className={`border-b border-white/5 ${
                        routine.errors && routine.errors.length > 0 ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <td className="py-2 text-gray-400">{routine.rowNumber}</td>
                      <td className="py-2 text-white">{routine.routine_title}</td>
                      <td className="py-2 text-gray-300">{routine.dance_category}</td>
                      <td className="py-2 text-gray-300">{routine.classification}</td>
                      <td className="py-2">
                        {routine.errors && routine.errors.length > 0 ? (
                          <span className="text-red-400 text-xs">{routine.errors[0]}</span>
                        ) : (
                          <span className="text-green-400 text-xs">✓ Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || routines.length === 0 || hasErrors || bulkImportMutation.isPending}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkImportMutation.isPending ? '⏳ Importing...' : `Import ${routines.length} Routines`}
          </button>
        </div>
      </div>
    </div>
  );
}

function validateRoutineRow(row: any, rowNumber: number): RoutineCSVRow {
  const errors: string[] = [];

  if (!row.routine_title || row.routine_title.trim() === '') {
    errors.push('Routine title required');
  }

  const validCategories = ['Ballet', 'Contemporary', 'Jazz', 'Tap', 'Hip Hop', 'Lyrical', 'Musical Theatre', 'Acro', 'Open'];
  if (!row.dance_category || !validCategories.includes(row.dance_category)) {
    errors.push('Invalid category');
  }

  const validClassifications = ['Solo', 'Duo/Trio', 'Small Group', 'Large Group', 'Production'];
  if (!row.classification || !validClassifications.includes(row.classification)) {
    errors.push('Invalid classification');
  }

  return {
    routine_title: row.routine_title,
    choreographer: row.choreographer || '',
    dance_category: row.dance_category,
    classification: row.classification,
    props: row.props || '',
    rowNumber,
    errors: errors.length > 0 ? errors : undefined
  };
}
```

---

## Integration

**File**: `src/app/dashboard/entries/page.tsx`

**Add button**:
```tsx
<button
  onClick={() => setShowCSVImport(true)}
  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20"
>
  📄 Import CSV
</button>

{showCSVImport && (
  <RoutineCSVImport
    competitionId={selectedCompetition}
    studioId={studioId}
    onSuccess={() => refetch()}
    onClose={() => setShowCSVImport(false)}
  />
)}
```

---

## Quality Gates

1. ✅ **CSV parses correctly**: Uses papaparse library
2. ✅ **Validation works**: Invalid rows flagged
3. ✅ **Preview shows data**: Table displays all rows
4. ✅ **Import creates routines**: tRPC mutation succeeds
5. ✅ **List refreshes**: After import
6. ✅ **Error handling**: Shows friendly messages
7. ✅ **TypeScript compiles**: No errors

---

## Deliverables

Output file: `codex-tasks/outputs/routine_csv_import_result.md`

---

**Start Time**: [Record]
**Expected Duration**: 2-3 hours
