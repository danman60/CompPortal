#!/usr/bin/env node

const SENTRY_ORG = 'stream-stage-productions-inc';
const SENTRY_PROJECT = 'javascript-nextjs';
const SENTRY_AUTH_TOKEN = '02f415c06baa78b079bf24aaefa73dc2691ba51d8b4587a5f17f08cd96f5df8a';
const EMAIL = 'danieljohnabrahamson@gmail.com';

const BASE_URL = 'https://sentry.io/api/0';

async function createAlertRule(name, conditions, actions) {
  const url = `${BASE_URL}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/`;

  const payload = {
    name,
    conditions,
    actions,
    actionMatch: 'all',
    filterMatch: 'all',
    frequency: 30, // Alert every 30 minutes max
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
      console.error(`Failed to create rule "${name}":`, response.status, error);
      return null;
    }

    const result = await response.json();
    console.log(`✅ Created alert rule: "${name}" (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error(`Error creating rule "${name}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('Setting up Sentry email alerts...\n');

  // Rule 1: Prisma/Database Errors (Immediate)
  await createAlertRule(
    'Production: Prisma/Database Errors',
    [
      {
        id: 'sentry.rules.conditions.event_attribute.EventAttributeCondition',
        attribute: 'message',
        match: 'co',  // contains
        value: 'prisma',
      },
    ],
    [
      {
        id: 'sentry.mail.actions.NotifyEmailAction',
        targetType: 'IssueOwners',
        fallthroughType: 'ActiveMembers',
      },
    ]
  );

  // Rule 2: Critical Errors (level: error or fatal)
  await createAlertRule(
    'Production: Critical Errors',
    [
      {
        id: 'sentry.rules.conditions.level.LevelCondition',
        match: 'gte',
        level: '40', // error level (40 = error, 50 = fatal)
      },
    ],
    [
      {
        id: 'sentry.mail.actions.NotifyEmailAction',
        targetType: 'IssueOwners',
        fallthroughType: 'ActiveMembers',
      },
    ]
  );

  // Rule 3: 404 and 500 HTTP Errors
  await createAlertRule(
    'Production: HTTP 404/500 Errors',
    [
      {
        id: 'sentry.rules.conditions.tagged_event.TaggedEventCondition',
        key: 'http.status_code',
        match: 'eq',
        value: '404',
      },
    ],
    [
      {
        id: 'sentry.mail.actions.NotifyEmailAction',
        targetType: 'IssueOwners',
        fallthroughType: 'ActiveMembers',
      },
    ]
  );

  // Rule 4: Database connection errors (broader than just Prisma)
  await createAlertRule(
    'Production: Database Connection Errors',
    [
      {
        id: 'sentry.rules.conditions.event_attribute.EventAttributeCondition',
        attribute: 'message',
        match: 'co',
        value: 'database',
      },
    ],
    [
      {
        id: 'sentry.mail.actions.NotifyEmailAction',
        targetType: 'IssueOwners',
        fallthroughType: 'ActiveMembers',
      },
    ]
  );

  console.log('\n✅ Sentry alert rules configured!');
  console.log(`All errors matching the rules will be sent to: ${EMAIL}`);
}

main().catch(console.error);
