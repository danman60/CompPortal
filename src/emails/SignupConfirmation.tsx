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

interface SignupConfirmationProps {
  tenantName: string;
  email: string;
  confirmationUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function SignupConfirmation({
  tenantName,
  email,
  confirmationUrl,
  tenantBranding,
}: SignupConfirmationProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Confirm your {tenantName} account</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>✨ Welcome to {tenantName}!</Heading>

          <Text style={emailTheme.text}>
            Thanks for creating an account. We're excited to have you on board!
          </Text>

          <Text style={emailTheme.text}>
            To complete your registration and access your studio dashboard, please confirm your email address by clicking the button below:
          </Text>

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={confirmationUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Confirm Email Address
            </Button>
          </Section>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={emailTheme.label}>Your Account</Text>
            <Text style={emailTheme.value}>{email}</Text>
          </Section>

          <Text style={emailTheme.textSmall}>
            If the button doesn't work, copy and paste this link into your browser:
          </Text>
          <Text style={{...emailTheme.textSmall, wordBreak: 'break-all', color: primaryColor}}>
            {confirmationUrl}
          </Text>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.textSmall}>
            If you didn't create this account, you can safely ignore this email.
          </Text>

          <Text style={emailTheme.footer}>
            © 2025 {tenantName}. Powered by CompSync.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
