'use client';

import { useState } from 'react';

type Entity = 'dancers' | 'routines';

export default function ImportWizard({ entity = 'dancers' as Entity }: { entity?: Entity }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Smart Import Wizard</h2>
        <span className="text-sm text-gray-300">Step {step} / 3</span>
      </div>
      <p className="text-gray-300 mb-4">Entity: <strong className="text-white">{entity}</strong></p>

      {step === 1 && (
        <div className="space-y-3">
          <div className="text-gray-300">1) Upload a spreadsheet (.xls/.xlsx/.csv)</div>
          <input type="file" className="text-white" onChange={(e) => setFileName(e.target.files?.[0]?.name || null)} />
          {fileName && <div className="text-xs text-gray-400">Selected: {fileName}</div>}
          <button onClick={() => setStep(2)} disabled={!fileName} className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg disabled:opacity-50">Continue</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="text-gray-300">2) Auto‑map columns (fuzzy) and adjust low‑confidence mappings</div>
          <div className="text-sm text-gray-400">(UI scaffold — ColumnMapper goes here)</div>
          <button onClick={() => setStep(3)} className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg">Preview</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="text-gray-300">3) Dry‑run preview and commit</div>
          <div className="text-sm text-gray-400">(UI scaffold — PreviewGrid goes here)</div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg">Back</button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg">Import</button>
          </div>
        </div>
      )}
    </div>
  );
}

