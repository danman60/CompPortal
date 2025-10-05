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

interface ReservationApprovedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  spacesConfirmed: number;
  portalUrl: string;
  nextSteps?: string[];
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
}: ReservationApprovedProps) {
  return (
    <Html>
      <Head />
      <Preview>Reservation approved for {competitionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✅ Reservation Approved!</Heading>

          <Text style={text}>
            Great news, <strong>{studioName}</strong>!
          </Text>

          <Text style={text}>
            Your reservation for <strong>{competitionName} ({competitionYear})</strong> has been approved.
          </Text>

          <Section style={confirmBox}>
            <Text style={confirmLabel}>Confirmed Spaces</Text>
            <Text style={confirmValue}>{spacesConfirmed}</Text>
          </Section>

          <Text style={text}>
            You can now proceed with the following steps:
          </Text>

          <Section style={stepsBox}>
            {nextSteps.map((step, index) => (
              <div key={index} style={stepItem}>
                <div style={stepNumber}>{index + 1}</div>
                <Text style={stepText}>{step}</Text>
              </div>
            ))}
          </Section>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={portalUrl} style={button}>
              Go to Portal
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            We're excited to see your performances at {competitionName}! 🎉
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

const confirmBox = {
  backgroundColor: '#ecfdf5',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
  textAlign: 'center' as const,
  border: '2px solid #10b981',
};

const confirmLabel = {
  color: '#059669',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const confirmValue = {
  color: '#047857',
  fontSize: '48px',
  fontWeight: 'bold',
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
