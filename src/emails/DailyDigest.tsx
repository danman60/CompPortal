import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { TenantBranding } from '@/lib/email-templates';
import { emailTheme, defaultBranding } from './theme';

interface DailyDigestProps {
  userName: string;
  tenantName: string;
  portalUrl: string;
  pendingActions: {
    classificationRequests: Array<{
      id: string;
      entryTitle: string;
      studioName: string;
      requestedClassification: string;
      submittedAt: Date;
    }>;
    reservationReviews: Array<{
      id: string;
      studioName: string;
      competitionName: string;
      entriesRequested: number;
      submittedAt: Date;
    }>;
  };
  upcomingEvents: Array<{
    id: string;
    name: string;
    startDate: Date;
    daysUntil: number;
  }>;
  recentActivity: Array<{
    action: string;
    description: string;
    timestamp: Date;
  }>;
  tenantBranding?: TenantBranding;
}

export default function DailyDigest({
  userName = 'Competition Director',
  tenantName = 'CompSync',
  portalUrl = 'https://compsync.net',
  pendingActions = { classificationRequests: [], reservationReviews: [] },
  upcomingEvents = [],
  recentActivity = [],
  tenantBranding,
}: DailyDigestProps) {
  const totalPending =
    pendingActions.classificationRequests.length + pendingActions.reservationReviews.length;

  const previewText = totalPending > 0
    ? `${totalPending} pending action${totalPending > 1 ? 's' : ''} require your attention`
    : `Your daily digest for ${tenantName}`;

  const primaryColor = tenantBranding?.primaryColor || '#7C3AED';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          {/* Header */}
          <Section style={header}>
            {tenantBranding?.logo ? (
              <img src={tenantBranding.logo} alt={tenantName} style={logo} />
            ) : (
              <Heading style={heading}>{tenantName}</Heading>
            )}
            <Text style={headerSubtitle}>Daily Digest</Text>
          </Section>

          {/* Greeting */}
          <Section style={section}>
            <Text style={greetingText}>Hi {userName},</Text>
            <Text style={introText}>
              Here's your daily summary of activity and pending actions.
            </Text>
          </Section>

          {/* Pending Actions */}
          {totalPending > 0 && (
            <Section style={section}>
              <Heading as="h2" style={sectionHeading}>
                ⏳ Pending Actions ({totalPending})
              </Heading>

              {/* Classification Requests */}
              {pendingActions.classificationRequests.length > 0 && (
                <>
                  <Text style={subsectionHeading}>
                    Classification Exception Requests ({pendingActions.classificationRequests.length})
                  </Text>
                  {pendingActions.classificationRequests.map((req, i) => (
                    <div key={i} style={itemCard}>
                      <Text style={itemTitle}>{req.entryTitle}</Text>
                      <Text style={itemDetail}>
                        Studio: {req.studioName}
                      </Text>
                      <Text style={itemDetail}>
                        Requested: {req.requestedClassification}
                      </Text>
                      <Text style={itemTimestamp}>
                        Submitted {formatTimeAgo(req.submittedAt)}
                      </Text>
                    </div>
                  ))}
                  <Button
                    href={`${portalUrl}/dashboard/classification-requests`}
                    style={{ ...button, backgroundColor: primaryColor }}
                  >
                    Review Classification Requests
                  </Button>
                </>
              )}

              {/* Reservation Reviews */}
              {pendingActions.reservationReviews.length > 0 && (
                <>
                  <Text style={subsectionHeading}>
                    Reservation Reviews ({pendingActions.reservationReviews.length})
                  </Text>
                  {pendingActions.reservationReviews.map((res, i) => (
                    <div key={i} style={itemCard}>
                      <Text style={itemTitle}>{res.studioName}</Text>
                      <Text style={itemDetail}>
                        Competition: {res.competitionName}
                      </Text>
                      <Text style={itemDetail}>
                        Entries Requested: {res.entriesRequested}
                      </Text>
                      <Text style={itemTimestamp}>
                        Submitted {formatTimeAgo(res.submittedAt)}
                      </Text>
                    </div>
                  ))}
                  <Button
                    href={`${portalUrl}/dashboard/reservation-pipeline`}
                    style={{ ...button, backgroundColor: primaryColor }}
                  >
                    Review Reservations
                  </Button>
                </>
              )}
            </Section>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={sectionHeading}>
                📅 Upcoming Events ({upcomingEvents.length})
              </Heading>
              {upcomingEvents.map((event, i) => (
                <div key={i} style={itemCard}>
                  <Text style={itemTitle}>{event.name}</Text>
                  <Text style={itemDetail}>
                    {event.startDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={itemTimestamp}>
                    {event.daysUntil === 0
                      ? 'Today'
                      : event.daysUntil === 1
                      ? 'Tomorrow'
                      : `In ${event.daysUntil} days`}
                  </Text>
                </div>
              ))}
              <Button
                href={`${portalUrl}/dashboard/competitions`}
                style={{ ...button, backgroundColor: primaryColor }}
              >
                View Competitions
              </Button>
            </Section>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={sectionHeading}>
                📊 Recent Activity ({recentActivity.length})
              </Heading>
              {recentActivity.slice(0, 10).map((activity, i) => (
                <div key={i} style={activityItem}>
                  <Text style={activityDescription}>{activity.description}</Text>
                  <Text style={activityTimestamp}>{formatTimeAgo(activity.timestamp)}</Text>
                </div>
              ))}
              <Link href={`${portalUrl}/dashboard`} style={link}>
                View all activity →
              </Link>
            </Section>
          )}

          {/* Empty State */}
          {totalPending === 0 && upcomingEvents.length === 0 && recentActivity.length === 0 && (
            <Section style={section}>
              <Text style={emptyText}>
                No pending actions or recent activity. You're all caught up! 🎉
              </Text>
            </Section>
          )}

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because you have daily digest enabled.
            </Text>
            <Link href={`${portalUrl}/dashboard/settings`} style={footerLink}>
              Manage email preferences
            </Link>
            <Text style={footerText}>
              © {new Date().getFullYear()} {tenantName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Format date as time ago string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// Styles (now using dark theme from emailTheme)
// main and container styles now use emailTheme.main and emailTheme.container

const header = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
};

const logo = {
  maxWidth: '150px',
  margin: '0 auto',
};

const heading = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#c4b5fd', // purple-300
  margin: '0',
};

const headerSubtitle = {
  fontSize: '14px',
  color: '#94a3b8', // slate-400
  margin: '8px 0 0',
};

const section = {
  padding: '24px 40px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const greetingText = {
  fontSize: '16px',
  color: '#e2e8f0', // slate-200
  margin: '0 0 12px',
};

const introText = {
  fontSize: '14px',
  color: '#cbd5e1', // slate-300
  lineHeight: '24px',
  margin: '0',
};

const sectionHeading = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#f1f5f9', // slate-100
  margin: '0 0 16px',
};

