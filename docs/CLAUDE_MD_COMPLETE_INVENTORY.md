# CLAUDE.md Complete Functional Inventory

**Purpose:** Ensure NO functionality is lost during streamlining

---

## Section-by-Section Analysis

### ✅ LINES 1-20: Core Behavioral Principles
**Function:** Tone, communication style, session completion protocol
**Keep:** YES - Essential behavioral rules
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 21-41: Production Status Header
**Function:** Context setting - live production with real money
**Keep:** YES - Critical context
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 42-50: Feature Development (Protocol 1)
**Function:** Permission to develop new features, document requirements
**Keep:** YES - Important policy
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 51-56: Change Management (Protocol 2)
**Function:** Testing, build, deploy, backup requirements
**Keep:** YES - Critical safety
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 58-64: Multi-Tenant Safety (Protocol 3)
**Function:** tenant_id filtering, test both tenants
**Keep:** YES - NON-NEGOTIABLE safety
**Move:** NO
**Status:** ✅ Already included in streamline plan
**Note:** ⚠️ DUPLICATED at lines 569-572, 831-835

---

### ✅ LINES 65-74: Spec-First Development (Protocol 4)
**Function:** Check specs before implementing, check existing data first
**Keep:** YES - Prevents over-engineering
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 75-88: Data Integrity (Protocol 5)
**Function:** Soft delete, capacity service, state validation, FK constraints, no data wipe
**Keep:** YES - CRITICAL data safety
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 89-95: Risk Communication (Protocol 6)
**Function:** Explicit risk statements, admit uncertainty, flag blockers
**Keep:** YES - Critical communication
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ⚠️ LINES 96-117: VERIFICATION COMMITMENTS
**Function:** Detailed verification rules, evidence requirements, false confirmation patterns
**Keep:** YES - CRITICAL quality control
**Move:** NO
**Status:** ⚠️ DUPLICATED with lines 574-608
**Action:** MERGE into single comprehensive section

---

### ✅ LINES 118-126: New Feature Protocol (Protocol 7)
**Function:** 6-step feature development process
**Keep:** YES - Process guidance
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 127-136: When to Ask Clarifying Questions
**Function:** Examples of when to ask vs. guess
**Keep:** YES - Important decision guidance
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 138-147: Email Policy (Protocol 8)
**Function:** CRITICAL - manual only, never auto-send
**Keep:** YES - NON-NEGOTIABLE safety
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 148-158: Emergency Stop Conditions
**Function:** When to stop all work immediately
**Keep:** YES - Critical safety
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 160-173: Production Tenant Information
**Function:** Tenant IDs, subdomains, status, CD emails
**Keep:** YES - Required for operations
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ⚠️ LINES 174-198: Production Login Credentials
**Function:** SA/CD/SD credentials, Playwright usage instructions
**Keep:** YES - CRITICAL for testing
**Move:** NO
**Status:** ⚠️ DUPLICATED at lines 635-637, 815-821
**Action:** Keep single detailed section, brief references elsewhere

---

### ✅ LINES 201-222: CompPortal User Roles
**Function:** SA/CD/SD role definitions, permissions, responsibilities
**Keep:** YES - Essential context
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### 🔄 LINES 223-227: Feature URL Patterns
**Function:** Where SA/CD/SD tools live
**Keep:** YES - Navigation guidance
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### 🔄 LINES 228-244: Access Control Patterns
**Function:** TypeScript code examples for role checking
**Keep:** YES - Critical security
**Move:** MAYBE → PATTERNS.md (but keep brief inline example)
**Status:** 🔄 Suggested for extraction
**Risk:** LOW - reference remains in main doc

---

### ✅ LINES 248-280: Business Logic Specifications
**Function:** Spec files location, spec-first workflow, line number references
**Keep:** YES - Source of truth guidance
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### 🔄 LINES 285-300: Current Known Issues / Anti-Patterns
**Function:** List of patterns to avoid vs. correct patterns
**Keep:** YES - Important architectural guidance
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### 🔄 LINES 301-304: Rewrite Plans in Progress
**Function:** Reference to capacity rewrite plans
**Keep:** MAYBE - Check if still relevant
**Move:** NO
**Status:** ⚠️ May be obsolete (capacity issues resolved?)
**Action:** CHECK with user

