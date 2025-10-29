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
import { emailTheme, defaultBranding, gradientButton } from './theme';

interface PaymentConfirmedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  amount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';
  invoiceNumber?: string;
  paymentDate: string;
  portalUrl?: string;
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
  portalUrl,
  tenantBranding,
}: PaymentConfirmedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;
  const dashboardUrl = portalUrl || 'https://www.compsync.net/dashboard';

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
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={{...emailTheme.h1, color: primaryColor}}>{statusEmoji} {statusText}!</Heading>

          <Text style={emailTheme.text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            Your payment status for <strong>{competitionName} ({competitionYear})</strong> has been updated.
          </Text>

          <Section style={{
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '12px',
            padding: '24px 30px',
            margin: '24px 40px',
            borderLeft: `4px solid ${primaryColor}`,
          }}>
            {invoiceNumber && (
              <>
                <Text style={emailTheme.label}>Invoice Number</Text>
                <Text style={emailTheme.value}>{invoiceNumber}</Text>
              </>
            )}
            <Text style={emailTheme.label}>Amount</Text>
            <Text style={emailTheme.value}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(amount)}
            </Text>
            <Text style={emailTheme.label}>Status</Text>
            <Text style={emailTheme.value}>{paymentStatus.toUpperCase()}</Text>
            <Text style={emailTheme.label}>Date</Text>
            <Text style={emailTheme.value}>{paymentDate}</Text>
          </Section>

          {paymentStatus === 'paid' && (
            <Text style={emailTheme.text}>
              Thank you for your payment! Your registration is now complete. We look forward to seeing your routines at {competitionName}!
            </Text>
          )}

          {paymentStatus === 'partial' && (
            <Text style={emailTheme.text}>
              A partial payment has been recorded. Please contact us if you have any questions about your remaining balance.
            </Text>
          )}

          {paymentStatus === 'pending' && (
            <Text style={emailTheme.text}>
              Your payment is pending. Please ensure payment is submitted before the deadline to secure your spot.
            </Text>
          )}

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={dashboardUrl} style={gradientButton(primaryColor, secondaryColor)}>
              View Dashboard
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            If you have any questions about your payment, please contact us.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
