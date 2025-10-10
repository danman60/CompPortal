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

interface StudioRejectedProps {
  studioName: string;
  ownerName?: string;
  reason?: string;
  portalUrl: string;
  contactEmail: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function StudioRejected({
  studioName,
  ownerName,
  reason,
  portalUrl,
  contactEmail,
  tenantBranding,
}: StudioRejectedProps) {
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';
  const secondaryColor = tenantBranding?.secondaryColor || '#ec4899';

  return (
    <Html>
      <Head />
      <Preview>Studio registration status update</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Studio Registration Update</Heading>

          <Text style={text}>
            {ownerName ? `Dear ${ownerName}` : 'Hello'},
          </Text>

          <Text style={text}>
            Thank you for your interest in registering <strong>{studioName}</strong> on our platform.
          </Text>

          <Text style={text}>
            Unfortunately, we are unable to approve your studio registration at this time.
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

          <Section style={{...stepsBox, backgroundColor: `${primaryColor}0d`, border: `1px solid ${primaryColor}33`}}>
            <div style={stepItem}>
              <div style={{...stepNumber, backgroundColor: `${primaryColor}33`, border: `2px solid ${primaryColor}66`}}>1</div>
              <Text style={stepText}>Review the reason provided above</Text>
            </div>
            <div style={stepItem}>
              <div style={{...stepNumber, backgroundColor: `${primaryColor}33`, border: `2px solid ${primaryColor}66`}}>2</div>
              <Text style={stepText}>Contact us if you need clarification or have questions</Text>
            </div>
            <div style={stepItem}>
              <div style={{...stepNumber, backgroundColor: `${primaryColor}33`, border: `2px solid ${primaryColor}66`}}>3</div>
              <Text style={stepText}>Consider submitting a new registration if circumstances change</Text>
            </div>
          </Section>

          <Section style={{ textAlign: 'center', padding: '20px 40px' }}>
            <Button href={portalUrl} style={{...button, background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`}}>
              Go to Portal
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions or would like to discuss this further, please contact us at{' '}
            <a href={`mailto:${contactEmail}`} style={{...link, color: `${primaryColor}cc`}}>
              {contactEmail}
            </a>
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

const reasonBox = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 40px',
};

const reasonLabel = {
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const reasonText = {
  color: '#fca5a5',
  fontSize: '16px',
  lineHeight: '24px',
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

const link = {
  color: '#a78bfa',
  textDecoration: 'none',
};