---

### 🚨 LINES 305-332: UI/UX Requirements (CRITICAL)
**Function:**
- Navigation for new admin pages
- Background colors (prevent white-on-white)
- Text colors (explicit, no inheritance)
- Fixed position components (spacing, brand colors)
- Testing at multiple widths
- Code examples (correct vs wrong)

**Keep:** YES - CRITICAL UI guidance
**Move:** Partial - Keep rules, move detailed example to PATTERNS.md
**Status:** ⚠️ **YOU WERE RIGHT - I MISSED THIS IN ORIGINAL ANALYSIS**
**Action:**
  - Keep lines 307-318 (rules) in CLAUDE.md
  - Move lines 320-331 (code example) to PATTERNS.md
  - Reference: "See PATTERNS.md for code examples"

---

### 🔄 LINES 333-360: Database Transactions (Required)
**Function:** Complete transaction pattern with locking, validation, audit
**Keep:** YES - Critical pattern
**Move:** YES → PATTERNS.md (keep brief rule in CLAUDE.md)
**Status:** 🔄 Suggested for extraction
**Action:**
  - Keep: "ALL capacity changes MUST use transactions with locking (see PATTERNS.md)"
  - Move: Full code example to PATTERNS.md

---

### 🔄 LINES 362-390: State Transitions (Validation Required)
**Function:** State machine rules, validation pattern, transaction usage
**Keep:** YES - Critical business logic
**Move:** YES → PATTERNS.md (keep brief rule in CLAUDE.md)
**Status:** 🔄 Suggested for extraction
**Action:**
  - Keep: State diagram and "validate before update" rule
  - Move: Full code example to PATTERNS.md

---

### ✅ LINES 394-428: No Sample Data Policy
**Function:** Zero hardcoded data, examples of violations
**Keep:** YES - Critical production policy
**Move:** Partial - Keep rule, move code examples to PATTERNS.md
**Status:** 🔄 Suggested for partial extraction

---

### ✅ LINES 430-451: CompPortal Troubleshooting
**Function:** Quick debug order, common gotchas, reference to GOTCHAS.md
**Keep:** YES - Practical debugging workflow
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 454-486: Bug Investigation Protocol
**Function:** Reproduce with Playwright MCP FIRST, never localhost, capture evidence
**Keep:** YES - CRITICAL workflow
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 487-506: Session Start Protocol
**Function:** Load order, grep-first strategy, token targets
**Keep:** YES - Session efficiency
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### 🔄 LINES 509-540: Session End Protocol
**Function:** Checklist, root directory requirements, evidence archiving
**Keep:** YES - Session cleanup
**Move:** NO
**Status:** 🔄 Suggested for simplification (checklist only)

---

### ✅ LINES 543-556: DevTeam Protocol
**Function:** When to use, batch fix workflow
**Keep:** YES - Batch operation guidance
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ⚠️ LINES 559-573: Task Verification Protocol
**Function:** 10-point checklist for marking work complete
**Keep:** YES - Quality control
**Move:** NO
**Status:** ⚠️ OVERLAPS with lines 96-117
**Action:** MERGE with verification commitments

---

### ⚠️ LINES 574-608: Verification Evidence Requirements
**Function:** Evidence format, acceptable/unacceptable statements, spec verification
**Keep:** YES - CRITICAL quality control
**Move:** NO
**Status:** ⚠️ DUPLICATES lines 96-117
**Action:** MERGE into single comprehensive verification section

---

### ⚠️ LINES 612-638: MCP Tools - Database Operations
**Function:** Supabase MCP ONLY, never psql, all operations via MCP
**Keep:** YES - MANDATORY tool usage
**Move:** NO
**Status:** ⚠️ DUPLICATED at lines 823-829
**Action:** Single consolidated MCP section

---

### ⚠️ LINES 627-638: MCP Tools - Testing (Playwright)
**Function:** Production URLs only, never localhost, credentials inline
**Keep:** YES - MANDATORY testing approach
**Move:** NO
**Status:** ⚠️ DUPLICATES credential section
**Action:** Reference credentials section instead of inline duplication

---

