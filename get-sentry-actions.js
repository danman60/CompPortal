#!/usr/bin/env node

const SENTRY_ORG = 'stream-stage-productions-inc';
const SENTRY_PROJECT = 'javascript-nextjs';
const SENTRY_AUTH_TOKEN = '02f415c06baa78b079bf24aaefa73dc2691ba51d8b4587a5f17f08cd96f5df8a';
const BASE_URL = 'https://sentry.io/api/0';

async function getAvailableActions() {
  const url = `${BASE_URL}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/configuration/`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SENTRY_AUTH_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch:', response.status, await response.text());
      return;
    }

    const config = await response.json();

    console.log('AVAILABLE ACTIONS:\n');
    config.actions.forEach(action => {
      console.log(`ID: ${action.id}`);
      console.log(`Label: ${action.label}`);
      console.log('---');
    });

    console.log('\n\nAVAILABLE CONDITIONS:\n');
    config.conditions.forEach(condition => {
      console.log(`ID: ${condition.id}`);
      console.log(`Label: ${condition.label}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getAvailableActions();
