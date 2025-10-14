import { FIELD_SYNONYMS, TargetField } from './fieldSynonyms';
import { normalizeHeader, similarity, isEmail, isPhone, isDateLike, tokenize } from './valueParsers';

export interface AutoMapInput {
  headers: string[];
  sampleRows: Record<string, string>[]; // { header: value }
  contextHint?: 'dancers' | 'routines';
}

export interface MappingSuggestion {
  sourceHeader: string;
  target?: TargetField;
  confidence: number; // 0..1
  reasons: string[];
}

export function suggestMapping(input: AutoMapInput): MappingSuggestion[] {
  const { headers, sampleRows, contextHint } = input;
  const suggestions: MappingSuggestion[] = [];
  for (const h of headers) {
    const norm = normalizeHeader(h);
    let best: { field: TargetField; score: number; reasons: string[] } | null = null;

    for (const field of Object.keys(FIELD_SYNONYMS) as TargetField[]) {
      const reasons: string[] = [];
      // Header vs synonyms
      let synScore = 0;
      for (const syn of FIELD_SYNONYMS[field]) {
        const s = similarity(norm, syn);
        if (s > synScore) synScore = s;
      }
      if (synScore > 0) reasons.push(`syn:${synScore.toFixed(2)}`);

      // Value type hints (sample first 20 rows)
      const samples = sampleRows.slice(0, 20).map((r) => r[h]).filter(Boolean) as string[];
      let typeBoost = 0;
      if (samples.length) {
        const head = samples[0];
        if (field === 'email' && isEmail(head)) { typeBoost += 0.3; reasons.push('email'); }
        if (field === 'phone' && isPhone(head)) { typeBoost += 0.2; reasons.push('phone'); }
        if (field === 'date_of_birth' && isDateLike(head)) { typeBoost += 0.3; reasons.push('date'); }
        if ((field === 'participants' || field === 'special_requirements') && /[;,\n]/.test(head)) { typeBoost += 0.1; reasons.push('multi'); }
      }

      // Token overlap
      const hTokens = tokenize(norm);
      const synTokens = new Set(FIELD_SYNONYMS[field].flatMap(tokenize));
      const overlap = hTokens.filter((t) => synTokens.has(t)).length;
      const overlapBoost = overlap ? Math.min(0.2, overlap * 0.05) : 0;
      if (overlapBoost) reasons.push(`tok+${overlapBoost.toFixed(2)}`);

      // Context hint boost
      const ctxBoost = contextHint === 'dancers'
        ? (['first_name','last_name','date_of_birth','email','phone','gender','studio_code'].includes(field) ? 0.05 : 0)
        : contextHint === 'routines'
          ? (['title','dance_category','classification','age_group','entry_size_category','choreographer','special_requirements','participants'].includes(field) ? 0.05 : 0)
          : 0;
      if (ctxBoost) reasons.push('ctx');

      const score = Math.max(synScore, 0) + typeBoost + overlapBoost + ctxBoost;
      if (!best || score > best.score) best = { field, score, reasons };
    }

    if (best) {
      suggestions.push({ sourceHeader: h, target: best.field, confidence: Math.min(1, best.score), reasons: best.reasons });
    }
  }
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

