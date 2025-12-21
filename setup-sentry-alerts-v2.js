#!/usr/bin/env node

const SENTRY_ORG = 'stream-stage-productions-inc';
const SENTRY_PROJECT = 'javascript-nextjs';
const SENTRY_AUTH_TOKEN = '02f415c06baa78b079bf24aaefa73dc2691ba51d8b4587a5f17f08cd96f5df8a';
const BASE_URL = 'https://sentry.io/api/0';

async function createAlertRule(name, filters) {
  const url = `${BASE_URL}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/`;

  const payload = {
    name,
    conditions: [
      {
        id: 'sentry.rules.conditions.every_event.EveryEventCondition',
      },
    ],
    filters: filters || [],
    actions: [
      {
        id: 'sentry.mail.actions.NotifyEmailAction',
        targetType: 'IssueOwners',
        fallthroughType: 'ActiveMembers',
      },
    ],
    actionMatch: 'all',
    filterMatch: 'all',
    frequency: 30,
    environment: 'production',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENTRY_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to create rule "${name}":`, response.status, error);
      return null;
    }

    const result = await response.json();
    console.log(`✅ Created alert rule: "${name}" (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error(`❌ Error creating rule "${name}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('Setting up Sentry email alerts...\n');

  // Rule 1: ALL Production Errors (catch-all)
  await createAlertRule(
    'Production: All Errors',
    [
      {
        id: 'sentry.rules.filters.level.LevelFilter',
        match: 'gte',
        level: '40', // error and above
      },
    ]
  );

  // Rule 2: Prisma Errors
  await createAlertRule(
    'Production: Prisma/Database Errors',
    [
      {
        id: 'sentry.rules.filters.event_attribute.EventAttributeFilter',
        attribute: 'message',
        match: 'co',
        value: 'prisma',
      },
    ]
  );

  // Rule 3: HTTP 404 Errors
  await createAlertRule(
    'Production: HTTP 404 Errors',
    [
      {
        id: 'sentry.rules.filters.tagged_event.TaggedEventFilter',
        key: 'http.status_code',
        match: 'eq',
        value: '404',
      },
    ]
  );

  // Rule 4: HTTP 500 Errors
  await createAlertRule(
    'Production: HTTP 500 Errors',
    [
      {
        id: 'sentry.rules.filters.tagged_event.TaggedEventFilter',
        key: 'http.status_code',
        match: 'eq',
        value: '500',
      },
    ]
  );

  console.log('\n✅ Done! Email alerts configured for production errors.');
  console.log('You will now receive emails for all production errors.');
}

main().catch(console.error);
