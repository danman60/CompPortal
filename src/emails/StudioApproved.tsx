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

interface StudioApprovedProps {
  studioName: string;
  ownerName?: string;
  portalUrl: string;
}

export default function StudioApproved({
  studioName,
  ownerName,
  portalUrl,
}: StudioApprovedProps) {
  return (
    <Html>
      <Head />
      <Preview>Studio registration approved - Welcome to the platform!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✅ Studio Approved!</Heading>

          <Text style={text}>
            {ownerName ? `Dear ${ownerName}` : 'Hello'},
          </Text>

          <Text style={text}>
            We're excited to inform you that <strong>{studioName}</strong> has been approved and is now active on our platform!
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Studio Status</Text>
            <Text style={infoValue}>✅ Approved & Active</Text>
          </Section>

          <Text style={text}>
            You now have full access to all platform features:
          </Text>

          <Section style={stepsBox}>
            <div style={stepItem}>
              <div style={stepNumber}>1</div>
              <Text style={stepText}>Register dancers for your studio</Text>
            </div>
            <div style={stepItem}>
              <div style={stepNumber}>2</div>
              <Text style={stepText}>Request reservations for competitions</Text>
            </div>
            <div style={stepItem}>
              <div style={stepNumber}>3</div>
              <Text style={stepText}>Submit competition routines</Text>
            </div>
            <div style={stepItem}>
              <div style={stepNumber}>4</div>
              <Text style={stepText}>Manage your studio profile and settings</Text>
            </div>
          </Section>

          <Section style={{ textAlign: 'center', padding: '20px 40px' }}>
            <Button href={portalUrl} style={button}>
              Go to Portal
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Welcome to the community! If you have any questions or need assistance getting started,
            please don't hesitate to reach out to our support team.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#0f172a',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
  backgroundColor: '#1e293b',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '700',
  textAlign: 'center' as const,
  padding: '30px 40px 10px',
  margin: '0',
};

const text = {
  color: '#e2e8f0',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const infoBox = {
  backgroundColor: 'rgba(34, 197, 94, 0.1)',
  border: '1px solid rgba(34, 197, 94, 0.3)',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 40px',
};

const infoLabel = {
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const infoValue = {
  color: '#22c55e',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
};

const stepsBox = {
  backgroundColor: 'rgba(139, 92, 246, 0.05)',
  border: '1px solid rgba(139, 92, 246, 0.2)',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 40px',
};

const stepItem = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '16px',
};

const stepNumber = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: 'rgba(139, 92, 246, 0.2)',
  border: '2px solid rgba(139, 92, 246, 0.4)',
  color: '#a78bfa',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '700',
  fontSize: '14px',
  flexShrink: 0,
  marginRight: '12px',
};

const stepText = {
  color: '#e2e8f0',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  paddingTop: '6px',
};

const button = {
  backgroundColor: '#8b5cf6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  margin: '0',
};

const hr = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '26px 40px',
};

const footer = {
  color: '#94a3b8',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};
