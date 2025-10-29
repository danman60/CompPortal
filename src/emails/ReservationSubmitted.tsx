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

interface ReservationSubmittedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  spacesRequested: number;
  studioEmail: string;
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function ReservationSubmitted({
  studioName,
  competitionName,
  competitionYear,
  spacesRequested,
  studioEmail,
  portalUrl,
  tenantBranding,
}: ReservationSubmittedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>New reservation from {studioName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>New Reservation Submitted</Heading>

          <Text style={emailTheme.text}>
            <strong>{studioName}</strong> has submitted a reservation request for your competition.
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={emailTheme.label}>Competition</Text>
            <Text style={emailTheme.value}>{competitionName} ({competitionYear})</Text>

            <Hr style={{...emailTheme.hr, margin: '20px 0'}} />

            <Text style={emailTheme.label}>Spaces Requested</Text>
            <Text style={emailTheme.value}>{spacesRequested}</Text>

            <Hr style={{...emailTheme.hr, margin: '20px 0'}} />

            <Text style={emailTheme.label}>Studio Contact</Text>
            <Text style={emailTheme.value}>{studioEmail}</Text>
          </Section>

          <Text style={emailTheme.text}>
            Please review and approve or reject this reservation in the Director Panel.
          </Text>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              Review Reservation
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
