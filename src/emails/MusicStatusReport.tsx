import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from '@react-email/components';
import { emailTheme, gradientButton, defaultBranding } from './theme';

interface StudioMissingMusic {
  studioName: string;
  studioId: string;
  missingCount: number;
  entryNumbers: number[];
  lastReminderAt?: Date | null;
}

interface MusicStatusReportProps {
  cdName: string;
  competitionName: string;
  competitionYear: number;
  totalEntries: number;
  withMusic: number;
  missingMusic: number;
  studiosWithMissing: StudioMissingMusic[];
  portalUrl: string;
  daysUntilDeadline?: number;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string | null;
    tenantName?: string;
  };
}

export default function MusicStatusReport({
  cdName,
  competitionName,
  competitionYear,
  totalEntries,
  withMusic,
  missingMusic,
  studiosWithMissing,
  portalUrl,
  daysUntilDeadline,
  tenantBranding,
}: MusicStatusReportProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;
  const percentComplete = totalEntries > 0 ? Math.round((withMusic / totalEntries) * 100) : 0;

  return (
    <Html>
      <Head />
      <Preview>{`Music Status: ${missingMusic} entries missing music across ${studiosWithMissing.length} studios`}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Music Upload Status Report</Heading>

          <Text style={emailTheme.text}>
            Hi <strong>{cdName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            Here's your music upload status for <strong>{competitionName} ({competitionYear})</strong>.
          </Text>

          {daysUntilDeadline !== undefined && daysUntilDeadline <= 7 && daysUntilDeadline >= 0 && (
            <Section style={emailTheme.warningBox}>
              <Text style={{...emailTheme.text, textAlign: 'center' as const, margin: '0', fontWeight: 'bold'}}>
                {daysUntilDeadline === 0
                  ? 'Entry deadline is TODAY!'
                  : `${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} until entry deadline`}
              </Text>
            </Section>
          )}

          {/* Stats Overview */}
          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <tr>
                <td style={{textAlign: 'center', padding: '12px'}}>
                  <Text style={{...emailTheme.label, margin: '0 0 4px 0', padding: 0}}>Total Entries</Text>
                  <Text style={{...emailTheme.valueLarge, fontSize: '32px', color: primaryColor}}>{totalEntries}</Text>
                </td>
                <td style={{textAlign: 'center', padding: '12px'}}>
                  <Text style={{...emailTheme.label, margin: '0 0 4px 0', padding: 0}}>With Music</Text>
                  <Text style={{...emailTheme.valueLarge, fontSize: '32px', color: '#22c55e'}}>{withMusic}</Text>
                </td>
                <td style={{textAlign: 'center', padding: '12px'}}>
                  <Text style={{...emailTheme.label, margin: '0 0 4px 0', padding: 0}}>Missing</Text>
                  <Text style={{...emailTheme.valueLarge, fontSize: '32px', color: missingMusic > 0 ? '#ef4444' : '#22c55e'}}>{missingMusic}</Text>
                </td>
              </tr>
            </table>
            <div style={{marginTop: '16px'}}>
              <Text style={{...emailTheme.textSmall, textAlign: 'center' as const, margin: '0', padding: 0}}>
                {percentComplete}% Complete
              </Text>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                marginTop: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percentComplete}%`,
                  height: '100%',
                  backgroundColor: '#22c55e',
                  borderRadius: '4px',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          </Section>

          {missingMusic > 0 && (
            <>
              <Text style={{...emailTheme.h2, fontSize: '20px'}}>
                Studios with Missing Music ({studiosWithMissing.length})
              </Text>

              {studiosWithMissing.slice(0, 10).map((studio, index) => (
                <Section key={index} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '16px',
                  margin: '0 40px 12px 40px',
                }}>
                  <table style={{width: '100%'}}>
                    <tr>
                      <td>
                        <Text style={{...emailTheme.value, fontSize: '16px', margin: 0, padding: 0}}>
                          {studio.studioName}
                        </Text>
                        <Text style={{...emailTheme.textSmall, margin: '4px 0 0 0', padding: 0}}>
                          Entries: {studio.entryNumbers.slice(0, 8).map(n => `#${n}`).join(', ')}
                          {studio.entryNumbers.length > 8 && ` +${studio.entryNumbers.length - 8} more`}
                        </Text>
                      </td>
                      <td style={{textAlign: 'right', verticalAlign: 'top'}}>
                        <Text style={{
                          ...emailTheme.label,
                          margin: 0,
                          padding: '4px 12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          borderRadius: '12px',
                          display: 'inline-block',
                          color: '#fca5a5'
                        }}>
                          {studio.missingCount} missing
                        </Text>
                      </td>
                    </tr>
                    {studio.lastReminderAt && (
                      <tr>
                        <td colSpan={2}>
                          <Text style={{...emailTheme.textSmall, margin: '8px 0 0 0', padding: 0, color: '#94a3b8'}}>
                            Last reminder: {new Date(studio.lastReminderAt).toLocaleDateString()}
                          </Text>
                        </td>
                      </tr>
                    )}
                  </table>
                </Section>
              ))}

              {studiosWithMissing.length > 10 && (
                <Text style={{...emailTheme.textSmall, textAlign: 'center' as const}}>
                  +{studiosWithMissing.length - 10} more studios with missing music
                </Text>
              )}

              <div style={{textAlign: 'center', margin: '24px 0'}}>
                <Button href={`${portalUrl}/dashboard/director-panel/music-status`} style={gradientButton(primaryColor, secondaryColor)}>
                  View Full Report
                </Button>
              </div>

              <div style={{textAlign: 'center', marginBottom: '24px'}}>
                <Button href={`${portalUrl}/dashboard/director-panel/music-status?action=remind-all`} style={{
                  ...emailTheme.button,
                  backgroundColor: 'transparent',
                  border: `2px solid ${primaryColor}`,
                  color: primaryColor,
                }}>
                  Send Reminders to All Studios
                </Button>
              </div>
            </>
          )}

          {missingMusic === 0 && (
            <Section style={emailTheme.successBox}>
              <Text style={{...emailTheme.text, textAlign: 'center' as const, margin: '0', fontWeight: 'bold'}}>
                All entries have music files uploaded!
              </Text>
            </Section>
          )}

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            This is an automated status report for {competitionName}.
            <br />
            Manage your notification preferences in the competition settings.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
