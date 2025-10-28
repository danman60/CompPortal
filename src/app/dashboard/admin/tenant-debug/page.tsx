'use client';

/**
 * Tenant Isolation Debug Tool
 *
 * Comprehensive debugging for the multi-tenant architecture.
 * Traces tenant_id flow from frontend → tRPC → Prisma → Supabase
 *
 * Use this to understand:
 * - Where tenant_id comes from in context
 * - How it flows through entry creation
 * - Database-level tenant isolation
 * - Cross-tenant leak detection
 * - Schema vs DB constraint mismatches
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

export default function TenantDebugPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Get comprehensive tenant context
  const { data: contextInfo, refetch: refetchContext } = trpc.tenantDebug.getContextInfo.useQuery();

  // Get database-level tenant analysis
  const { data: dbAnalysis, refetch: refetchDB } = trpc.tenantDebug.analyzeDatabaseTenantIsolation.useQuery();

  // Test entry creation flow
  const testEntryCreationMutation = trpc.tenantDebug.testEntryCreationFlow.useMutation({
    onSuccess: (data) => {
      setTestResults(data);
      setIsRunning(false);
      toast.success('Entry creation test completed');
    },
    onError: (error) => {
      setTestResults({ error: error.message, stack: 'stack' in error ? error.stack : undefined });
      setIsRunning(false);
      toast.error('Test failed: ' + error.message);
    },
  });

  // Validate schema vs DB
  const { data: schemaValidation } = trpc.tenantDebug.validateSchemaVsDatabase.useQuery();

  const runEntryCreationTest = async () => {
    setIsRunning(true);
    setTestResults(null);
    await testEntryCreationMutation.mutateAsync();
  };

  const downloadLogs = () => {
    const logs = JSON.stringify({
      contextInfo,
      dbAnalysis,
      testResults,
      schemaValidation,
      timestamp: new Date().toISOString(),
    }, null, 2);

    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenant-debug-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/dashboard"
            className="inline-flex items-center text-white/70 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </a>
          <h1 className="text-4xl font-bold text-white mb-2">🔍 Tenant Isolation Debugger</h1>
          <p className="text-white/70">
            Complete visibility into tenant_id flow: Frontend → tRPC → Prisma → Supabase
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={runEntryCreationTest}
            disabled={isRunning}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? 'Running Test...' : '🧪 Test Entry Creation Flow'}
          </button>
          <button
            onClick={() => {
              refetchContext();
              refetchDB();
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
          >
            🔄 Refresh All Data
          </button>
          <button
            onClick={downloadLogs}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
          >
            📥 Download Full Logs (JSON)
          </button>
        </div>

        {/* 1. Context Information */}
        <div className="mb-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">1️⃣ Session Context</h2>
          {contextInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label="User ID" value={contextInfo.userId} color="blue" />
                <InfoCard label="Tenant ID" value={contextInfo.tenantId} color="purple" />
                <InfoCard label="User Role" value={contextInfo.role} color="green" />
                <InfoCard label="User Email" value={contextInfo.email} color="yellow" />
              </div>
              <div className="bg-black/30 rounded-lg p-4 overflow-x-auto">
                <div className="text-white/50 text-xs mb-2">Full Context Object:</div>
                <pre className="text-green-300 text-xs">{JSON.stringify(contextInfo, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="text-white/50">Loading context...</div>
          )}
        </div>

        {/* 2. Database Analysis */}
        <div className="mb-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">2️⃣ Database Tenant Isolation Analysis</h2>
          {dbAnalysis ? (
            <div className="space-y-4">
              {/* Tenant Counts */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Tenant Data Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(dbAnalysis.tenantCounts || {}).map(([table, counts]: [string, any]) => (
                    <div key={table} className="bg-white/5 rounded-lg p-3">
                      <div className="text-white/70 text-xs mb-1">{table}</div>
                      {Object.entries(counts).map(([tenant, count]: [string, any]) => (
                        <div key={tenant} className="text-white text-sm">
                          {tenant.slice(0, 8)}: <span className="font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cross-Tenant Leaks */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Cross-Tenant Leak Detection</h3>
                {dbAnalysis.crossTenantLeaks && dbAnalysis.crossTenantLeaks.length > 0 ? (
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4">
                    <div className="text-red-300 font-bold mb-2">⚠️ LEAKS DETECTED</div>
                    {dbAnalysis.crossTenantLeaks.map((leak: any, i: number) => (
                      <div key={i} className="text-red-200 text-sm mb-2">
                        {leak.table}: {leak.count} mismatched records
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
                    <div className="text-green-300 font-bold">✅ No cross-tenant leaks detected</div>
                  </div>
                )}
              </div>

              {/* NULL tenant_id Records */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">NULL tenant_id Records</h3>
                {dbAnalysis.nullTenantIds && Object.keys(dbAnalysis.nullTenantIds).length > 0 ? (
                  <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-lg p-4">
                    <div className="text-yellow-300 font-bold mb-2">⚠️ NULL VALUES FOUND</div>
                    {Object.entries(dbAnalysis.nullTenantIds).map(([table, count]: [string, any]) => (
                      <div key={table} className="text-yellow-200 text-sm">
                        {table}: {count} records
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
                    <div className="text-green-300 font-bold">✅ No NULL tenant_id values</div>
                  </div>
                )}
              </div>

              {/* Raw SQL Queries */}
              <details className="bg-black/30 rounded-lg p-4">
                <summary className="text-white/70 cursor-pointer text-sm">View Raw SQL Queries Used</summary>
                <pre className="text-green-300 text-xs mt-2 overflow-x-auto">
                  {dbAnalysis.queries ? JSON.stringify(dbAnalysis.queries, null, 2) : 'N/A'}
                </pre>
              </details>
            </div>
          ) : (
            <div className="text-white/50">Loading database analysis...</div>
          )}
        </div>

        {/* 3. Schema Validation */}
        <div className="mb-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">3️⃣ Schema vs Database Validation</h2>
          {schemaValidation ? (
            <div className="space-y-4">
              {/* Constraint Mismatches */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">NOT NULL Constraint Check</h3>
                {schemaValidation.constraintMismatches && schemaValidation.constraintMismatches.length > 0 ? (
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4">
                    <div className="text-red-300 font-bold mb-2">⚠️ MISMATCHES FOUND</div>
                    {schemaValidation.constraintMismatches.map((mismatch: any, i: number) => (
                      <div key={i} className="text-red-200 text-sm mb-2">
                        <strong>{mismatch.table}.{mismatch.column}</strong>:
                        Prisma says {mismatch.prismaConstraint}, DB says {mismatch.dbConstraint}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
                    <div className="text-green-300 font-bold">✅ Schema matches database constraints</div>
                  </div>
                )}
              </div>

              {/* Tables with tenant_id */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Tables with tenant_id Field</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {schemaValidation.tablesWithTenantId?.map((table: any) => (
                    <div key={table.name} className="bg-white/5 rounded-lg p-2">
                      <div className="text-white text-sm font-semibold">{table.name}</div>
                      <div className="text-white/60 text-xs">
                        {table.nullable ? 'NULLABLE' : 'NOT NULL'}
                        {table.hasRelation && ' + relation'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-white/50">Loading schema validation...</div>
          )}
        </div>

        {/* 4. Entry Creation Flow Test Results */}
        {testResults && (
          <div className="mb-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">4️⃣ Entry Creation Flow Test Results</h2>
            {testResults.error ? (
              <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4">
                <div className="text-red-300 font-bold mb-2">❌ TEST FAILED</div>
                <div className="text-red-200 text-sm mb-2">{testResults.error}</div>
                {testResults.stack && (
                  <pre className="text-red-200/70 text-xs overflow-x-auto">{testResults.stack}</pre>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
                  <div className="text-green-300 font-bold">✅ TEST PASSED</div>
                </div>

                {/* Step-by-step trace */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Execution Trace</h3>
                  <div className="space-y-2">
                    {testResults.steps?.map((step: any, i: number) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3">
                        <div className="text-white text-sm font-semibold mb-1">
                          Step {i + 1}: {step.name}
                        </div>
                        <div className="text-white/70 text-xs">{step.description}</div>
                        {step.data && (
                          <details className="mt-2">
                            <summary className="text-white/50 text-xs cursor-pointer">View Data</summary>
                            <pre className="text-green-300 text-xs mt-1 overflow-x-auto">
                              {JSON.stringify(step.data, null, 2)}
                            </pre>
                          </details>
                        )}
                        {step.sql && (
                          <div className="mt-2 bg-black/30 rounded p-2">
                            <div className="text-white/50 text-xs mb-1">Generated SQL:</div>
                            <pre className="text-blue-300 text-xs overflow-x-auto">{step.sql}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Result */}
                {testResults.result && (
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="text-white/50 text-xs mb-2">Created Entry:</div>
                    <pre className="text-green-300 text-xs overflow-x-auto">
                      {JSON.stringify(testResults.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-bold text-white mb-3">📖 How to Use This Tool</h3>
          <div className="text-white/80 text-sm space-y-3">
            <div>
              <strong className="text-white">1. Check Session Context:</strong> Verify your user has correct tenant_id
            </div>
            <div>
              <strong className="text-white">2. Review Database Analysis:</strong> Look for cross-tenant leaks or NULL values
            </div>
            <div>
              <strong className="text-white">3. Validate Schema:</strong> Ensure Prisma schema matches DB constraints
            </div>
            <div>
              <strong className="text-white">4. Test Entry Creation:</strong> Run dry-run test to trace exact flow
            </div>
            <div>
              <strong className="text-white">5. Download Logs:</strong> Share JSON with Claude for analysis
            </div>
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded">
              <strong className="text-yellow-300">💡 Pro Tip:</strong>
              <div className="text-yellow-200 text-xs mt-1">
                Run this tool before AND after making tenant_id changes to verify fixes work correctly in production
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for info cards
function InfoCard({ label, value, color }: { label: string; value: any; color: string }) {
  const colors: any = {
    blue: 'bg-blue-500/20 border-blue-500 text-blue-300',
    purple: 'bg-purple-500/20 border-purple-500 text-purple-300',
    green: 'bg-green-500/20 border-green-500 text-green-300',
    yellow: 'bg-yellow-500/20 border-yellow-500 text-yellow-300',
  };

  return (
    <div className={`${colors[color]} border rounded-lg p-3`}>
      <div className="text-white/70 text-xs mb-1">{label}</div>
      <div className="text-white font-mono text-sm break-all">
        {value || <span className="text-red-400">NULL</span>}
      </div>
    </div>
  );
}
