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
  Link,
} from '@react-email/components';

interface MissingMusicReminderProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  routinesWithoutMusic: Array<{
    title: string;
    entryNumber?: number;
    category: string;
  }>;
  portalUrl: string;
  daysUntilCompetition?: number;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function MissingMusicReminder({
  studioName,
  competitionName,
  competitionYear,
  routinesWithoutMusic,
  portalUrl,
  daysUntilCompetition,
  tenantBranding,
}: MissingMusicReminderProps) {
  const primaryColor = tenantBranding?.primaryColor || '#8b5cf6';
  const secondaryColor = tenantBranding?.secondaryColor || '#1e40af';
  return (
    <Html>
      <Head />
      <Preview>{`Missing music files for ${routinesWithoutMusic.length} routine(s)`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎵 Music Upload Reminder</Heading>

          <Text style={text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={text}>
            We noticed that you have <strong>{routinesWithoutMusic.length} routine{routinesWithoutMusic.length !== 1 ? 's' : ''}</strong> registered
            for <strong>{competitionName} ({competitionYear})</strong> that still need music files uploaded.
          </Text>

          {daysUntilCompetition && daysUntilCompetition <= 14 && (
            <Section style={urgentBox}>
              <Text style={urgentText}>
                ⚠️ <strong>Competition in {daysUntilCompetition} days!</strong> Please upload your music files as soon as possible.
              </Text>
            </Section>
          )}

          <Section style={routineBox}>
            <Text style={routineTitle}>Routines Missing Music:</Text>
            {routinesWithoutMusic.map((routine, index) => (
              <div key={index} style={routineItem}>
                <Text style={routineName}>
                  {routine.entryNumber ? `#${routine.entryNumber} - ` : ''}{routine.title}
                </Text>
                <Text style={routineCategory}>{routine.category}</Text>
                {index < routinesWithoutMusic.length - 1 && <Hr style={hr} />}
              </div>
            ))}
          </Section>

          <Section style={{...actionBox, backgroundColor: `${primaryColor}0d`, border: `1px solid ${primaryColor}33`}}>
            <Text style={{...actionTitle, color: secondaryColor}}>📤 Upload Your Music Now</Text>
            <Text style={actionText}>
              Log in to the competition portal and upload your music files for each routine.
              Music files must be in MP3, WAV, M4A, or AAC format.
            </Text>
            <div style={buttonContainer}>
              <Link href={portalUrl} style={{...button, background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`}}>
                Go to Portal
              </Link>
            </div>
          </Section>

          <Section style={tipsBox}>
            <Text style={tipsTitle}>💡 Music Upload Tips</Text>
            <ul style={list}>
              <li>Ensure music files are clearly labeled with the routine title</li>
              <li>Double-check the music matches the routine duration</li>
              <li>Upload music at least 7 days before the competition</li>
              <li>Keep a backup copy of all music files</li>
            </ul>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Questions? Contact us and we'll be happy to help!
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

const urgentBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '20px 30px',
  margin: '20px 40px',
  border: '2px solid #f59e0b',
};

const urgentText = {
  color: '#92400e',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  textAlign: 'center' as const,
};

const routineBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
  border: '1px solid #e5e7eb',
};

const routineTitle = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const routineItem = {
  marginBottom: '16px',
};

const routineName = {
  color: '#111827',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const routineCategory = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const actionBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 40px',
  border: '1px solid #dbeafe',
  textAlign: 'center' as const,
};

const actionTitle = {
  color: '#1e40af',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const actionText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 20px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '20px 0 0 0',
};

const button = {
  backgroundColor: '#8b5cf6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const tipsBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px 30px',
  margin: '20px 40px',
  border: '1px solid #d1fae5',
};

const tipsTitle = {
  color: '#065f46',
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
