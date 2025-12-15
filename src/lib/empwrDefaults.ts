/**
 * EMPWR Dance Competition Default Settings
 *
 * These defaults are based on the EMPWR Dance Competition brochure
 * and represent standard competition parameters that can be customized
 * per competition.
 */

export const EMPWR_AGE_DIVISIONS = {
  divisions: [
    { name: 'Micro', shortName: 'Mi', minAge: 0, maxAge: 5 },
    { name: 'Mini', shortName: 'M', minAge: 6, maxAge: 8 },
    { name: 'Junior', shortName: 'J', minAge: 9, maxAge: 11 },
    { name: 'Intermediate', shortName: 'I', minAge: 12, maxAge: 14 },
    { name: 'Senior', shortName: 'S', minAge: 15, maxAge: 17 },
    { name: 'Adult', shortName: 'A', minAge: 18, maxAge: 999 },
  ],
};

export const EMPWR_CLASSIFICATIONS = {
  classifications: [
    {
      name: 'Novice',
      description: 'Never competed in solo/duet/trio',
      rules: '75% of group dancers must meet novice criteria. Dancers who have never competed in a solo, duet, or trio category.',
    },
    {
      name: 'Part-Time',
      description: 'Never competed competitively, ≤6 hours/week training',
      rules: '75% of group dancers must meet part-time criteria. Dancers training 6 hours or less per week who have never competed competitively.',
    },
    {
      name: 'Competitive',
      description: '>6 hours/week training',
      rules: 'No restrictions. Dancers training more than 6 hours per week.',
    },
  ],
};

export const EMPWR_ENTRY_FEES = {
  fees: {
    solo: 115,
    duetTrio: 70, // per dancer
    group: 55, // per dancer
    titleUpgrade: 30,
  },
  currency: 'USD',
  description: 'Standard entry fees by category type',
};

export const EMPWR_DANCE_CATEGORIES = {
  styles: [
    { name: 'Classical Ballet', code: 'CB', description: 'Traditional classical ballet technique' },
    { name: 'Tap', code: 'TAP', description: 'Rhythmic tap dancing' },
    { name: 'Jazz', code: 'JAZ', description: 'Contemporary jazz styles' },
    { name: 'Lyrical', code: 'LYR', description: 'Expressive lyrical movement' },
    { name: 'Contemporary', code: 'CON', description: 'Modern contemporary dance' },
    { name: 'Hip-Hop', code: 'HH', description: 'Urban hip-hop styles' },
    { name: 'Musical Theatre', code: 'MT', description: 'Broadway and musical theatre' },
    { name: 'Pointe', code: 'PT', description: 'Ballet on pointe' },
    { name: 'Acro', code: 'ACR', description: 'Acrobatic dance' },
    { name: 'Open', code: 'OPN', description: 'Open category for mixed styles' },
    { name: 'Song & Dance', code: 'SD', description: 'Vocal performance with dance' },
    { name: 'Contemporary Ballet', code: 'CB', description: 'Modern interpretation of ballet' },
    { name: 'Modern', code: 'MOD', description: 'Modern dance technique' },
    { name: 'Production', code: 'PRD', description: 'Large-scale production numbers' },
  ],
};

export const EMPWR_SCORING_SYSTEM = {
  scoring_scale: 100,
  scoring_type: 'average',
  number_of_judges: 3,
  tiers: [
    { name: 'Bronze', minScore: 0, maxScore: 83.99, color: '#CD7F32' },
    { name: 'Silver', minScore: 84, maxScore: 86.99, color: '#C0C0C0' },
    { name: 'Gold', minScore: 87, maxScore: 89.99, color: '#FFD700' },
    { name: 'Titanium', minScore: 90, maxScore: 92.99, color: '#878681' },
    { name: 'Platinum', minScore: 93, maxScore: 95.99, color: '#E5E4E2' },
    { name: 'Pandora', minScore: 96, maxScore: 100, color: '#9966CC' },
  ],
  description: 'EMPWR uses 100-point scale (per judge average). Bronze is 84.00 and under.',
};

