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

interface EntrySubmittedProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  entryTitle: string;
  entryNumber?: number;
  category: string;
  sizeCategory: string;
  participantCount: number;
  entryFee: number;
}

export default function EntrySubmitted({
  studioName,
  competitionName,
  competitionYear,
  entryTitle,
  entryNumber,
  category,
  sizeCategory,
  participantCount,
  entryFee,
}: EntrySubmittedProps) {
  return (
    <Html>
      <Head />
      <Preview>Entry submitted: {entryTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎭 Entry Submitted!</Heading>

          <Text style={text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={text}>
            Your competition entry has been successfully submitted for{' '}
            <strong>{competitionName} ({competitionYear})</strong>.
          </Text>

          <Section style={entryBox}>
            {entryNumber && (
              <>
                <Text style={entryLabel}>Entry Number</Text>
                <Text style={entryNumberStyle}>#{entryNumber}</Text>
                <Hr style={hr} />
              </>
            )}

            <Text style={entryLabel}>Routine Title</Text>
            <Text style={entryValue}>{entryTitle}</Text>

            <Hr style={hr} />

            <div style={entryRow}>
              <div style={{flex: 1}}>
                <Text style={entryLabel}>Category</Text>
                <Text style={entryValue}>{category}</Text>
              </div>
              <div style={{flex: 1}}>
                <Text style={entryLabel}>Size</Text>
                <Text style={entryValue}>{sizeCategory}</Text>
              </div>
            </div>

            <Hr style={hr} />

            <div style={entryRow}>
              <div style={{flex: 1}}>
                <Text style={entryLabel}>Dancers</Text>
                <Text style={entryValue}>{participantCount}</Text>
              </div>
              <div style={{flex: 1}}>
                <Text style={entryLabel}>Entry Fee</Text>
                <Text style={{...entryValue, color: '#10b981'}}>
                  ${entryFee.toFixed(2)}
                </Text>
              </div>
            </div>
          </Section>

          <Section style={reminderBox}>
            <Text style={reminderTitle}>📝 Important Reminders</Text>
            <ul style={list}>
              <li>Upload your music file through the portal</li>
              <li>Review your entry details for accuracy</li>
              <li>Check your invoice for payment information</li>
              <li>Watch for schedule updates closer to competition date</li>
            </ul>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Break a leg! We can't wait to see <em>{entryTitle}</em> on stage! 🌟
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

const entryBox = {
  backgroundColor: '#faf5ff',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
  border: '1px solid #e9d5ff',
};

const entryNumberStyle = {
  color: '#7c3aed',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const entryRow = {
  display: 'flex',
  gap: '20px',
};

const entryLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 6px 0',
};

const entryValue = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const reminderBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px 30px',
  margin: '20px 40px',
  border: '1px solid #dbeafe',
};

const reminderTitle = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const list = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  paddingLeft: '20px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '16px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  textAlign: 'center' as const,
};
