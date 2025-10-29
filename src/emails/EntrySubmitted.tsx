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
} from '@react-email/components';
import { emailTheme, gradientButton, defaultBranding } from './theme';

interface EntrySubmittedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  entryTitle: string;
  entryNumber?: number;
  category: string;
  sizeCategory: string;
  participantCount: number;
  entryFee: number;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function EntrySubmitted({
  studioName,
  competitionName,
  competitionYear,
  entryTitle,
  entryNumber,
  category,
  sizeCategory,
  participantCount,
  entryFee,
  tenantBranding,
}: EntrySubmittedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Routine submitted: {entryTitle}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Routine Submitted!</Heading>

          <Text style={emailTheme.text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            Your competition routine has been successfully submitted for{' '}
            <strong>{competitionName} ({competitionYear})</strong>.
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            {entryNumber && (
              <>
                <Text style={emailTheme.label}>Routine Number</Text>
                <Text style={{...emailTheme.valueLarge, color: primaryColor}}>#{entryNumber}</Text>
                <Hr style={emailTheme.hr} />
              </>
            )}

            <Text style={emailTheme.label}>Routine Title</Text>
            <Text style={emailTheme.value}>{entryTitle}</Text>

            <Hr style={emailTheme.hr} />

            <table style={{width: '100%', borderCollapse: 'collapse' as const}}>
              <tbody>
                <tr>
                  <td style={{width: '50%', verticalAlign: 'top'}}>
                    <Text style={emailTheme.label}>Category</Text>
                    <Text style={emailTheme.value}>{category}</Text>
                  </td>
                  <td style={{width: '50%', verticalAlign: 'top'}}>
                    <Text style={emailTheme.label}>Size</Text>
                    <Text style={emailTheme.value}>{sizeCategory}</Text>
                  </td>
                </tr>
              </tbody>
            </table>

            <Hr style={emailTheme.hr} />

            <table style={{width: '100%', borderCollapse: 'collapse' as const}}>
              <tbody>
                <tr>
                  <td style={{width: '50%', verticalAlign: 'top'}}>
                    <Text style={emailTheme.label}>Dancers</Text>
                    <Text style={emailTheme.value}>{participantCount}</Text>
                  </td>
                  <td style={{width: '50%', verticalAlign: 'top'}}>
                    <Text style={emailTheme.label}>Routine Fee</Text>
                    <Text style={{...emailTheme.value, color: '#22c55e'}}>
                      ${entryFee.toFixed(2)}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{...emailTheme.warningBox, backgroundColor: `rgba(139, 92, 246, 0.1)`, borderLeft: `4px solid ${secondaryColor}`}}>
            <Text style={{...emailTheme.h2, fontSize: '16px', color: secondaryColor, margin: '0 0 12px 0'}}>Important Reminders</Text>
            <ul style={{...emailTheme.text, margin: '0', paddingLeft: '20px'}}>
              <li>Upload your music file through the portal</li>
              <li>Review your routine details for accuracy</li>
              <li>Check your invoice for payment information</li>
              <li>Watch for schedule updates closer to competition date</li>
            </ul>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            Break a leg! We can't wait to see <em>{entryTitle}</em> on stage!
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
