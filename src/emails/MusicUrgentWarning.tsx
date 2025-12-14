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

interface MusicUrgentWarningProps {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  routinesWithoutMusic: Array<{
    title: string;
    entryNumber?: number;
    category: string;
  }>;
  portalUrl: string;
  hoursUntilDeadline: number;
  deadlineDate: string;
  deadlineTime: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function MusicUrgentWarning({
  studioName,
  competitionName,
  competitionYear,
  routinesWithoutMusic,
  portalUrl,
  hoursUntilDeadline,
  deadlineDate,
  deadlineTime,
  tenantBranding,
}: MusicUrgentWarningProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  const urgencyLevel = hoursUntilDeadline <= 24 ? 'critical' : 'urgent';
  const urgencyColor = urgencyLevel === 'critical' ? '#ef4444' : '#fbbf24';

  return (
    <Html>
      <Head />
      <Preview>{`URGENT: ${routinesWithoutMusic.length} routines need music - ${hoursUntilDeadline}h remaining`}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          {/* Urgent Banner */}
          <Section style={{
            backgroundColor: urgencyColor,
            padding: '16px 40px',
            textAlign: 'center' as const,
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}>
            <Text style={{
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase' as const,
              letterSpacing: '2px',
              margin: 0,
            }}>
              {urgencyLevel === 'critical' ? 'FINAL WARNING' : 'URGENT REMINDER'}
            </Text>
          </Section>

          <Heading style={{...emailTheme.h1, marginTop: '24px'}}>
            Music Files Due {hoursUntilDeadline <= 24 ? 'in 24 Hours' : 'in 48 Hours'}
          </Heading>

          <Text style={emailTheme.text}>
            Hi <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            This is an <strong>{urgencyLevel}</strong> reminder that music files for <strong>{competitionName} ({competitionYear})</strong> are due soon.
          </Text>

          {/* Countdown Box */}
          <Section style={{
            ...emailTheme.errorBox,
            borderLeftColor: urgencyColor,
            textAlign: 'center' as const,
          }}>
            <Text style={{...emailTheme.label, margin: '0 0 8px 0', padding: 0, textAlign: 'center' as const}}>
              TIME REMAINING
            </Text>
            <Text style={{
              ...emailTheme.valueLarge,
              fontSize: '48px',
              color: urgencyColor,
              margin: '0 0 8px 0',
            }}>
              {hoursUntilDeadline}h
            </Text>
            <Text style={{...emailTheme.textSmall, margin: 0, padding: 0, textAlign: 'center' as const}}>
              Deadline: {deadlineDate} at {deadlineTime}
            </Text>
          </Section>

          <Text style={{...emailTheme.text, fontWeight: 'bold', color: urgencyColor}}>
            You have {routinesWithoutMusic.length} routine{routinesWithoutMusic.length !== 1 ? 's' : ''} without music:
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${urgencyColor}`}}>
            {routinesWithoutMusic.map((routine, index) => (
              <div key={index} style={{marginBottom: index < routinesWithoutMusic.length - 1 ? '12px' : '0'}}>
                <Text style={{...emailTheme.text, padding: '0', margin: '0 0 4px 0', fontWeight: '600'}}>
                  {routine.entryNumber ? `#${routine.entryNumber} - ` : ''}{routine.title}
                </Text>
                <Text style={{...emailTheme.textSmall, padding: '0', margin: '0'}}>
                  {routine.category}
                </Text>
                {index < routinesWithoutMusic.length - 1 && <Hr style={{...emailTheme.hr, margin: '12px 0'}} />}
              </div>
            ))}
          </Section>

          <Section style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            padding: '20px 30px',
            margin: '24px 40px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            <Text style={{...emailTheme.text, margin: 0, padding: 0, textAlign: 'center' as const}}>
              <strong>Important:</strong> Entries without music may not be able to perform at the competition.
            </Text>
          </Section>

          <div style={{textAlign: 'center', margin: '32px 0'}}>
            <Button href={`${portalUrl}/dashboard/music-upload`} style={{
              ...gradientButton(primaryColor, secondaryColor),
              fontSize: '18px',
              padding: '16px 48px',
            }}>
              Upload Music Now
            </Button>
          </div>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            Questions? Contact us immediately and we'll be happy to help!
            <br />
            — {competitionName} Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
