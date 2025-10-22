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

interface RoutineSummarySubmittedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  routineCount: number;
  totalFees: number;
  studioEmail: string;
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function RoutineSummarySubmitted({
  studioName,
  competitionName,
  competitionYear,
  routineCount,
  totalFees,
  studioEmail,
  portalUrl,
  tenantBranding,
}: RoutineSummarySubmittedProps) {
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';
  const secondaryColor = tenantBranding?.secondaryColor || '#ec4899';

  return (
    <Html>
      <Head />
      <Preview>Routine summary from {studioName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📋 Routine Summary Submitted</Heading>

          <Text style={text}>
            <strong>{studioName}</strong> has submitted their routine summary and is ready for invoicing.
          </Text>

          <Section style={{...summaryBox, border: `2px solid ${primaryColor}`}}>
            <Text style={summaryLabel}>Competition</Text>
            <Text style={summaryValue}>{competitionName} ({competitionYear})</Text>

            <Hr style={{...hr, margin: '20px 0'}} />

            <div style={summaryRow}>
              <div style={summaryItem}>
                <Text style={summaryLabel}>Total Routines</Text>
                <Text style={summaryValue}>{routineCount}</Text>
              </div>
              <div style={summaryItem}>
                <Text style={summaryLabel}>Total Fees</Text>
                <Text style={summaryValue}>${totalFees.toFixed(2)}</Text>
              </div>
            </div>

            <Hr style={{...hr, margin: '20px 0'}} />

            <Text style={summaryLabel}>Studio Contact</Text>
            <Text style={summaryValue}>{studioEmail}</Text>
          </Section>

          <Text style={text}>
            Review the routine summary and generate an invoice in the Routine Summaries page.
          </Text>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={portalUrl} style={{...button, background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`}}>
              Review & Create Invoice
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

const summaryBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
};

const summaryLabel = {
  color: '#92400e',
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

const summaryRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '20px',
};

const summaryItem = {
  flex: 1,
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
