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

interface RoutineSummarySubmittedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  routineCount: number;
  totalFees: number;
  studioEmail: string;
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function RoutineSummarySubmitted({
  studioName,
  competitionName,
  competitionYear,
  routineCount,
  totalFees,
  studioEmail,
  portalUrl,
  tenantBranding,
}: RoutineSummarySubmittedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Summary from {studioName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>📋 Summary Submitted</Heading>

          <Text style={emailTheme.text}>
            <strong>{studioName}</strong> has submitted their routine summary and is ready for invoicing.
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={emailTheme.label}>Competition</Text>
            <Text style={{...emailTheme.value, marginBottom: '20px'}}>{competitionName} ({competitionYear})</Text>

            <Hr style={{...emailTheme.hr, margin: '20px 0'}} />

            {/* Table for email client compatibility */}
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <tbody>
                <tr>
                  <td style={{width: '50%', paddingRight: '10px'}}>
                    <Text style={emailTheme.label}>Total Routines</Text>
                    <Text style={emailTheme.value}>{routineCount}</Text>
                  </td>
                  <td style={{width: '50%', paddingLeft: '10px'}}>
                    <Text style={emailTheme.label}>Total Fees</Text>
                    <Text style={emailTheme.value}>${totalFees.toFixed(2)}</Text>
                  </td>
                </tr>
              </tbody>
            </table>

            <Hr style={{...emailTheme.hr, margin: '20px 0'}} />

            <Text style={emailTheme.label}>Studio Contact</Text>
            <Text style={emailTheme.value}>{studioEmail}</Text>
          </Section>

          <Text style={emailTheme.text}>
            <strong>Next Steps:</strong>
          </Text>
          <Text style={emailTheme.text}>
            • Review the routine details above<br />
            • Generate an invoice for this studio<br />
            • The studio will be notified once the invoice is created
          </Text>

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Review & Create Invoice
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            © 2025 Dance Competition Management.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
