/**
 * Classification Validation Utilities
 * Phase 2 Spec: PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md lines 113-227
 *
 * Validates classification selection based on entry size and dancer classifications
 */

export interface Classification {
  id: string;
  name: string;
  skill_level: number;
  tenant_id: string;
}

export interface DancerWithClassification {
  id: string;
  classification: Classification;
  classification_id: string;
}

/**
 * Determine which classification rule applies based on entry size
 * Phase 2 spec lines 86-227
 */
export function getClassificationRule(dancerCount: number): 'solo' | 'duet_trio' | 'group' | 'production' {
  if (dancerCount === 1) return 'solo';
  if (dancerCount >= 2 && dancerCount <= 3) return 'duet_trio';
  if (dancerCount >= 4 && dancerCount <= 19) return 'group';
  if (dancerCount >= 20) return 'production'; // Superline can optionally use production
  throw new Error('Invalid dancer count');
}

/**
 * Solo: Classification MUST match dancer's classification (100% locked)
 * Phase 2 spec lines 86-111
 */
export function validateSoloClassification(
  dancer: DancerWithClassification,
  selectedClassificationId: string
): { valid: boolean; error?: string; suggested: string } {
  const required = dancer.classification_id;

  return {
    valid: selectedClassificationId === required,
    error: selectedClassificationId !== required
      ? `Solo must use dancer's classification (${dancer.classification.name})`
      : undefined,
    suggested: required
  };
}

/**
 * Duet/Trio: Highest dancer classification, can bump up ONE level only
 * Phase 2 spec lines 113-150
 */
export function validateDuetTrioClassification(
  dancers: DancerWithClassification[],
  selectedClassificationId: string,
  allClassifications: Classification[]
): {
  valid: boolean;
  error?: string;
  suggested: string;
  allowedIds: string[];
  highestLevel: number;
} {
  // Find highest classification among dancers
  const highest = dancers.reduce((max, curr) =>
    curr.classification.skill_level > max.skill_level ? curr.classification : max
  , dancers[0].classification);

  // Get allowed classifications (highest or one level higher)
  const allowed = allClassifications.filter(c =>
    c.skill_level >= highest.skill_level &&
    c.skill_level <= highest.skill_level + 1
  );

  const allowedIds = allowed.map(c => c.id);
  const selectedClass = allClassifications.find(c => c.id === selectedClassificationId);

  if (!selectedClass) {
    return {
      valid: false,
      error: 'Invalid classification selected',
      suggested: highest.id,
      allowedIds,
      highestLevel: highest.skill_level
    };
  }

  // Validate selection
  if (selectedClass.skill_level < highest.skill_level) {
    return {
      valid: false,
      error: `Minimum ${highest.name} (based on highest dancer)`,
      suggested: highest.id,
      allowedIds,
      highestLevel: highest.skill_level
    };
  }

  if (selectedClass.skill_level > highest.skill_level + 1) {
    return {
      valid: false,
      error: 'Can only bump up one level from highest dancer',
      suggested: highest.id,
      allowedIds,
      highestLevel: highest.skill_level
    };
  }

  return {
    valid: true,
    suggested: highest.id,
    allowedIds,
    highestLevel: highest.skill_level
  };
}

/**
 * Group/Line: 60% majority rule, can bump up ONE level only
 * Phase 2 spec lines 153-196
 */
