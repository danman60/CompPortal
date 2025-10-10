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

interface RegistrationConfirmationProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  competitionDate?: string;
  contactEmail: string;
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
  tenantBranding,
}: RegistrationConfirmationProps) {
  const primaryColor = tenantBranding?.primaryColor || '#5e6ad2';

  return (
    <Html>
      <Head />
      <Preview>Registration confirmed for {competitionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✨ Registration Confirmed!</Heading>

          <Text style={text}>
            Thank you for registering <strong>{studioName}</strong> for <strong>{competitionName} ({competitionYear})</strong>!
          </Text>

          {competitionDate && (
            <Section style={infoBox}>
              <Text style={infoText}>
                <strong>Competition Date:</strong> {competitionDate}
              </Text>
            </Section>
          )}

          <Text style={text}>
            Your registration has been received and is being processed. You will receive further
            updates regarding:
          </Text>

          <ul style={list}>
            <li>Competition schedule and lineup</li>
            <li>Payment details and invoices</li>
            <li>Important competition information</li>
            <li>Venue and logistics details</li>
          </ul>

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions, please contact us at{' '}
            <a href={`mailto:${contactEmail}`} style={{...link, color: primaryColor}}>
              {contactEmail}
            </a>
          </Text>

          <Text style={footer}>
            See you on the dance floor! 💃🕺
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const infoBox = {
  backgroundColor: '#f0f4ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 40px',
};

const infoText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const list = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  paddingLeft: '60px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const link = {
  color: '#5e6ad2',
  textDecoration: 'none',
};
