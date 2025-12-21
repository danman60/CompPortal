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

interface ReservationMovedProps {
  studioName: string;
  oldCompetitionName: string;
  newCompetitionName: string;
  newCompetitionYear: number;
  spacesConfirmed: number;
  entriesUpdated: number;
  portalUrl: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export default function ReservationMoved({
  studioName,
  oldCompetitionName,
  newCompetitionName,
  newCompetitionYear,
  spacesConfirmed,
  entriesUpdated,
  portalUrl,
  tenantBranding,
}: ReservationMovedProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;

  return (
    <Html>
      <Head />
      <Preview>Your reservation has been moved to {newCompetitionName}</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Heading style={emailTheme.h1}>🔄 Competition Change</Heading>

          <Text style={emailTheme.text}>
            Dear <strong>{studioName}</strong>,
          </Text>

          <Text style={emailTheme.text}>
            Your reservation has been moved to a different competition:
          </Text>

          <Section style={{...emailTheme.infoBox, borderLeft: `4px solid ${primaryColor}`}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <tbody>
                <tr>
                  <td style={{paddingBottom: '16px'}}>
                    <Text style={{...emailTheme.label, margin: '0 0 6px 0'}}>FROM</Text>
                    <Text style={{...emailTheme.value, margin: '0', textDecoration: 'line-through', opacity: 0.7}}>{oldCompetitionName}</Text>
                  </td>
                </tr>
                <tr>
                  <td style={{paddingBottom: '16px'}}>
                    <Text style={{...emailTheme.label, margin: '0 0 6px 0'}}>TO</Text>
                    <Text style={{...emailTheme.value, margin: '0'}}>{newCompetitionName} ({newCompetitionYear})</Text>
                  </td>
                </tr>
                <tr>
                  <td style={{paddingBottom: '8px'}}>
                    <Text style={{...emailTheme.label, margin: '0 0 6px 0'}}>CONFIRMED SPACES</Text>
                    <Text style={{...emailTheme.value, margin: '0'}}>{spacesConfirmed} entries</Text>
                  </td>
                </tr>
                {entriesUpdated > 0 && (
                  <tr>
                    <td>
                      <Text style={{...emailTheme.label, margin: '0 0 6px 0'}}>ENTRIES MOVED</Text>
                      <Text style={{...emailTheme.value, margin: '0'}}>{entriesUpdated} routines</Text>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          <Text style={emailTheme.text}>
            All your entry data has been preserved and automatically moved to the new competition. Your reservation status and confirmed spaces remain the same.
          </Text>

          <Section style={emailTheme.successBox}>
            <Text style={{...emailTheme.textSmall, padding: '0', margin: '0', color: '#f1f5f9'}}>
              ✓ Reservation moved successfully<br />
              ✓ All entries updated<br />
              ✓ No action required from you
            </Text>
          </Section>

          <Section style={{textAlign: 'center', padding: '30px 40px'}}>
            <Button href={portalUrl} style={gradientButton(primaryColor, secondaryColor)}>
              View Updated Reservation
            </Button>
          </Section>

          <Hr style={emailTheme.hr} />

          <Text style={emailTheme.footer}>
            If you have any questions about this change, please contact the Competition Director.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
