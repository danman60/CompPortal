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

interface ReservationRejectedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  reason?: string;
  portalUrl: string;
  contactEmail: string;
}

export default function ReservationRejected({
  studioName,
  competitionName,
  competitionYear,
  reason,
  portalUrl,
  contactEmail,
}: ReservationRejectedProps) {
  return (
    <Html>
      <Head />
      <Preview>Reservation update for {competitionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reservation Status Update</Heading>

          <Text style={text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={text}>
            We're writing to inform you that your reservation request for{' '}
            <strong>{competitionName} ({competitionYear})</strong> could not be approved at this time.
          </Text>

          {reason && (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>Reason</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          )}

          <Text style={text}>
            We understand this may be disappointing. Here are your next steps:
          </Text>

          <Section style={stepsBox}>
            <div style={stepItem}>
              <div style={stepNumber}>1</div>
              <Text style={stepText}>Review the reason for rejection above</Text>
            </div>
            <div style={stepItem}>
              <div style={stepNumber}>2</div>
              <Text style={stepText}>Contact us if you have questions or need clarification</Text>
            </div>
            <div style={stepItem}>
              <div style={stepNumber}>3</div>
              <Text style={stepText}>Consider submitting a new reservation if circumstances change</Text>
            </div>
          </Section>

          <Section style={{ textAlign: 'center', padding: '20px 40px' }}>
            <Button href={portalUrl} style={button}>
              Go to Portal
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions, please contact us at{' '}
            <a href={`mailto:${contactEmail}`} style={link}>
              {contactEmail}
            </a>
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

const reasonBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
  border: '2px solid #ef4444',
};

const reasonLabel = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const reasonText = {
  color: '#991b1b',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const stepsBox = {
  padding: '0 40px',
  margin: '20px 0',
};

const stepItem = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '16px',
};

const stepNumber = {
  backgroundColor: '#8b5cf6',
  color: '#ffffff',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '16px',
  marginRight: '16px',
  flexShrink: 0,
};

const stepText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '32px',
  margin: '0',
};

const button = {
  backgroundColor: '#8b5cf6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 40px',
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
  color: '#8b5cf6',
  textDecoration: 'underline',
};
