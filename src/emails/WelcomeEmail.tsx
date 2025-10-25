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

export interface WelcomeEmailProps {
  name: string;
  email: string;
  dashboardUrl?: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string | null;
    tenantName?: string;
  };
}

export default function WelcomeEmail({
  name,
  email,
  dashboardUrl,
  tenantBranding,
}: WelcomeEmailProps) {
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';
  const secondaryColor = tenantBranding?.secondaryColor || '#6366f1';
  const portal = dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://comp-portal-one.vercel.app'}/dashboard`;

  return (
    <Html>
      <Head />
      <Preview>Welcome to EMPWR — Let's get you set up</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✨ Welcome, {name}!</Heading>

          <Text style={text}>We're excited to have you on EMPWR.</Text>

          <Section style={calloutBox(primaryColor)}>
            <Text style={infoLabel}>Account</Text>
            <Text style={infoValue}>{email}</Text>
          </Section>

          <Text style={text}>Getting started is simple:</Text>

          <Section style={stepsBox(primaryColor)}>
            <div style={stepItem}>
              <div style={stepNumber(primaryColor)}>1</div>
              <Text style={stepText}>Complete your profile details</Text>
            </div>
            <div style={stepItem}>
              <div style={stepNumber(primaryColor)}>2</div>
              <Text style={stepText}>Create your first routine</Text>
            </div>
            <div style={stepItem}>
              <div style={stepNumber(primaryColor)}>3</div>
              <Text style={stepText}>Explore dashboard features and insights</Text>
            </div>
            <div style={stepItem}>
              <div style={stepNumber(primaryColor)}>4</div>
              <Text style={stepText}>Reach out to support if you need help</Text>
            </div>
          </Section>

          <Section style={{ textAlign: 'center', padding: '20px 40px' }}>
            <Button href={portal} style={button(primaryColor, secondaryColor)}>
              Go to your dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Welcome aboard! We're here to help you make the most of EMPWR.
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
  fontWeight: 700,
  textAlign: 'center' as const,
  padding: '30px 40px 10px',
  margin: 0,
};

const text = {
  color: '#e2e8f0',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const calloutBox = (primary: string) => ({
  backgroundColor: 'rgba(99, 102, 241, 0.08)',
  border: `1px solid ${primary}33`,
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '16px 40px',
});

const infoLabel = {
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 6px 0',
};

const infoValue = {
  color: '#e2e8f0',
  fontSize: '15px',
  fontWeight: 600,
  margin: 0,
};

const stepsBox = (primary: string) => ({
  backgroundColor: 'rgba(139, 92, 246, 0.05)',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 40px',
  border: `1px solid ${primary}22`,
});

const stepItem = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '16px',
};

const stepNumber = (primary: string) => ({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '14px',
  flexShrink: 0,
  marginRight: '12px',
  backgroundColor: `${primary}33`,
  border: `2px solid ${primary}66`,
  color: primary,
});

const stepText = {
  color: '#e2e8f0',
  fontSize: '14px',
  lineHeight: '20px',
  margin: 0,
  paddingTop: '6px',
};

const button = (primary: string, secondary: string) => ({
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  margin: 0,
  background: `linear-gradient(90deg, ${primary}, ${secondary})`,
});

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
