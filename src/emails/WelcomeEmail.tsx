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

export interface WelcomeEmailProps {
  name: string;
  email: string;
  studioPublicCode?: string;
  dashboardUrl: string; // Required - must be tenant-specific URL
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
  studioPublicCode,
  dashboardUrl,
  tenantBranding,
}: WelcomeEmailProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;
  const tenantName = tenantBranding?.tenantName || 'Competition Portal';

  return (
    <Html>
      <Head />
      <Preview>Welcome to {tenantName} — Let's get you set up</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>✨ Welcome, {name}!</Heading>

          <Text style={emailTheme.text}>We're excited to have you on {tenantName}.</Text>

          <Section style={calloutBox(primaryColor)}>
            <Text style={infoLabel}>Account</Text>
            <Text style={infoValue}>{email}</Text>
            {studioPublicCode && (
              <>
                <Text style={infoLabel} className="mt-3">Studio Code</Text>
                <Text style={{ ...infoValue, color: primaryColor }}>{studioPublicCode}</Text>
              </>
            )}
          </Section>

          <Text style={emailTheme.text}>Getting started is simple:</Text>

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
            <Button href={dashboardUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Go to your dashboard
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            Welcome aboard! We're here to help you make the most of {tenantName}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
// Styles now use emailTheme from theme.ts
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