export const EMPWR_ENTRY_SIZE_CATEGORIES = {
  categories: [
    {
      name: 'Solo',
      minDancers: 1,
      maxDancers: 1,
      baseFee: 115,
      description: 'Individual performance',
    },
    {
      name: 'Duet/Trio',
      minDancers: 2,
      maxDancers: 3,
      perDancerFee: 70,
      description: '2-3 dancers',
    },
    {
      name: 'Small Group',
      minDancers: 4,
      maxDancers: 9,
      perDancerFee: 55,
      description: '4-9 dancers',
    },
    {
      name: 'Large Group',
      minDancers: 10,
      maxDancers: 14,
      perDancerFee: 55,
      description: '10-14 dancers',
    },
    {
      name: 'Line',
      minDancers: 15,
      maxDancers: 19,
      perDancerFee: 55,
      description: '15-19 dancers',
    },
    {
      name: 'Super Line',
      minDancers: 20,
      maxDancers: 999,
      perDancerFee: 55,
      description: '20+ dancers',
    },
  ],
};

export const EMPWR_TITLE_DIVISION = {
  enabled: true,
  upgradeFee: 30,
  maxScorePerJudge: 100,
  criteria: [
    { name: 'Technique', maxPoints: 20, description: 'Technical execution and skill' },
    { name: 'Stage Presence', maxPoints: 20, description: 'Performance quality and charisma' },
    { name: 'Execution', maxPoints: 20, description: 'Precision and control' },
    { name: 'Costume', maxPoints: 20, description: 'Costume design and appropriateness' },
    { name: 'Entertainment Value', maxPoints: 20, description: 'Overall entertainment and impact' },
  ],
  description: 'Separate scoring division with 100 points per judge across 5 criteria',
};

export const EMPWR_SPECIAL_PROGRAMS = {
  danceOff: {
    enabled: true,
    divisions: ['12 & Under', '13 & Up'],
    description: 'High-energy dance battle competition where dancers showcase their skills in head-to-head performances',
  },
  ambassadorship: {
    enabled: true,
    spotsPerEvent: 8,
    description: 'Leadership and mentorship program selecting 8 outstanding dancers per event to represent EMPWR',
  },
};

// Combined default settings object
export const EMPWR_DEFAULTS = {
  ageDivisions: EMPWR_AGE_DIVISIONS,
  classifications: EMPWR_CLASSIFICATIONS,
  entryFees: EMPWR_ENTRY_FEES,
  danceCategories: EMPWR_DANCE_CATEGORIES,
  scoringSystem: EMPWR_SCORING_SYSTEM,
  entrySizeCategories: EMPWR_ENTRY_SIZE_CATEGORIES,
  titleDivision: EMPWR_TITLE_DIVISION,
  specialPrograms: EMPWR_SPECIAL_PROGRAMS,
};

// TypeScript types for settings
export type AgeDivisionSettings = typeof EMPWR_AGE_DIVISIONS;
export type ClassificationSettings = typeof EMPWR_CLASSIFICATIONS;
export type EntryFeeSettings = typeof EMPWR_ENTRY_FEES;
export type DanceCategorySettings = typeof EMPWR_DANCE_CATEGORIES;
export type ScoringSystemSettings = typeof EMPWR_SCORING_SYSTEM;
export type EntrySizeSettings = typeof EMPWR_ENTRY_SIZE_CATEGORIES;
export type TitleDivisionSettings = typeof EMPWR_TITLE_DIVISION;
export type SpecialProgramsSettings = typeof EMPWR_SPECIAL_PROGRAMS;

export type CompetitionSettings = {
  ageDivisions?: AgeDivisionSettings;
  classifications?: ClassificationSettings;
  entryFees?: EntryFeeSettings;
  danceCategories?: DanceCategorySettings;
  scoringSystem?: ScoringSystemSettings;
  entrySizeCategories?: EntrySizeSettings;
  titleDivision?: TitleDivisionSettings;
  specialPrograms?: SpecialProgramsSettings;
};
