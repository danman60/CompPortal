import { describe, it, expect } from 'vitest';
import { parseISODateToUTC, formatDateToISO, calculateAge } from './date-utils';

describe('parseISODateToUTC', () => {
  it('converts ISO date string to UTC midnight', () => {
    const result = parseISODateToUTC('2010-05-15');
    expect(result?.toISOString()).toBe('2010-05-15T00:00:00.000Z');
  });

  it('returns undefined for empty string', () => {
    expect(parseISODateToUTC('')).toBeUndefined();
    expect(parseISODateToUTC(undefined)).toBeUndefined();
    expect(parseISODateToUTC(null)).toBeUndefined();
  });

  it('handles dates at year boundaries correctly', () => {
    const result = parseISODateToUTC('2020-12-31');
    expect(result?.getUTCFullYear()).toBe(2020);
    expect(result?.getUTCMonth()).toBe(11); // December = 11
    expect(result?.getUTCDate()).toBe(31);
  });

  it('handles leap year dates correctly', () => {
    const result = parseISODateToUTC('2020-02-29');
    expect(result?.toISOString()).toBe('2020-02-29T00:00:00.000Z');
  });
});

describe('formatDateToISO', () => {
  it('formats Date object to ISO string', () => {
    const date = new Date('2010-05-15T00:00:00Z');
    expect(formatDateToISO(date)).toBe('2010-05-15');
  });

  it('formats ISO string to ISO date string', () => {
    expect(formatDateToISO('2010-05-15T12:34:56Z')).toBe('2010-05-15');
  });

  it('returns empty string for invalid input', () => {
    expect(formatDateToISO(null)).toBe('');
    expect(formatDateToISO(undefined)).toBe('');
  });
});

describe('calculateAge', () => {
  it('calculates age correctly', () => {
    const birthdate = '2010-05-15';
    const referenceDate = '2025-10-30';
    expect(calculateAge(birthdate, referenceDate)).toBe(15);
  });

  it('accounts for birthday not yet occurred this year', () => {
    const birthdate = '2010-12-25';
    const referenceDate = '2025-10-30';
    expect(calculateAge(birthdate, referenceDate)).toBe(14); // Birthday hasn't happened yet
  });

  it('accounts for birthday already occurred this year', () => {
    const birthdate = '2010-01-15';
    const referenceDate = '2025-10-30';
    expect(calculateAge(birthdate, referenceDate)).toBe(15); // Birthday already happened
  });

  it('returns null for invalid birthdate', () => {
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
  });
});
