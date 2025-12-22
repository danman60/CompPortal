'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import {
  Calendar,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Mail,
  TrendingUp,
} from 'lucide-react';

interface CompetitionProgress {
  competitionId: string;
  competitionName: string;
  tenantId: string;
  tenantName: string;
  totalRoutines: number;
  scheduledRoutines: number;
  percentComplete: number;
  lastUpdated: string | null;
}

export default function CalendarProgressPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: progressData, isLoading, refetch } = trpc.superAdmin.getSchedulingProgress.useQuery(
    undefined,
    { refetchInterval: 30000 } // Auto-refresh every 30 seconds
  );

  const sendNotificationMutation = trpc.superAdmin.sendProgressNotification.useMutation({
    onSuccess: () => {
      alert('Notification sent successfully');
    },
    onError: (error) => {
      alert('Failed to send notification: ' + error.message);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleSendNotification = (competition: CompetitionProgress, threshold: number) => {
    sendNotificationMutation.mutate({
      competitionId: competition.competitionId,
      threshold,
      recipientEmail: 'danieljohnabrahamson@gmail.com',
    });
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 95) return 'from-green-600 to-green-500';
    if (percent >= 90) return 'from-emerald-600 to-emerald-500';
    if (percent >= 50) return 'from-amber-600 to-amber-500';
    return 'from-purple-600 to-purple-500';
  };

  const getProgressBadge = (percent: number) => {
    if (percent >= 95) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircle className="h-3 w-3" /> Near Complete
        </span>
      );
    }
    if (percent >= 90) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <TrendingUp className="h-3 w-3" /> 90%+
        </span>
      );
    }
    if (percent >= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Clock className="h-3 w-3" /> In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
        <AlertTriangle className="h-3 w-3" /> Early Stage
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-1/3"></div>
            <div className="h-64 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const competitions = progressData?.competitions || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/dashboard"
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Calendar className="h-7 w-7 text-purple-400" />
                Calendar Progress
              </h1>
              <p className="text-gray-400 text-sm">
                Monitor CD scheduling progress across all competitions
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">{competitions.length}</div>
            <div className="text-sm text-gray-400">Active Competitions</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-green-400">
              {competitions.filter(c => c.percentComplete >= 95).length}
            </div>
            <div className="text-sm text-gray-400">Near Complete (95%+)</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-amber-400">
              {competitions.filter(c => c.percentComplete >= 50 && c.percentComplete < 95).length}
            </div>
            <div className="text-sm text-gray-400">In Progress (50-94%)</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-purple-400">
              {competitions.filter(c => c.percentComplete < 50).length}
            </div>
            <div className="text-sm text-gray-400">Early Stage (&lt;50%)</div>
          </div>
        </div>

        {/* Competition Progress Cards */}
        <div className="space-y-4">
          {competitions.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No active competitions with routines found</p>
            </div>
          ) : (
            competitions.map((comp) => (
              <div
                key={comp.competitionId}
                className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">{comp.competitionName}</h3>
                    <p className="text-sm text-gray-500">{comp.tenantName}</p>
                  </div>
                  {getProgressBadge(comp.percentComplete)}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">
                      {comp.scheduledRoutines} of {comp.totalRoutines} routines scheduled
                    </span>
                    <span className="font-medium text-white">{comp.percentComplete.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div
                      className={`bg-gradient-to-r ${getProgressColor(comp.percentComplete)} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${comp.percentComplete}%` }}
                    />
                  </div>
                </div>

                {/* Milestone Markers */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${comp.percentComplete >= 50 ? 'bg-amber-500' : 'bg-white/20'}`} />
                    <span className="mt-1">50%</span>
                  </div>
                  <div className="flex-1 h-px bg-white/10 mx-2" />
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${comp.percentComplete >= 90 ? 'bg-emerald-500' : 'bg-white/20'}`} />
                    <span className="mt-1">90%</span>
                  </div>
                  <div className="flex-1 h-px bg-white/10 mx-2" />
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${comp.percentComplete >= 95 ? 'bg-green-500' : 'bg-white/20'}`} />
                    <span className="mt-1">95%</span>
                  </div>
                </div>

                {/* Notification Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <span className="text-xs text-gray-500">Send notification:</span>
                  <button
                    onClick={() => handleSendNotification(comp, 50)}
                    disabled={sendNotificationMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-colors"
                  >
                    <Mail className="h-3 w-3" /> 50% Alert
                  </button>
                  <button
                    onClick={() => handleSendNotification(comp, 90)}
                    disabled={sendNotificationMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors"
                  >
                    <Mail className="h-3 w-3" /> 90% Alert
                  </button>
                  <button
                    onClick={() => handleSendNotification(comp, 95)}
                    disabled={sendNotificationMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                  >
                    <Mail className="h-3 w-3" /> 95% Alert
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-gray-600">
          Auto-refreshes every 30 seconds. Email notifications sent to danieljohnabrahamson@gmail.com
        </div>
      </div>
    </div>
  );
}
