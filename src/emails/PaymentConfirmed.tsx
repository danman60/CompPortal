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
} from '@react-email/components';

interface PaymentConfirmedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  amount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';
  invoiceNumber?: string;
  paymentDate: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function PaymentConfirmed({
  studioName,
  competitionName,
  competitionYear,
  amount,
  paymentStatus,
  invoiceNumber,
  paymentDate,
  tenantBranding,
}: PaymentConfirmedProps) {
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';

  const statusEmoji = {
    pending: '⏳',
    partial: '💵',
    paid: '✅',
    refunded: '↩️',
    cancelled: '❌',
  }[paymentStatus];

  const statusText = {
    pending: 'Payment Pending',
    partial: 'Partial Payment Received',
    paid: 'Payment Confirmed',
    refunded: 'Payment Refunded',
    cancelled: 'Payment Cancelled',
  }[paymentStatus];

  return (
    <Html>
      <Head />
      <Preview>{statusText} for {competitionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={{...h1, color: primaryColor}}>{statusEmoji} {statusText}!</Heading>

          <Text style={text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={text}>
            Your payment status for <strong>{competitionName} ({competitionYear})</strong> has been updated.
          </Text>

          <Section style={{...detailsBox, borderLeft: `4px solid ${primaryColor}`}}>
            {invoiceNumber && (
              <>
                <Text style={detailLabel}>Invoice Number</Text>
                <Text style={detailValue}>{invoiceNumber}</Text>
              </>
            )}
            <Text style={detailLabel}>Amount</Text>
            <Text style={detailValue}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(amount)}
            </Text>
            <Text style={detailLabel}>Status</Text>
            <Text style={detailValue}>{paymentStatus.toUpperCase()}</Text>
            <Text style={detailLabel}>Date</Text>
            <Text style={detailValue}>{paymentDate}</Text>
          </Section>

          {paymentStatus === 'paid' && (
            <Text style={text}>
              Thank you for your payment! Your registration is now complete. We look forward to seeing your routines at {competitionName}!
            </Text>
          )}

          {paymentStatus === 'partial' && (
            <Text style={text}>
              A partial payment has been recorded. Please contact us if you have any questions about your remaining balance.
            </Text>
          )}

          {paymentStatus === 'pending' && (
            <Text style={text}>
              Your payment is pending. Please ensure payment is submitted before the deadline to secure your spot.
            </Text>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions about your payment, please contact us. 📧
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
  marginBottom: '16px',
};

const detailsBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
  border: '2px solid #10b981',
};

const detailLabel = {
  color: '#059669',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '12px 0 4px 0',
};

const detailValue = {
  color: '#047857',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
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
