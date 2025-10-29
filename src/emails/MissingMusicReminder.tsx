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
import { emailTheme, gradientButton, defaultBranding } from './theme';

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
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>{`Missing music files for ${routinesWithoutMusic.length} routine(s)`}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>Music Upload Reminder</Heading>

          <Text style={emailTheme.text}>
            Hello <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            We noticed that you have <strong>{routinesWithoutMusic.length} routine{routinesWithoutMusic.length !== 1 ? 's' : ''}</strong> registered
            for <strong>{competitionName} ({competitionYear})</strong> that still need music files uploaded.
          </Text>

          {daysUntilCompetition && daysUntilCompetition <= 14 && (
            <Section style={emailTheme.warningBox}>
              <Text style={{...emailTheme.text, textAlign: 'center' as const, margin: '0', fontWeight: 'bold'}}>
                Competition in {daysUntilCompetition} days! Please upload your music files as soon as possible.
              </Text>
            </Section>
          )}

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <Text style={{...emailTheme.h2, fontSize: '18px', margin: '0 0 20px 0'}}>Routines Missing Music:</Text>
            {routinesWithoutMusic.map((routine, index) => (
              <div key={index} style={{marginBottom: '16px'}}>
                <Text style={{...emailTheme.text, padding: '0', margin: '0 0 4px 0', fontWeight: '600'}}>
                  {routine.entryNumber ? `#${routine.entryNumber} - ` : ''}{routine.title}
                </Text>
                <Text style={{...emailTheme.textSmall, padding: '0', margin: '0'}}>
                  {routine.category}
                </Text>
                {index < routinesWithoutMusic.length - 1 && <Hr style={emailTheme.hr} />}
              </div>
            ))}
          </Section>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${secondaryColor}`}}>
            <Text style={{...emailTheme.h2, fontSize: '20px', color: secondaryColor, margin: '0 0 12px 0'}}>Upload Your Music Now</Text>
            <Text style={{...emailTheme.textSmall, padding: '0', margin: '0 0 20px 0'}}>
              Log in to the competition portal and upload your music files for each routine.
              Music files must be in MP3, WAV, M4A, or AAC format.
            </Text>
            <div style={{textAlign: 'center'}}>
              <Link href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
                Go to Portal
              </Link>
            </div>
          </Section>

          <Section style={emailTheme.successBox}>
            <Text style={{...emailTheme.h2, fontSize: '16px', margin: '0 0 12px 0'}}>Music Upload Tips</Text>
            <ul style={{...emailTheme.textSmall, padding: '0 0 0 20px', margin: '0'}}>
              <li>Ensure music files are clearly labeled with the routine title</li>
              <li>Double-check the music matches the routine duration</li>
              <li>Upload music at least 7 days before the competition</li>
              <li>Keep a backup copy of all music files</li>
            </ul>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            Questions? Contact us and we'll be happy to help!
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