### 🔄 LINES 639-650: Supabase MCP Details
**Function:** Specific MCP commands, when to use each, spec references
**Keep:** YES - Operational guidance
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 651-654: Vercel MCP
**Function:** When to use (debugging only), don't poll
**Keep:** YES - Important usage rule
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 656-673: MCP Usage Strategy & Rules
**Function:** When to use each MCP tool, circuit breaker, don't poll
**Keep:** YES - Critical workflow
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 674-682: Operational Assumptions
**Function:** Trust user about deployment, don't second-guess
**Keep:** YES - Important operational context
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### 🔄 LINES 683-717: JavaScript Chunk Cache Debugging
**Function:** Detailed Next.js chunk cache investigation workflow
**Keep:** YES - Critical debugging knowledge
**Move:** YES → DEBUGGING.md or PATTERNS.md
**Status:** 🔄 Suggested for extraction
**Action:**
  - Keep: "Check chunk cache if changes don't appear (see DEBUGGING.md)"
  - Move: Full workflow to DEBUGGING.md

---

### ✅ LINES 721-733: Quality Gates
**Function:** Pre-commit checklist
**Keep:** YES - Quality control
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 736-753: Anti-Patterns
**Function:** When to load ANTI_PATTERNS.md, red flags
**Keep:** YES - Important reference
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### 🔄 LINES 756-802: Commit Format
**Function:** 8-line format, 2 detailed examples, rules
**Keep:** YES - Required format
**Move:** Partial - Keep 1 example, move 2nd to PATTERNS.md
**Status:** 🔄 Suggested for simplification

---

### ⚠️ LINES 805-822: Testing Requirements - Production Testing
**Function:** Playwright MCP usage, credentials repeated
**Keep:** YES - Critical testing rules
**Move:** NO
**Status:** ⚠️ DUPLICATES credential section (lines 174-198, 635-637)
**Action:** Reference credentials section instead

---

### ⚠️ LINES 823-830: Testing Requirements - Database Operations
**Function:** Supabase MCP ONLY
**Keep:** YES - Mandatory tool usage
**Move:** NO
**Status:** ⚠️ DUPLICATES lines 618-625
**Action:** Already covered in MCP section, remove duplication

---

### ⚠️ LINES 831-836: Testing Requirements - Multi-Tenant
**Function:** Test both tenants, capture evidence
**Keep:** YES - Critical safety
**Move:** NO
**Status:** ⚠️ DUPLICATES lines 58-64, 569-572
**Action:** Already covered in protocols, remove duplication

---

### ✅ LINES 837-850: Test Against Spec & Cannot Test Protocol
**Function:** Spec compliance, document skipped tests
**Keep:** YES - Quality control
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### 🔄 LINES 853-874: Production Testing Checklist
**Function:** Before commit, after deploy checklists
**Keep:** YES - Quality gates
**Move:** NO
**Status:** 🔄 OVERLAPS with Quality Gates (lines 721-733)
**Action:** Consolidate with Quality Gates section

---

### 🔄 LINES 877-932: Cross-Tenant Isolation Patterns
**Function:** 4 detailed code patterns (basic query, relations, create, verification)
**Keep:** YES - CRITICAL security patterns
**Move:** YES → PATTERNS.md (keep brief rules in CLAUDE.md)
**Status:** 🔄 Suggested for extraction
**Action:**
  - Keep: "EVERY query MUST filter by tenant_id (see PATTERNS.md for examples)"
  - Move: All 4 code examples to PATTERNS.md

---

### ✅ LINES 935-975: Production Incident Response
**Function:** P0/P1/P2 severity levels, response protocols
**Keep:** YES - Critical emergency procedures
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 978-1008: Emergency Protocols
**Function:** Build fails, production breaks, MCP circuit breaker, spec mismatch
**Keep:** YES - Critical emergency procedures
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 1011-1020: Project Switching Protocol
**Function:** How to switch between projects
**Keep:** YES - Multi-project workflow
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 1023-1038: Session Success Criteria
**Function:** Success checklist, token budgets
**Keep:** YES - Quality metrics
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 1041-1060: Additional Documentation
**Function:** References to other docs (PATTERNS, CADENCE, specs, archives)
**Keep:** YES - Navigation
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

### ✅ LINES 1063-1091: Meta-Principles
**Function:** Philosophical guidance (embrace failure, sustainable pace, honesty, spec-driven)
**Keep:** YES - Important mindset
**Move:** NO
**Status:** ✅ Already included in streamline plan

