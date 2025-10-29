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

interface ReservationApprovedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  spacesConfirmed: number;
  portalUrl: string;
  nextSteps?: string[];
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function ReservationApproved({
  studioName,
  competitionName,
  competitionYear,
  spacesConfirmed,
  portalUrl,
  nextSteps = [
    'Submit your competition routines',
    'Upload music files for your routines',
    'Review and pay your invoice',
  ],
  tenantBranding,
}: ReservationApprovedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Reservation approved for {competitionName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>✅ Reservation Approved!</Heading>

          <Text style={emailTheme.text}>
            Great news, <strong>{studioName}</strong>!
          </Text>

          <Text style={emailTheme.text}>
            Your reservation for <strong>{competitionName} ({competitionYear})</strong> has been approved.
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={emailTheme.label}>CONFIRMED SPACES</Text>
            <Text style={{...emailTheme.valueLarge, fontSize: '64px'}}>{spacesConfirmed}</Text>
          </Section>

          <Text style={emailTheme.text}>
            You can now proceed with the following steps:
          </Text>

          {/* Table-based layout for email client compatibility */}
          <table style={{width: '100%', padding: '0 40px', margin: '24px 0', borderCollapse: 'collapse' as const}}>
            <tbody>
              {nextSteps.map((step, index) => (
                <tr key={index}>
                  <td style={{paddingBottom: '12px', verticalAlign: 'top'}}>
                    <table style={{borderCollapse: 'collapse'}}>
                      <tbody>
                        <tr>
                          <td style={{
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            textAlign: 'center' as const,
                            fontWeight: 'bold',
                            fontSize: '18px',
                            lineHeight: '36px',
                            backgroundColor: primaryColor,
                          }}>
                            {index + 1}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td style={{paddingBottom: '12px', paddingLeft: '16px'}}>
                    <Text style={{...emailTheme.text, margin: '0', padding: '6px 0'}}>{step}</Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            We're excited to see your performances at {competitionName}! 🎉
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
