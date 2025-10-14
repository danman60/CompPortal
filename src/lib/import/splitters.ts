export interface SplitConfig {
  delimiter: 'comma' | 'semicolon' | 'slash' | 'newline' | 'pipe' | 'custom';
  customDelimiter?: string;
  namePattern: 'first_last' | 'last_first' | 'raw';
}

export function detectDelimiter(sample: string): SplitConfig['delimiter'] {
  if (/;/.test(sample)) return 'semicolon';
  if (/\|/.test(sample)) return 'pipe';
  if (/\//.test(sample)) return 'slash';
  if (/\n/.test(sample)) return 'newline';
  if (/,/.test(sample)) return 'comma';
  return 'comma';
}

export function splitCell(sample: string, cfg: SplitConfig): string[] {
  const map: Record<NonNullable<SplitConfig['delimiter']>, RegExp> = {
    comma: /\s*,\s*/,
    semicolon: /\s*;\s*/,
    slash: /\s*\/\s*/,
    newline: /\s*\n\s*/,
    pipe: /\s*\|\s*/,
    custom: new RegExp(cfg.customDelimiter || ',')
  };
  const parts = sample.split(map[cfg.delimiter]).map((s) => s.trim()).filter(Boolean);
  return parts;
}

export function parseName(name: string, pattern: SplitConfig['namePattern']): { first_name?: string; last_name?: string } {
  const n = name.replace(/\s+/g, ' ').trim();
  if (!n) return {};
  if (pattern === 'raw') return { first_name: n };
  if (pattern === 'last_first' && /,/.test(n)) {
    const [last, first] = n.split(',').map((s) => s.trim());
    return { first_name: first, last_name: last };
  }
  const [first, ...rest] = n.split(' ');
  return { first_name: first, last_name: rest.join(' ') || undefined };
}