---

## ⚠️ CRITICAL SECTIONS I INITIALLY MISSED

### 🚨 UI/UX Requirements (Lines 305-332)
**YOU WERE CORRECT - This is critical functionality**

**What it contains:**
1. Navigation requirements for new admin pages
2. Background color rules (prevent white-on-white)
3. Text color rules (always explicit)
4. Fixed position component spacing rules
5. Brand color matching
6. Multi-width testing requirements
7. Code example (correct vs wrong)

**Revised Plan:**
- ✅ Keep ALL rules (lines 307-318)
- 🔄 Move only the code example (lines 320-331) to PATTERNS.md
- ✅ Add reference: "See PATTERNS.md for UI component examples"

---

## 📊 DUPLICATION SUMMARY

### Credentials (3 locations)
- Lines 174-198 (DETAILED - keep this)
- Lines 635-637 (brief inline - remove, reference main)
- Lines 815-821 (brief inline - remove, reference main)

### Multi-Tenant Testing (3 locations)
- Lines 58-64 (Protocol 3 - keep this)
- Lines 569-572 (Task Verification - remove, reference Protocol 3)
- Lines 831-836 (Testing Requirements - remove, reference Protocol 3)

### Database Operations (3 locations)
- Lines 618-625 (MCP Tools - keep this)
- Lines 823-829 (Testing Requirements - remove, reference MCP Tools)
- Lines 333-360 (Transaction pattern - move to PATTERNS.md)

### Verification (2 locations)
- Lines 96-117 (Verification Commitments - merge with below)
- Lines 574-608 (Evidence Requirements - merge with above)

### Quality Gates (2 locations)
- Lines 721-733 (Quality Gates - keep this)
- Lines 853-874 (Production Checklist - merge with above)

---

## ✅ REVISED STREAMLINING PLAN (ALL FUNCTION PRESERVED)

### Extract to PATTERNS.md (~350 lines)
1. Access control code examples (lines 229-244)
2. Database transaction full example (lines 336-358)
3. State transition full example (lines 372-390)
4. Sample data violation examples (lines 413-423)
5. UI/UX code example ONLY (lines 320-331) - **KEEP RULES**
6. Chunk cache debugging workflow (lines 683-717)
7. Commit format 2nd example (lines 782-801)
8. Cross-tenant isolation 4 patterns (lines 879-931)

### Consolidate Duplicates (~200 lines saved)
1. Merge verification sections (96-117 + 574-608)
2. Remove credential duplicates (keep 174-198, reference from 635-637, 815-821)
3. Remove multi-tenant duplicates (keep 58-64, reference from 569-572, 831-836)
4. Remove database MCP duplicate (keep 618-625, remove 823-829)
5. Merge quality gates (keep 721-733, merge 853-874)

### Simplify Verbose Sections (~100 lines saved)
1. Session End Protocol - checklist only
2. Commit Format - 1 example instead of 2
3. Remove obsolete "Rewrite Plans" section if confirmed

**Total Savings: ~650 lines → ~440 lines in CLAUDE.md**
**Token Savings: ~10k tokens per session start**

---

## 🚨 CRITICAL: What MUST Be Preserved in CLAUDE.md

✅ All safety protocols (data integrity, multi-tenant, email policy)
✅ All MCP tool mandates
✅ All credential information
✅ All verification requirements
✅ All emergency procedures
✅ **ALL UI/UX design rules** (lines 307-318)
✅ All session protocols
✅ All quality gates
✅ All spec-driven development guidance
✅ All behavioral principles

---

## 🎯 SAFE EXTRACTION CRITERIA

**ONLY extract to PATTERNS.md if:**
- ✅ It's a code example (not a rule)
- ✅ Brief reference remains in CLAUDE.md
- ✅ PATTERNS.md is loaded when needed
- ✅ Function is still discoverable

**NEVER extract:**
- ❌ Safety protocols
- ❌ Mandatory requirements
- ❌ Emergency procedures
- ❌ Credentials
- ❌ Core workflow rules

---

**Conclusion:** You were absolutely right - I initially missed the UI/UX Requirements section. Updated plan now preserves ALL functionality while reducing token load by ~10k per session start.

Safe to proceed with revised plan?
