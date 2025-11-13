#!/usr/bin/env tsx
/**
 * Quick Security Audit Script
 * Scans for common vulnerable patterns
 *
 * Usage: npx tsx scripts/security-audit-quick.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SecurityIssue {
  file: string;
  line: number;
  code: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  fix: string;
}

const VULNERABLE_PATTERNS = [
  {
    name: 'NULL_BYPASS_PATTERN',
    pattern: /if\s*\(\s*isStudioDirector\([^)]+\)\s*&&\s*ctx\.studioId\s*\)/,
    severity: 'CRITICAL' as const,
    description: 'CRITICAL: NULL studioId bypasses filter (same pattern that caused the breach)',
    fix: 'Use explicit NULL check:\nif (isStudioDirector(ctx.userRole)) {\n  if (!ctx.studioId) throw FORBIDDEN;\n  where.studio_id = ctx.studioId;\n}',
  },
  {
    name: 'MISSING_TENANT_FILTER',
    pattern: /findMany\(\s*\{\s*where:\s*\{(?!.*tenant_id)[^}]{0,200}\}/,
    severity: 'HIGH' as const,
    description: 'HIGH: Query may be missing tenant_id filter',
    fix: 'Add tenant_id filter:\nwhere: {\n  tenant_id: ctx.tenantId,\n  ...\n}',
  },
  {
    name: 'PUBLIC_SENSITIVE_ENDPOINT',
    pattern: /publicProcedure\s*\.(?:input|query|mutation)[^;]*(?:studios|dancers|entries|reservations|invoices)/,
    severity: 'MEDIUM' as const,
    description: 'MEDIUM: Public procedure accessing potentially sensitive data',
    fix: 'Consider changing to protectedProcedure if authentication is required',
  },
];

function scanFile(filePath: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  VULNERABLE_PATTERNS.forEach((pattern) => {
    lines.forEach((line, index) => {
      if (pattern.pattern.test(line)) {
        issues.push({
          file: filePath.replace(process.cwd(), '').replace(/\\/g, '/'),
          line: index + 1,
          code: line.trim(),
          severity: pattern.severity,
          description: pattern.description,
          fix: pattern.fix,
        });
      }
    });
  });

  return issues;
}

function scanDirectory(dir: string): SecurityIssue[] {
  const allIssues: SecurityIssue[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        allIssues.push(...scanDirectory(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        allIssues.push(...scanFile(fullPath));
      }
    }
  } catch (error) {
    // Silently skip inaccessible directories
  }

  return allIssues;
}

function main() {
  console.log('🔍 Running Security Audit...\n');

  const routersPath = join(__dirname, '../src/server/routers');
  const issues = scanDirectory(routersPath);

  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const high = issues.filter(i => i.severity === 'HIGH');
  const medium = issues.filter(i => i.severity === 'MEDIUM');

  console.log('📊 Results:\n');
  console.log(`  CRITICAL: ${critical.length}`);
  console.log(`  HIGH:     ${high.length}`);
  console.log(`  MEDIUM:   ${medium.length}`);
  console.log(`  TOTAL:    ${issues.length}\n`);

  if (issues.length === 0) {
    console.log('✅ No security issues found!\n');
    process.exit(0);
  }

  console.log('─'.repeat(80) + '\n');

  // Show critical issues first
  if (critical.length > 0) {
    console.log('🚨 CRITICAL ISSUES:\n');
    critical.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}:${issue.line}`);
      console.log(`   ${issue.description}`);
      console.log(`   Code: ${issue.code}`);
      console.log(`   Fix: ${issue.fix.replace(/\n/g, '\n        ')}\n`);
    });
  }

  // Show high issues
  if (high.length > 0) {
    console.log('⚠️  HIGH ISSUES:\n');
    high.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}:${issue.line}`);
      console.log(`   ${issue.description}`);
      console.log(`   Code: ${issue.code}\n`);
    });
  }

  // Show medium issues
  if (medium.length > 0) {
    console.log('ℹ️  MEDIUM ISSUES:\n');
    medium.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}:${issue.line}`);
      console.log(`   ${issue.description}`);
      console.log(`   Code: ${issue.code}\n`);
    });
  }

  console.log('─'.repeat(80) + '\n');

  // Exit with error code if critical issues found
  if (critical.length > 0) {
    console.log('❌ AUDIT FAILED: Critical security issues found\n');
    process.exit(1);
  } else {
    console.log('✅ AUDIT PASSED: No critical issues (review high/medium items)\n');
    process.exit(0);
  }
}

main();