export function validateGroupClassification(
  dancers: DancerWithClassification[],
  selectedClassificationId: string,
  allClassifications: Classification[]
): {
  valid: boolean;
  error?: string;
  suggested: string;
  allowedIds: string[];
  majorityPercentage?: number;
  majorityName?: string;
} {
  const total = dancers.length;

  // Count dancers per classification
  const counts: Record<string, number> = {};
  dancers.forEach(d => {
    counts[d.classification_id] = (counts[d.classification_id] || 0) + 1;
  });

  // Find 60%+ majority
  let majorityClassification: Classification | null = null;
  let majorityCount = 0;

  for (const [classId, count] of Object.entries(counts)) {
    if (count / total >= 0.6) {
      const classification = dancers.find(d => d.classification_id === classId)?.classification;
      if (classification) {
        majorityClassification = classification;
        majorityCount = count;
        break;
      }
    }
  }

  // No 60% majority: use highest classification
  if (!majorityClassification) {
    const highest = dancers.reduce((max, curr) =>
      curr.classification.skill_level > max.skill_level ? curr.classification : max
    , dancers[0].classification);
    majorityClassification = highest;
  }

  // Get allowed classifications (majority or one level higher)
  const allowed = allClassifications.filter(c =>
    c.skill_level >= majorityClassification!.skill_level &&
    c.skill_level <= majorityClassification!.skill_level + 1
  );

  const allowedIds = allowed.map(c => c.id);
  const selectedClass = allClassifications.find(c => c.id === selectedClassificationId);

  if (!selectedClass) {
    return {
      valid: false,
      error: 'Invalid classification selected',
      suggested: majorityClassification.id,
      allowedIds,
      majorityPercentage: (majorityCount / total) * 100,
      majorityName: majorityClassification.name
    };
  }

  // Validate selection
  if (selectedClass.skill_level < majorityClassification.skill_level) {
    return {
      valid: false,
      error: `Minimum ${majorityClassification.name} (60% majority)`,
      suggested: majorityClassification.id,
      allowedIds,
      majorityPercentage: (majorityCount / total) * 100,
      majorityName: majorityClassification.name
    };
  }

  if (selectedClass.skill_level > majorityClassification.skill_level + 1) {
    return {
      valid: false,
      error: 'Can only bump up one level from majority',
      suggested: majorityClassification.id,
      allowedIds,
      majorityPercentage: (majorityCount / total) * 100,
      majorityName: majorityClassification.name
    };
  }

  return {
    valid: true,
    suggested: majorityClassification.id,
    allowedIds,
    majorityPercentage: (majorityCount / total) * 100,
    majorityName: majorityClassification.name
  };
}

/**
 * Production: Auto-lock to "Production" classification
 * Phase 2 spec lines 199-227, 324-373
 */
export function getProductionClassification(
  allClassifications: Classification[]
): Classification | null {
  return allClassifications.find(c => c.name === 'Production') || null;
}

/**
 * Main validation function - determines rule and validates
 */
export function validateEntryClassification(
  dancers: DancerWithClassification[],
  selectedClassificationId: string,
  allClassifications: Classification[],
  isProduction: boolean = false
): {
  valid: boolean;
  error?: string;
  suggested: string;
  allowedIds: string[];
  rule: string;
} {
  // Production override
  if (isProduction) {
    const productionClass = getProductionClassification(allClassifications);
    if (!productionClass) {
      return {
        valid: false,
        error: 'Production classification not found in system',
        suggested: '',
        allowedIds: [],
        rule: 'production'
      };
    }

    return {
      valid: selectedClassificationId === productionClass.id,
      error: selectedClassificationId !== productionClass.id
        ? 'Production entries must use Production classification'
        : undefined,
      suggested: productionClass.id,
      allowedIds: [productionClass.id],
      rule: 'production'
    };
  }

  const dancerCount = dancers.length;
  const rule = getClassificationRule(dancerCount);

  switch (rule) {
    case 'solo':
      const soloResult = validateSoloClassification(dancers[0], selectedClassificationId);
      return { ...soloResult, allowedIds: [soloResult.suggested], rule };

    case 'duet_trio':
      const duetResult = validateDuetTrioClassification(dancers, selectedClassificationId, allClassifications);
      return { ...duetResult, rule };

    case 'group':
      const groupResult = validateGroupClassification(dancers, selectedClassificationId, allClassifications);
      return { ...groupResult, rule };

    default:
      return {
        valid: false,
        error: 'Invalid entry size',
        suggested: '',
        allowedIds: [],
        rule: 'unknown'
      };
  }
}
