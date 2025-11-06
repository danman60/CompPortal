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

interface StudioApprovedProps {
  studioName: string;
  ownerName?: string;
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function StudioApproved({
  studioName,
  ownerName,
  portalUrl,
  tenantBranding,
}: StudioApprovedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;
  return (
    <Html>
      <Head />
      <Preview>Studio registration approved - Welcome to the platform!</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>✅ Studio Approved!</Heading>

          <Text style={emailTheme.text}>
            {ownerName ? `Dear ${ownerName}` : 'Hello'},
          </Text>

          <Text style={emailTheme.text}>
            We're excited to inform you that <strong>{studioName}</strong> has been approved and is now active on our platform!
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={{...emailTheme.label, padding: '0', margin: '0 0 8px 0'}}>Studio Status</Text>
            <Text style={{...emailTheme.value, padding: '0', margin: '0'}}>✅ Approved & Active</Text>
          </Section>

          <Text style={emailTheme.text}>
            You now have full access to all platform features:
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={{...emailTheme.text, padding: '0', margin: '0 0 8px 0'}}>
              1. Register dancers for your studio<br/>
              2. Request reservations for competitions<br/>
              3. Submit competition routines<br/>
              4. Manage your studio profile and settings
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', padding: '20px 40px' }}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            Welcome to the community! If you have any questions or need assistance getting started,
            please don't hesitate to reach out to our support team.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles now use emailTheme from theme.ts (lines 37-79)