const subsectionHeading = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#cbd5e1', // slate-300
  margin: '20px 0 12px',
};

const itemCard = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
};

const itemTitle = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#f1f5f9', // slate-100
  margin: '0 0 8px',
};

const itemDetail = {
  fontSize: '14px',
  color: '#cbd5e1', // slate-300
  margin: '4px 0',
};

const itemTimestamp = {
  fontSize: '12px',
  color: '#94a3b8', // slate-400
  margin: '8px 0 0',
};

const button = {
  backgroundColor: '#8b5cf6', // purple-500
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  marginTop: '16px',
};

const activityItem = {
  padding: '12px 0',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const activityDescription = {
  fontSize: '14px',
  color: '#e2e8f0', // slate-200
  margin: '0 0 4px',
};

const activityTimestamp = {
  fontSize: '12px',
  color: '#94a3b8', // slate-400
  margin: '0',
};

const link = {
  color: '#c4b5fd', // purple-300
  fontSize: '14px',
  textDecoration: 'underline',
};

const emptyText = {
  fontSize: '14px',
  color: '#94a3b8', // slate-400
  textAlign: 'center' as const,
  padding: '32px 0',
};

const hr = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '20px 0',
};

const footer = {
  textAlign: 'center' as const,
  padding: '0 40px',
};

const footerText = {
  fontSize: '12px',
  color: '#94a3b8', // slate-400
  margin: '8px 0',
};

const footerLink = {
  color: '#c4b5fd', // purple-300
  fontSize: '12px',
  textDecoration: 'underline',
  display: 'block',
  margin: '8px 0',
};
