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

interface AccountRecoveryProps {
  studioName: string;
  recoveryUrl: string;
  tenantName: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function AccountRecovery({
  studioName,
  recoveryUrl,
  tenantName,
  tenantBranding,
}: AccountRecoveryProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Action Required: Update Your CompSync Password</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Account Security Update</Heading>

          <Text style={emailTheme.text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            We recently had to update our account security system, and you'll need to recreate your password to continue accessing your CompSync account.
          </Text>

          <Text style={emailTheme.text}>
            Your studio data, including all your dancers and registrations, is safe and ready for you.
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={{...emailTheme.text, padding: '0', margin: '0 0 12px 0'}}>
              <strong>What you need to do:</strong>
            </Text>
            <ol style={{...emailTheme.text, margin: '0', paddingLeft: '20px'}}>
              <li>Click the button below</li>
              <li>Create a new password (you can use your old password if you want)</li>
              <li>You'll be logged in and see all your data</li>
            </ol>
          </Section>

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={recoveryUrl} style={{...gradientButton(primaryColor, secondaryColor), fontSize: '16px', padding: '14px 28px'}}>
              Set Your Password
            </Button>
          </Section>

          <Text style={{...emailTheme.text, fontSize: '14px', color: '#6b7280'}}>
            This link will expire in 7 days. If you have any questions, please contact support.
          </Text>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.text}>
            Best regards,<br />
            {tenantName} Team
          </Text>

          <Text style={emailTheme.footer}>
            © {new Date().getFullYear()} {tenantName} • Powered by CompSync
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
