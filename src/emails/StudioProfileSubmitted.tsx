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

interface StudioProfileSubmittedProps {
  studioName: string;
  studioEmail: string;
  ownerName?: string;
  city?: string;
  province?: string;
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function StudioProfileSubmitted({
  studioName,
  studioEmail,
  ownerName,
  city,
  province,
  portalUrl,
  tenantBranding,
}: StudioProfileSubmittedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>New studio registration from {studioName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>New Studio Registration</Heading>

          <Text style={emailTheme.text}>
            A new studio has completed their registration and is pending approval.
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={emailTheme.label}>Studio Name</Text>
            <Text style={emailTheme.value}>{studioName}</Text>

            <Hr style={{...emailTheme.hr, margin: '20px 0'}} />

            {ownerName && (
              <>
                <Text style={emailTheme.label}>Owner</Text>
                <Text style={emailTheme.value}>{ownerName}</Text>
                <Hr style={{...emailTheme.hr, margin: '20px 0'}} />
              </>
            )}

            <Text style={emailTheme.label}>Contact Email</Text>
            <Text style={emailTheme.value}>{studioEmail}</Text>

            {(city || province) && (
              <>
                <Hr style={{...emailTheme.hr, margin: '20px 0'}} />
                <Text style={emailTheme.label}>Location</Text>
                <Text style={emailTheme.value}>
                  {[city, province].filter(Boolean).join(', ')}
                </Text>
              </>
            )}
          </Section>

          <Text style={emailTheme.text}>
            Review the studio profile and approve or reject the registration in the Studios page.
          </Text>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Review Studio Registration
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            Dance Competition Management
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
