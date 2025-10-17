'use client';

/**
 * Public Status Page
 *
 * Displays system health status for all services.
 * Provides transparency to users about system uptime and service availability.
 *
 * Wave 6: Production Monitoring
 */

import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  timestamp: string;
  checks: {
    database: string;
    email: string;
    application: string;
  };
  uptime: number;
  environment: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'degraded':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'not_configured':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'unhealthy':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'not_configured':
        return 'ℹ️';
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'healthy':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'not_configured':
        return 'Not Configured';
      case 'unhealthy':
        return 'Down';
      default:
        return 'Unknown';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
      {getStatusIcon()} {getStatusLabel()}
    </span>
  );
};

const ServiceCard = ({ name, status, description }: { name: string; status: string; description: string }) => (
  <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
    <div className="flex items-start justify-between mb-2">
      <h3 className="text-xl font-bold text-white">{name}</h3>
      <StatusBadge status={status} />
    </div>
    <p className="text-white/70 text-sm">{description}</p>
  </div>
);

export default function StatusPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setError(null);
      setLastChecked(new Date());
    } catch (err) {
      setError('Failed to fetch health status');
      console.error('Status page error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Loading system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">CompPortal Status</h1>
          <p className="text-white/70 text-lg">Real-time system health and uptime monitoring</p>
        </div>

        {/* Overall Status */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 mb-8 text-center">
          {error ? (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-3xl font-bold text-red-300 mb-2">Status Check Failed</h2>
              <p className="text-white/70">{error}</p>
            </>
          ) : health?.status === 'healthy' ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold text-green-300 mb-2">All Systems Operational</h2>
              <p className="text-white/70">CompPortal is running smoothly</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-3xl font-bold text-yellow-300 mb-2">Service Degraded</h2>
              <p className="text-white/70">Some services are experiencing issues</p>
            </>
          )}
        </div>

        {/* Service Details */}
        {health && (
          <>
            <div className="space-y-4 mb-8">
              <ServiceCard
                name="Database"
                status={health.checks.database}
                description="PostgreSQL database storing competition data, entries, and invoices"
              />
              <ServiceCard
                name="Email Service"
                status={health.checks.email}
                description="SMTP service for sending reservation approvals, invoices, and notifications"
              />
              <ServiceCard
                name="Application"
                status={health.checks.application}
                description="Core Next.js application serving the CompPortal web interface"
              />
            </div>

            {/* System Info */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-white/50 mb-1">Uptime</div>
                  <div className="text-white font-medium">{formatUptime(health.uptime)}</div>
                </div>
                <div>
                  <div className="text-white/50 mb-1">Environment</div>
                  <div className="text-white font-medium capitalize">{health.environment}</div>
                </div>
                <div>
                  <div className="text-white/50 mb-1">Last Checked</div>
                  <div className="text-white font-medium">{lastChecked.toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-white/50 text-sm">
          <p>Status updates automatically every 30 seconds</p>
          <p className="mt-2">
            For support, contact{' '}
            <a href="mailto:support@glowdance.com" className="text-blue-400 hover:text-blue-300">
              support@glowdance.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
