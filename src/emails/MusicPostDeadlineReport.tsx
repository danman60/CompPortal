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

interface EntryMissingMusic {
  entryNumber: number;
  title: string;
  studioName: string;
  category: string;
}

interface MusicPostDeadlineReportProps {
  cdName: string;
  competitionName: string;
  competitionYear: number;
  totalEntries: number;
  withMusic: number;
  missingMusic: number;
  entriesMissing: EntryMissingMusic[];
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string | null;
    tenantName?: string;
  };
}

export default function MusicPostDeadlineReport({
  cdName,
  competitionName,
  competitionYear,
  totalEntries,
  withMusic,
  missingMusic,
  entriesMissing,
  portalUrl,
  tenantBranding,
}: MusicPostDeadlineReportProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>{`Final Music Report: ${withMusic}/${totalEntries} entries have music (${missingMusic} missing)`}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Final Music Upload Report</Heading>

          <Text style={emailTheme.text}>
            Hi <strong>{cdName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            The entry deadline for <strong>{competitionName} ({competitionYear})</strong> has passed.
            Here's the final music upload status:
          </Text>

          {/* Final Stats */}
          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <tr>
                <td style={{textAlign: 'center', padding: '16px'}}>
                  <Text style={{...emailTheme.label, margin: '0 0 4px 0', padding: 0}}>Complete</Text>
                  <Text style={{...emailTheme.valueLarge, fontSize: '36px', color: '#22c55e'}}>{withMusic}</Text>
                </td>
                <td style={{textAlign: 'center', padding: '16px'}}>
                  <Text style={{...emailTheme.label, margin: '0 0 4px 0', padding: 0}}>Incomplete</Text>
                  <Text style={{...emailTheme.valueLarge, fontSize: '36px', color: missingMusic > 0 ? '#ef4444' : '#22c55e'}}>{missingMusic}</Text>
                </td>
                <td style={{textAlign: 'center', padding: '16px'}}>
                  <Text style={{...emailTheme.label, margin: '0 0 4px 0', padding: 0}}>Total</Text>
                  <Text style={{...emailTheme.valueLarge, fontSize: '36px', color: primaryColor}}>{totalEntries}</Text>
                </td>
              </tr>
            </table>
          </Section>

          {missingMusic > 0 ? (
            <>
              <Text style={{...emailTheme.h2, fontSize: '20px', color: '#ef4444'}}>
                Entries Without Music ({missingMusic})
              </Text>

              {/* Table Header */}
              <table style={{...emailTheme.table, marginTop: '0'}}>
                <thead>
                  <tr>
                    <th style={emailTheme.tableHeader}>Entry #</th>
                    <th style={emailTheme.tableHeader}>Title</th>
                    <th style={emailTheme.tableHeader}>Studio</th>
                    <th style={emailTheme.tableHeader}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesMissing.slice(0, 20).map((entry, index) => (
                    <tr key={index}>
                      <td style={emailTheme.tableCell}>#{entry.entryNumber}</td>
                      <td style={emailTheme.tableCell}>{entry.title}</td>
                      <td style={emailTheme.tableCell}>{entry.studioName}</td>
                      <td style={emailTheme.tableCell}>{entry.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {entriesMissing.length > 20 && (
                <Text style={{...emailTheme.textSmall, textAlign: 'center' as const}}>
                  +{entriesMissing.length - 20} more entries without music
                </Text>
              )}

              {/* Action Options */}
              <Section style={{...emailTheme.warningBox, marginTop: '24px'}}>
                <Text style={{...emailTheme.h2, fontSize: '16px', margin: '0 0 12px 0'}}>
                  Recommended Actions
                </Text>
                <ol style={{...emailTheme.textSmall, padding: '0 0 0 20px', margin: '0'}}>
                  <li style={{marginBottom: '8px'}}>Contact studios directly for missing files</li>
                  <li style={{marginBottom: '8px'}}>Mark entries as exempt if they don't need music (a cappella, etc.)</li>
                  <li style={{marginBottom: '8px'}}>Request music at check-in on competition day</li>
                  <li>Send a final notice to studios with missing music</li>
                </ol>
              </Section>

              <div style={{textAlign: 'center', margin: '24px 0'}}>
                <Button href={`${portalUrl}/dashboard/director-panel/music-status`} style={gradientButton(primaryColor, secondaryColor)}>
                  Download Full Report
                </Button>
              </div>

              <div style={{textAlign: 'center', marginBottom: '24px'}}>
                <Button href={`${portalUrl}/dashboard/director-panel/music-status?action=send-final`} style={{
                  ...emailTheme.button,
                  backgroundColor: 'transparent',
                  border: `2px solid ${primaryColor}`,
                  color: primaryColor,
                }}>
                  Send Final Notice to Studios
                </Button>
              </div>
            </>
          ) : (
            <Section style={emailTheme.successBox}>
              <Text style={{...emailTheme.h2, fontSize: '24px', textAlign: 'center' as const, margin: '0 0 8px 0', color: '#22c55e'}}>
                All Music Files Received!
              </Text>
              <Text style={{...emailTheme.text, textAlign: 'center' as const, margin: '0'}}>
                Congratulations! All {totalEntries} entries have their music files uploaded.
              </Text>
            </Section>
          )}

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            This is an automated post-deadline report for {competitionName}.
            <br />
            — CompSync
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
