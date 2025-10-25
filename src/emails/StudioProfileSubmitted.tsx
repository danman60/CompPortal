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
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';
  const secondaryColor = tenantBranding?.secondaryColor || '#ec4899';

  return (
    <Html>
      <Head />
      <Preview>New studio registration from {studioName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🏢 New Studio Registration</Heading>

          <Text style={text}>
            A new studio has completed their registration and is pending approval.
          </Text>

          <Section style={{...summaryBox, border: `2px solid ${primaryColor}`}}>
            <Text style={summaryLabel}>Studio Name</Text>
            <Text style={summaryValue}>{studioName}</Text>

            <Hr style={{...hr, margin: '20px 0'}} />

            {ownerName && (
              <>
                <Text style={summaryLabel}>Owner</Text>
                <Text style={summaryValue}>{ownerName}</Text>
                <Hr style={{...hr, margin: '20px 0'}} />
              </>
            )}

            <Text style={summaryLabel}>Contact Email</Text>
            <Text style={summaryValue}>{studioEmail}</Text>

            {(city || province) && (
              <>
                <Hr style={{...hr, margin: '20px 0'}} />
                <Text style={summaryLabel}>Location</Text>
                <Text style={summaryValue}>
                  {[city, province].filter(Boolean).join(', ')}
                </Text>
              </>
            )}
          </Section>

          <Text style={text}>
            Review the studio profile and approve or reject the registration in the Studios page.
          </Text>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={portalUrl} style={{...button, background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`}}>
              Review Studio Registration
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            © 2025 EMPWR. Dance Competition Management.
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

const summaryBox = {
  backgroundColor: '#e0e7ff',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
};

const summaryLabel = {
  color: '#3730a3',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const summaryValue = {
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
