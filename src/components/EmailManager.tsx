'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

type TemplateType = 'registration' | 'invoice' | 'reservation' | 'entry' | 'missing-music';

interface TemplateConfig {
  name: string;
  description: string;
  icon: string;
  sampleData: any;
}

const templates: Record<TemplateType, TemplateConfig> = {
  registration: {
    name: 'Registration Confirmation',
    description: 'Sent when a studio completes their competition registration',
    icon: '✨',
    sampleData: {
      studioName: 'Dance Elite Studio',
      competitionName: 'Summer Showcase',
      competitionYear: 2025,
      competitionDate: 'July 15, 2025',
      contactEmail: 'info@glowdance.com',
    },
  },
  invoice: {
    name: 'Invoice Delivery',
    description: 'Sent when an invoice is ready for a studio',
    icon: '📄',
    sampleData: {
      studioName: 'Dance Elite Studio',
      competitionName: 'Summer Showcase',
      competitionYear: 2025,
      invoiceNumber: 'INV-2025-DELST-1234567890',
      totalAmount: 1250.00,
      entryCount: 15,
      invoiceUrl: 'https://portal.glowdance.com/invoices/123',
      dueDate: 'June 15, 2025',
    },
  },
  reservation: {
    name: 'Reservation Approved',
    description: 'Sent when a studio reservation is approved',
    icon: '✅',
    sampleData: {
      studioName: 'Dance Elite Studio',
      competitionName: 'Summer Showcase',
      competitionYear: 2025,
      spacesConfirmed: 20,
      portalUrl: 'https://portal.glowdance.com/dashboard',
    },
  },
  entry: {
    name: 'Routine Submitted',
    description: 'Sent when a competition routine is successfully submitted',
    icon: '🎭',
    sampleData: {
      studioName: 'Dance Elite Studio',
      competitionName: 'Summer Showcase',
      competitionYear: 2025,
      entryTitle: 'Starlight Dreams',
      entryNumber: 42,
      category: 'Contemporary',
      sizeCategory: 'Small Group',
      participantCount: 8,
      entryFee: 85.00,
    },
  },
  'missing-music': {
    name: 'Missing Music Reminder',
    description: 'Sent to remind studios to upload missing music files',
    icon: '🎵',
    sampleData: {
      studioName: 'Dance Elite Studio',
      competitionName: 'Summer Showcase',
      competitionYear: 2025,
      routinesWithoutMusic: [
        {
          title: 'Starlight Dreams',
          entryNumber: 42,
          category: 'Contemporary',
        },
        {
          title: 'Fire & Ice',
          entryNumber: 58,
          category: 'Jazz',
        },
        {
          title: 'Whispers in the Wind',
          entryNumber: 73,
          category: 'Lyrical',
        },
      ],
      portalUrl: 'https://portal.glowdance.com/dashboard',
      daysUntilCompetition: 12,
    },
  },
};

export default function EmailManager() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('registration');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const previewMutation = trpc.email.previewTemplate.useQuery(
    {
      template: selectedTemplate,
      data: templates[selectedTemplate].sampleData,
    },
    {
      enabled: false,
    }
  );

  const { data: emailHistory } = trpc.email.getHistory.useQuery({
    limit: 10,
  });

  const handlePreview = async () => {
    setIsLoading(true);
    const result = await previewMutation.refetch();
    if (result.data) {
      setPreviewHtml(result.data.html);
    }
    setIsLoading(false);
  };

  const handleClosePreview = () => {
    setPreviewHtml(null);
  };

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Select Email Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(templates).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedTemplate(key as TemplateType)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedTemplate === key
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{config.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{config.name}</h3>
                  <p className="text-sm text-gray-400">{config.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sample Data Display */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Sample Data</h2>
        <div className="bg-black/30 rounded-lg p-4 font-mono text-sm">
          <pre className="text-green-400 overflow-x-auto">
            {JSON.stringify(templates[selectedTemplate].sampleData, null, 2)}
          </pre>
        </div>
      </div>

      {/* Preview Button */}
      <div className="flex gap-4">
        <button
          onClick={handlePreview}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
        >
          {isLoading ? '⚙️ Generating Preview...' : '👁️ Preview Email'}
        </button>
      </div>

      {/* Email Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {templates[selectedTemplate].icon} {templates[selectedTemplate].name}
              </h3>
              <button
                onClick={handleClosePreview}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto bg-gray-50">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full min-h-[600px]"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-t border-gray-300">
              <div className="text-sm text-gray-600">
                This is a preview using sample data
              </div>
              <button
                onClick={handleClosePreview}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integration Instructions */}
      <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">📨 Email Integration</h2>
        <div className="space-y-3 text-gray-300">
          <p>
            Emails are automatically sent for the following events:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong className="text-white">Registration Confirmation:</strong> When a studio completes registration</li>
            <li><strong className="text-white">Invoice Delivery:</strong> When an invoice is generated</li>
            <li><strong className="text-white">Reservation Approved:</strong> When reservation status changes to approved</li>
            <li><strong className="text-white">Routine Submitted:</strong> When a competition routine is created</li>
            <li><strong className="text-white">Missing Music Reminder:</strong> Can be sent manually to remind studios about missing music files</li>
          </ul>
          <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
            <p className="text-yellow-200 text-sm">
              ⚠️ <strong>Note:</strong> Email sending requires SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS) in your environment variables.
              Without it, emails will fail silently.
            </p>
          </div>
        </div>
      </div>

      {/* Email History */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">📬 Recent Email History</h2>
        {!emailHistory || emailHistory.emails.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No emails sent yet
          </div>
        ) : (
          <div className="space-y-3">
            {emailHistory.emails.map((email) => (
              <div
                key={email.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        email.success
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {email.success ? '✓ Sent' : '✗ Failed'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {email.templateType}
                      </span>
                    </div>
                    <div className="text-white font-medium mb-1">{email.subject}</div>
                    <div className="text-sm text-gray-400">
                      To: {email.recipientEmail}
                      {email.studioName && ` • ${email.studioName}`}
                      {email.competitionName && ` • ${email.competitionName} (${email.competitionYear})`}
                    </div>
                    {email.errorMessage && (
                      <div className="mt-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                        Error: {email.errorMessage}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(email.sentAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            {emailHistory.total > 10 && (
              <div className="text-center text-sm text-gray-400 pt-2">
                Showing 10 of {emailHistory.total} emails
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
