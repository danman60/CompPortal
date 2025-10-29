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

interface ReservationApprovedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  spacesConfirmed: number;
  portalUrl: string;
  nextSteps?: string[];
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function ReservationApproved({
  studioName,
  competitionName,
  competitionYear,
  spacesConfirmed,
  portalUrl,
  nextSteps = [
    'Submit your competition routines',
    'Upload music files for your routines',
    'Review and pay your invoice',
  ],
  tenantBranding,
}: ReservationApprovedProps) {
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';
  const secondaryColor = tenantBranding?.secondaryColor || '#ec4899';

  return (
    <Html>
      <Head />
      <Preview>Reservation approved for {competitionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✅ Reservation Approved!</Heading>

          <Text style={text}>
            Great news, <strong>{studioName}</strong>!
          </Text>

          <Text style={text}>
            Your reservation for <strong>{competitionName} ({competitionYear})</strong> has been approved.
          </Text>

          <Section style={{...confirmBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={confirmLabel}>CONFIRMED SPACES</Text>
            <Text style={confirmValue}>{spacesConfirmed}</Text>
          </Section>

          <Text style={text}>
            You can now proceed with the following steps:
          </Text>

          {/* Table-based layout for email client compatibility */}
          <table style={stepsTable}>
            <tbody>
              {nextSteps.map((step, index) => (
                <tr key={index}>
                  <td style={{paddingBottom: '12px', verticalAlign: 'top'}}>
                    <table style={{borderCollapse: 'collapse'}}>
                      <tbody>
                        <tr>
                          <td style={{...stepNumber, backgroundColor: primaryColor}}>
                            {index + 1}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td style={{paddingBottom: '12px', paddingLeft: '16px'}}>
                    <Text style={stepText}>{step}</Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={portalUrl} style={{...button, background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`}}>
              Go to Portal
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            We're excited to see your performances at {competitionName}! 🎉
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Dark theme matching app design
const main = {
  backgroundColor: '#0f172a', // slate-900
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#1e293b', // slate-800
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const h1 = {
  color: '#f1f5f9', // slate-100
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#e2e8f0', // slate-200
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
  margin: '12px 0',
};

const confirmBox = {
  backgroundColor: 'rgba(139, 92, 246, 0.1)', // purple with transparency
  borderRadius: '12px',
  padding: '30px',
  margin: '30px 40px',
  textAlign: 'center' as const,
};

const confirmLabel = {
  color: '#c4b5fd', // purple-300
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 16px 0',
};

const confirmValue = {
  color: '#f1f5f9', // slate-100
  fontSize: '64px',
  fontWeight: 'bold',
  margin: '0',
  lineHeight: '1',
};

const stepsTable = {
  width: '100%',
  padding: '0 40px',
  margin: '24px 0',
  borderCollapse: 'collapse' as const,
};

const stepNumber = {
  color: '#ffffff',
  borderRadius: '50%',
  width: '36px',
  height: '36px',
  textAlign: 'center' as const,
  fontWeight: 'bold',
  fontSize: '18px',
  lineHeight: '36px',
};

const stepText = {
  color: '#e2e8f0', // slate-200
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  padding: '6px 0',
};

const button = {
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 48px',
  border: 'none',
};

const hr = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '32px 40px',
};

const footer = {
  color: '#94a3b8', // slate-400
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};
