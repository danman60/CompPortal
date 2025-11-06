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

interface ReservationRejectedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  reason?: string;
  portalUrl: string;
  contactEmail: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function ReservationRejected({
  studioName,
  competitionName,
  competitionYear,
  reason,
  portalUrl,
  contactEmail,
  tenantBranding,
}: ReservationRejectedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Reservation update for {competitionName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Reservation Status Update</Heading>

          <Text style={emailTheme.text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            We're writing to inform you that your reservation request for{' '}
            <strong>{competitionName} ({competitionYear})</strong> could not be approved at this time.
          </Text>

          {reason && (
            <Section style={emailTheme.errorBox}>
              <Text style={emailTheme.label}>Reason</Text>
              <Text style={{...emailTheme.text, padding: '0', margin: '0'}}>{reason}</Text>
            </Section>
          )}

          <Text style={emailTheme.text}>
            We understand this may be disappointing. Here are your next steps:
          </Text>

          <Section style={emailTheme.infoBox}>
            <Text style={{...emailTheme.label, marginBottom: '16px'}}>Next Steps:</Text>
            <Text style={{...emailTheme.text, paddingLeft: '0', marginLeft: '0'}}>
              1. Review the reason for rejection above
            </Text>
            <Text style={{...emailTheme.text, paddingLeft: '0', marginLeft: '0', marginTop: '12px'}}>
              2. Contact us if you have questions or need clarification
            </Text>
            <Text style={{...emailTheme.text, paddingLeft: '0', marginLeft: '0', marginTop: '12px'}}>
              3. Consider submitting a new reservation if circumstances change
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', padding: '20px 40px' }}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            If you have any questions, please contact us at{' '}
            <a href={`mailto:${contactEmail}`} style={{color: primaryColor, textDecoration: 'underline'}}>
              {contactEmail}
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
