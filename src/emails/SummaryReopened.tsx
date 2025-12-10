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

interface SummaryReopenedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  reason?: string;
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function SummaryReopened({
  studioName,
  competitionName,
  competitionYear,
  reason,
  portalUrl,
  tenantBranding,
}: SummaryReopenedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Action Required: Summary reopened for {competitionName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Action Required: Summary Reopened</Heading>

          <Text style={emailTheme.text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            Your entry summary for <strong>{competitionName} ({competitionYear})</strong> has been
            reopened by the Competition Director.
          </Text>

          {reason && (
            <Section style={emailTheme.warningBox}>
              <Text style={{...emailTheme.label, margin: '0 0 8px 0'}}>REASON</Text>
              <Text style={{...emailTheme.text, padding: 0, margin: 0}}>{reason}</Text>
            </Section>
          )}

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={{...emailTheme.label, margin: '0 0 12px 0'}}>WHAT THIS MEANS</Text>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <tbody>
                <tr>
                  <td style={{paddingBottom: '8px'}}>
                    <Text style={{...emailTheme.text, padding: 0, margin: 0}}>
                      • Your previous submission has been reset
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={{paddingBottom: '8px'}}>
                    <Text style={{...emailTheme.text, padding: 0, margin: 0}}>
                      • You can now make changes to your entries
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td>
                    <Text style={{...emailTheme.text, padding: 0, margin: 0}}>
                      • Please review and resubmit when ready
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            If you have any questions about what changes need to be made,
            please contact the Competition Director.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
