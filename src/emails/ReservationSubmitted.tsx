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
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';
  const secondaryColor = tenantBranding?.secondaryColor || '#ec4899';

  return (
    <Html>
      <Head />
      <Preview>New reservation from {studioName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎯 New Reservation Submitted</Heading>

          <Text style={text}>
            <strong>{studioName}</strong> has submitted a reservation request for your competition.
          </Text>

          <Section style={{...infoBox, border: `2px solid ${primaryColor}`}}>
            <Text style={infoLabel}>Competition</Text>
            <Text style={infoValue}>{competitionName} ({competitionYear})</Text>

            <Hr style={{...hr, margin: '20px 0'}} />

            <Text style={infoLabel}>Spaces Requested</Text>
            <Text style={infoValue}>{spacesRequested}</Text>

            <Hr style={{...hr, margin: '20px 0'}} />

            <Text style={infoLabel}>Studio Contact</Text>
            <Text style={infoValue}>{studioEmail}</Text>
          </Section>

          <Text style={text}>
            Please review and approve or reject this reservation in the Director Panel.
          </Text>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={portalUrl} style={{...button, background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`}}>
              Review Reservation
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            © 2025 CompSync. Dance Competition Management.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const infoBox = {
  backgroundColor: '#faf5ff',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
};

const infoLabel = {
  color: '#7c3aed',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const infoValue = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
};

const button = {
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 40px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};
