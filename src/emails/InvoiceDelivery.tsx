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

interface InvoiceDeliveryProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  invoiceNumber: string;
  totalAmount: number;
  routineCount: number;
  invoiceUrl: string;
  dueDate?: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function InvoiceDelivery({
  studioName,
  competitionName,
  competitionYear,
  invoiceNumber,
  totalAmount,
  routineCount,
  invoiceUrl,
  dueDate,
  tenantBranding,
}: InvoiceDeliveryProps) {
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';
  const secondaryColor = tenantBranding?.secondaryColor || '#ec4899';

  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} for {competitionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📄 Invoice Ready</Heading>

          <Text style={text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={text}>
            Your invoice for <strong>{competitionName} ({competitionYear})</strong> is ready for review.
          </Text>

          <Section style={{...invoiceBox, backgroundColor: `${primaryColor}05`, border: `1px solid ${primaryColor}33`}}>
            <Text style={invoiceLabel}>Invoice Number</Text>
            <Text style={invoiceValue}>{invoiceNumber}</Text>

            <Hr style={hr} />

            <div style={invoiceRow}>
              <div>
                <Text style={invoiceLabel}>Routines</Text>
                <Text style={invoiceValue}>{routineCount}</Text>
              </div>
              <div>
                <Text style={invoiceLabel}>Total Amount</Text>
                <Text style={{...invoiceValue, color: '#10b981', fontSize: '28px'}}>
                  ${totalAmount.toFixed(2)}
                </Text>
              </div>
            </div>

            {dueDate && (
              <>
                <Hr style={hr} />
                <Text style={invoiceLabel}>Payment Due Date</Text>
                <Text style={invoiceValue}>{dueDate}</Text>
              </>
            )}
          </Section>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={invoiceUrl} style={{...button, background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`}}>
              View Invoice
            </Button>
          </Section>

          <Text style={text}>
            You can download and print your invoice from the portal. If you have any questions
            about this invoice, please don't hesitate to contact us.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Thank you for participating in {competitionName}!
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

const invoiceBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
  border: '1px solid #e5e7eb',
};

const invoiceRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
};

const invoiceLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const invoiceValue = {
  color: '#111827',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const button = {
  backgroundColor: '#8b5cf6',
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
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};
