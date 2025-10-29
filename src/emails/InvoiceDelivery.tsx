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

interface InvoiceDeliveryProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  invoiceNumber: string;
  totalAmount: number;
  routineCount: number;
  invoiceUrl: string;
  dueDate?: string;
  portalUrl?: string;
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
  portalUrl = 'https://www.compsync.net/dashboard',
  tenantBranding,
}: InvoiceDeliveryProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} for {competitionName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Invoice Ready</Heading>

          <Text style={emailTheme.text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            Your invoice for <strong>{competitionName} ({competitionYear})</strong> is ready for review.
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={emailTheme.label}>Invoice Number</Text>
            <Text style={emailTheme.value}>{invoiceNumber}</Text>

            <Hr style={emailTheme.hr} />

            <table style={{width: '100%', borderCollapse: 'collapse' as const}}>
              <tbody>
                <tr>
                  <td style={{width: '50%', verticalAlign: 'top'}}>
                    <Text style={emailTheme.label}>Routines</Text>
                    <Text style={emailTheme.value}>{routineCount}</Text>
                  </td>
                  <td style={{width: '50%', verticalAlign: 'top'}}>
                    <Text style={emailTheme.label}>Total Amount</Text>
                    <Text style={{...emailTheme.value, color: '#22c55e', fontSize: '28px'}}>
                      ${totalAmount.toFixed(2)}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>

            {dueDate && (
              <>
                <Hr style={emailTheme.hr} />
                <Text style={emailTheme.label}>Payment Due Date</Text>
                <Text style={emailTheme.value}>{dueDate}</Text>
              </>
            )}
          </Section>

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={invoiceUrl} style={gradientButton(primaryColor, secondaryColor)}>
              View Invoice
            </Button>
          </Section>

          <Text style={emailTheme.text}>
            You can download and print your invoice from the portal. If you have any questions
            about this invoice, please don't hesitate to contact us.
          </Text>

          <Section style={{textAlign: 'center', padding: '20px 40px'}}>
            <Button href={portalUrl} style={{...gradientButton(primaryColor, secondaryColor), fontSize: '14px', padding: '12px 32px'}}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            Thank you for participating in {competitionName}!
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
