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

interface SpaceRequestNotificationProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  currentSpaces: number;
  additionalSpaces: number;
  newTotal: number;
  justification?: string | null;
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function SpaceRequestNotification({
  studioName,
  competitionName,
  competitionYear,
  currentSpaces,
  additionalSpaces,
  newTotal,
  justification,
  portalUrl,
  tenantBranding,
}: SpaceRequestNotificationProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>{`Space request from ${studioName} - +${additionalSpaces} spaces`}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Additional Spaces Requested</Heading>

          <Text style={emailTheme.text}>
            <strong>{studioName}</strong> is requesting additional spaces for their reservation.
          </Text>

          <Section style={{...emailTheme.warningBox, borderLeft: `4px solid #f59e0b`}}>
            <Text style={emailTheme.label}>Competition</Text>
            <Text style={emailTheme.value}>{competitionName} ({competitionYear})</Text>

            <Hr style={{...emailTheme.hr, margin: '20px 0'}} />

            <Text style={emailTheme.label}>Current Spaces</Text>
            <Text style={emailTheme.value}>{currentSpaces}</Text>

            <Hr style={{...emailTheme.hr, margin: '20px 0'}} />

            <Text style={emailTheme.label}>Additional Requested</Text>
            <Text style={{...emailTheme.value, color: '#f59e0b'}}>+{additionalSpaces}</Text>

            <Hr style={{...emailTheme.hr, margin: '20px 0'}} />

            <Text style={emailTheme.label}>New Total</Text>
            <Text style={{...emailTheme.value, fontSize: '24px'}}>{newTotal}</Text>
          </Section>

          {justification && (
            <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
              <Text style={emailTheme.label}>Justification</Text>
              <Text style={{...emailTheme.text, padding: 0, fontStyle: 'italic'}}>
                "{justification}"
              </Text>
            </Section>
          )}

          <Text style={emailTheme.text}>
            Please review and approve or deny this request in the Reservation Pipeline.
          </Text>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Review Request
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
