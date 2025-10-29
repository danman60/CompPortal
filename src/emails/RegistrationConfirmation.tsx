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

interface RegistrationConfirmationProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  competitionDate?: string;
  contactEmail: string;
  portalUrl?: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function RegistrationConfirmation({
  studioName,
  competitionName,
  competitionYear,
  competitionDate,
  contactEmail,
  portalUrl,
  tenantBranding,
}: RegistrationConfirmationProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;
  const dashboardUrl = portalUrl || 'https://www.compsync.net/dashboard';

  return (
    <Html>
      <Head />
      <Preview>Registration confirmed for {competitionName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Registration Confirmed!</Heading>

          <Text style={emailTheme.text}>
            Thank you for registering <strong>{studioName}</strong> for <strong>{competitionName} ({competitionYear})</strong>!
          </Text>

          {competitionDate && (
            <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
              <Text style={{...emailTheme.text, padding: '0', margin: '0'}}>
                <strong>Competition Date:</strong> {competitionDate}
              </Text>
            </Section>
          )}

          <Text style={emailTheme.text}>
            Your registration has been received and is being processed. You will receive further
            updates regarding:
          </Text>

          <ul style={{...emailTheme.text, paddingLeft: '60px'}}>
            <li>Competition schedule and lineup</li>
            <li>Payment details and invoices</li>
            <li>Important competition information</li>
            <li>Venue and logistics details</li>
          </ul>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={dashboardUrl} style={{...gradientButton(primaryColor, secondaryColor), fontSize: '14px', padding: '12px 32px'}}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            If you have any questions, please contact us at{' '}
            <a href={`mailto:${contactEmail}`} style={{color: primaryColor, textDecoration: 'none'}}>
              {contactEmail}
            </a>
          </Text>

          <Text style={emailTheme.footer}>
            See you on the dance floor!
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
