/**
 * CSV Utilities for flexible import handling
 *
 * Features:
 * - Flexible header normalization
 * - Fuzzy column matching with Levenshtein distance
 * - Common field variations
 */

import levenshtein from 'fast-levenshtein';

/**
 * Normalize CSV header to standard format
 * Handles: whitespace, case, separators, special chars
 *
 * Examples:
 * "First Name" → "first_name"
 * "firstname" → "first_name"
 * "FIRST-NAME" → "first_name"
 * "first.name" → "first_name"
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()                    // Convert to lowercase
    .trim()                            // Remove leading/trailing whitespace
    .replace(/[\s\-\.]+/g, '_')        // Replace spaces, dashes, dots with underscores
    .replace(/[^\w_]/g, '')            // Remove special characters (keep alphanumeric and underscore)
    .replace(/_+/g, '_')               // Collapse multiple underscores
    .replace(/^_|_$/g, '');            // Remove leading/trailing underscores
}

/**
 * Common field variations mapping
 * Maps various input formats to canonical field names
 */
export const FIELD_VARIATIONS: Record<string, string[]> = {
  // Dancer fields
  first_name: ['firstname', 'fname', 'given_name', 'givenname', 'first', 'name', 'dancer_first_name'],
  last_name: ['lastname', 'lname', 'surname', 'family_name', 'familyname', 'last', 'dancer_last_name'],
  date_of_birth: ['dob', 'birthdate', 'birth_date', 'dateofbirth', 'birthday', 'birth', 'bday', 'bd', 'born', 'age', 'dancer_dob', 'dancer_birth_date'],
  gender: ['sex', 'male_female', 'm_f', 'mf', 'gender_identity', 'dancer_gender', 'gender_female_male', 'female_male'],
  email: ['email_address', 'e_mail', 'emailaddress', 'mail'],
  phone: ['phone_number', 'phonenumber', 'tel', 'telephone', 'mobile', 'cell'],
  parent_name: ['guardian_name', 'guardian', 'parent', 'parentname', 'guardian_full_name', 'parent_full_name'],
  parent_email: ['guardian_email', 'guardian_mail', 'parent_mail', 'guardian_email_address', 'parent_email_address'],
  parent_phone: ['guardian_phone', 'guardian_tel', 'parent_tel', 'guardian_phone_number', 'parent_phone_number'],

  // Routine fields
  title: ['routine_title', 'routinetitle', 'routine_name', 'routinename', 'name', 'routine', 'piece', 'dance_title', 'dancetitle', 'dance_name', 'entry_title'],
  props: ['prop', 'properties', 'prop_list', 'proplist', 'prop_description', 'propdescription', 'special_requirements', 'items', 'equipment', 'stage_props', 'stageprops'],
  dancers: ['dancer', 'participants', 'participant', 'performers', 'performer', 'members', 'member', 'artists', 'artist', 'names', 'dancer_names', 'dancer_list', 'dancers_list', 'dancerslist', 'dancers_list_first_name_last_name'],
  choreographer: ['choreo', 'choreographed_by', 'choreographedby', 'teacher', 'instructor', 'coach', 'director', 'creator', 'choreography_by'],
  duration_seconds: ['length_seconds', 'lengthseconds', 'length', 'duration', 'time_seconds', 'timeseconds'],
  // Dance category variations (all map to 'category' canonical field)
  category: ['dance_category', 'dancecategory', 'genre', 'style', 'type', 'dance_type', 'dancetype', 'category_type'],
};

/**
 * Find the best matching canonical field name using fuzzy matching
 * Returns the canonical field name and confidence score (0-1)
 *
 * @param header - The CSV header to match
 * @param validFields - Array of canonical field names
 * @param threshold - Minimum confidence score (default 0.7)
 */
export function suggestColumnMatch(
  header: string,
  validFields: string[],
  threshold: number = 0.7
): { field: string; confidence: number } | null {
  const normalized = normalizeHeader(header);

  // Exact match
  if (validFields.includes(normalized)) {
    return { field: normalized, confidence: 1.0 };
  }

  // Check known variations
  for (const [canonical, variations] of Object.entries(FIELD_VARIATIONS)) {
    if (validFields.includes(canonical) && variations.includes(normalized)) {
      return { field: canonical, confidence: 0.95 };
    }
  }

  // Fuzzy matching with Levenshtein distance
  let bestMatch: { field: string; confidence: number } | null = null;

  for (const field of validFields) {
    const distance = levenshtein.get(normalized, field);
    const maxLength = Math.max(normalized.length, field.length);
    const confidence = 1 - (distance / maxLength);

    if (confidence >= threshold && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { field, confidence };
    }
  }

  // Also check variations against valid fields
  for (const [canonical, variations] of Object.entries(FIELD_VARIATIONS)) {
    if (!validFields.includes(canonical)) continue;

    for (const variation of variations) {
      const distance = levenshtein.get(normalized, variation);
      const maxLength = Math.max(normalized.length, variation.length);
      const confidence = 1 - (distance / maxLength);

      if (confidence >= threshold && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { field: canonical, confidence: confidence * 0.9 }; // Slight penalty for variation match
      }
    }
  }

  return bestMatch;
}

/**
 * Map CSV headers to canonical field names
 * Returns mapping and any unmatched headers
 */
export function mapCSVHeaders(
  headers: string[],
  validFields: string[],
  threshold: number = 0.7
): {
  mapping: Record<string, string>;  // CSV header → canonical field
  unmatched: string[];               // Headers that couldn't be matched
  suggestions: Array<{ header: string; field: string; confidence: number }>;
} {
  const mapping: Record<string, string> = {};
  const unmatched: string[] = [];
  const suggestions: Array<{ header: string; field: string; confidence: number }> = [];

  for (const header of headers) {
    const match = suggestColumnMatch(header, validFields, threshold);

    if (match) {
      mapping[header] = match.field;
      if (match.confidence < 1.0) {
        suggestions.push({ header, field: match.field, confidence: match.confidence });
      }
    } else {
      unmatched.push(header);
    }
  }

  return { mapping, unmatched, suggestions };
}

/**
 * Get expected fields for dancer CSV import
 */
export const DANCER_CSV_FIELDS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'email',
  'phone',
  'gender',
  'address',
  'city',
  'province',
  'postal_code',
  'country',
  'emergency_contact_name',
  'emergency_contact_phone',
  'medical_notes',
  'parent_name',
  'parent_email',
  'parent_phone',
  'skill_level',
  'registration_number',
];

/**
 * Get expected fields for routine CSV import
 */
export const ROUTINE_CSV_FIELDS = [
  'title',
  'props',
  'dancers',
  'choreographer',
  'dance category',
  'category',
  'genre',
  'style',
  'type',
  'duration_seconds',
];
