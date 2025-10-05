'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function ReportsPage() {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [reportType, setReportType] = useState<'entry' | 'category' | 'judge' | 'summary'>('summary');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState<string>('');
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>('');

  // Fetch competitions
  const { data: competitionsData } = trpc.competition.getAll.useQuery();
  const competitions = competitionsData?.competitions || [];

  // Fetch report options when competition is selected
  const { data: reportOptions } = trpc.reports.getReportOptions.useQuery(
    {
      competition_id: selectedCompetitionId,
    },
    { enabled: !!selectedCompetitionId }
  );

  // Report generation mutations
  const generateEntryScoresheetMutation = trpc.reports.generateEntryScoreSheet.useMutation();
  const generateCategoryResultsMutation = trpc.reports.generateCategoryResults.useMutation();
  const generateJudgeScorecardMutation = trpc.reports.generateJudgeScorecard.useMutation();
  const generateCompetitionSummaryMutation = trpc.reports.generateCompetitionSummary.useMutation();

  const isGenerating =
    generateEntryScoresheetMutation.isPending ||
    generateCategoryResultsMutation.isPending ||
    generateJudgeScorecardMutation.isPending ||
    generateCompetitionSummaryMutation.isPending;

  const downloadPDF = (base64Data: string, filename: string) => {
    const linkSource = `data:application/pdf;base64,${base64Data}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
  };

  const handleGenerateReport = async () => {
    try {
      let result;

      if (reportType === 'entry') {
        if (!selectedEntryId) {
          alert('Please select a routine');
          return;
        }
        result = await generateEntryScoresheetMutation.mutateAsync({
          entry_id: selectedEntryId,
        });
      } else if (reportType === 'category') {
        if (!selectedCategoryId || !selectedAgeGroupId) {
          alert('Please select both category and age group');
          return;
        }
        result = await generateCategoryResultsMutation.mutateAsync({
          competition_id: selectedCompetitionId,
          category_id: selectedCategoryId,
          age_group_id: selectedAgeGroupId,
        });
      } else if (reportType === 'judge') {
        if (!selectedJudgeId) {
          alert('Please select a judge');
          return;
        }
        result = await generateJudgeScorecardMutation.mutateAsync({
          competition_id: selectedCompetitionId,
          judge_id: selectedJudgeId,
        });
      } else if (reportType === 'summary') {
        result = await generateCompetitionSummaryMutation.mutateAsync({
          competition_id: selectedCompetitionId,
        });
      }

      if (result) {
        downloadPDF(result.data, result.filename);
        alert(`✅ Report generated successfully: ${result.filename}`);
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      alert(`❌ Error: ${error.message || 'Failed to generate report'}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">📄 Event Reports</h1>
          <p className="text-gray-400">
            Generate professional PDF reports and scorecards
          </p>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar - Report type selection */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Report Type</h2>

              <div className="space-y-3">
                <button
                  onClick={() => setReportType('summary')}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    reportType === 'summary'
                      ? 'bg-purple-500/30 border-purple-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-lg font-medium">📊 Competition Summary</div>
                  <div className="text-sm opacity-75">Overall stats and highlights</div>
                </button>

                <button
                  onClick={() => setReportType('entry')}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    reportType === 'entry'
                      ? 'bg-purple-500/30 border-purple-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-lg font-medium">📋 Routine Score Sheet</div>
                  <div className="text-sm opacity-75">Individual routine scores</div>
                </button>

                <button
                  onClick={() => setReportType('category')}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    reportType === 'category'
                      ? 'bg-purple-500/30 border-purple-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-lg font-medium">🏆 Category Results</div>
                  <div className="text-sm opacity-75">Rankings by category</div>
                </button>

                <button
                  onClick={() => setReportType('judge')}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    reportType === 'judge'
                      ? 'bg-purple-500/30 border-purple-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-lg font-medium">👨‍⚖️ Judge Scorecard</div>
                  <div className="text-sm opacity-75">All scores by judge</div>
                </button>
              </div>
            </div>
          </div>

          {/* Right side - Report parameters */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Report Parameters</h2>

              <div className="space-y-5">
                {/* Competition selector - always shown */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Competition *
                  </label>
                  <select
                    value={selectedCompetitionId}
                    onChange={(e) => {
                      setSelectedCompetitionId(e.target.value);
                      // Reset selections when competition changes
                      setSelectedEntryId('');
                      setSelectedCategoryId('');
                      setSelectedAgeGroupId('');
                      setSelectedJudgeId('');
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="" className="text-gray-900">-- Select a competition --</option>
                    {competitions?.map((comp) => (
                      <option key={comp.id} value={comp.id} className="text-gray-900">
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Report-specific parameters */}
                {selectedCompetitionId && (
                  <>
                    {reportType === 'entry' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Routine *
                        </label>
                        <select
                          value={selectedEntryId}
                          onChange={(e) => setSelectedEntryId(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                        >
                          <option value="" className="text-gray-900">-- Select a routine --</option>
                          {reportOptions?.entries.map((entry) => (
                            <option key={entry.id} value={entry.id} className="text-gray-900">
                              #{entry.entry_number} - {entry.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {reportType === 'category' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Category *
                          </label>
                          <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                          >
                            <option value="" className="text-gray-900">-- Select a category --</option>
                            {reportOptions?.categories.map((cat) => (
                              <option key={cat.id} value={cat.id} className="text-gray-900">
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Age Group *
                          </label>
                          <select
                            value={selectedAgeGroupId}
                            onChange={(e) => setSelectedAgeGroupId(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                          >
                            <option value="" className="text-gray-900">-- Select an age group --</option>
                            {reportOptions?.age_groups.map((age) => (
                              <option key={age.id} value={age.id} className="text-gray-900">
                                {age.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {reportType === 'judge' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Judge *
                        </label>
                        <select
                          value={selectedJudgeId}
                          onChange={(e) => setSelectedJudgeId(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                        >
                          <option value="" className="text-gray-900">-- Select a judge --</option>
                          {reportOptions?.judges.map((judge) => (
                            <option key={judge.id} value={judge.id} className="text-gray-900">
                              {judge.name} (#{judge.judge_number})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {reportType === 'summary' && (
                      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">ℹ️</div>
                          <div className="text-sm text-blue-200">
                            <strong>Competition Summary Report</strong>
                            <p className="mt-1 opacity-90">
                              This report includes overall statistics, category breakdowns,
                              age group distribution, and award summaries for the selected
                              competition.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Generate button */}
                <div className="pt-4">
                  <button
                    onClick={handleGenerateReport}
                    disabled={!selectedCompetitionId || isGenerating}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold text-lg"
                  >
                    {isGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⚙️</span>
                        Generating PDF...
                      </span>
                    ) : (
                      <>📥 Generate & Download PDF</>
                    )}
                  </button>

                  {!selectedCompetitionId && (
                    <p className="text-sm text-gray-400 mt-2 text-center">
                      Please select a competition to begin
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Report descriptions */}
            <div className="mt-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Report Descriptions</h3>

              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <strong className="text-purple-400">📊 Competition Summary:</strong>
                  <p className="ml-6 mt-1">
                    Complete overview of the competition including total routines, participating
                    studios, dancer counts, category breakdowns, and award distribution. Perfect
                    for stakeholder reports and competition archives.
                  </p>
                </div>

                <div>
                  <strong className="text-purple-400">📋 Routine Score Sheet:</strong>
                  <p className="ml-6 mt-1">
                    Detailed score breakdown for a single routine showing all judge scores
                    (Technical, Artistic, Performance), average score, award level, and judge
                    comments. Ideal for providing feedback to studios and dancers.
                  </p>
                </div>

                <div>
                  <strong className="text-purple-400">🏆 Category Results:</strong>
                  <p className="ml-6 mt-1">
                    Final rankings within a specific category and age group. Shows placements,
                    scores, and award levels with medal indicators (🥇🥈🥉) for top 3. Used for
                    awards ceremonies and official results distribution.
                  </p>
                </div>

                <div>
                  <strong className="text-purple-400">👨‍⚖️ Judge Scorecard:</strong>
                  <p className="ml-6 mt-1">
                    Complete record of all scores submitted by a specific judge, including routine
                    details, categories, and scoring statistics. Essential for judge records and
                    event administration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
