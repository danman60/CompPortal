# GlowDance Export System Analysis

## Overview

Analysis of existing CSV export capabilities based on sample files from the current system. These exports reveal the system's comprehensive competition management features and data structure.

## Export Types Identified

### 1. **Studio Directory Export** (`NATIONAL_STUDIOS.csv`)

**Purpose**: Complete directory of registered dance studios for competition organizers

**Data Fields**:
- `Code` - Single letter studio identifier (A-Z, AA)
- `Studio` - Full studio name
- `Address` - Street address
- `City` - City location
- `Province` - Province/State (ON, FL, TRUE - note data quality issue)
- `Postal Code` - Postal/ZIP codes
- `E-Mail` - Primary studio email
- `Phone` - Contact phone number
- `Contact` - Primary contact person name

**Key Insights**:
- **26+ studios** registered for this competition
- **Geographic spread**: Primarily Ontario (ON) with some Florida (FL) studios
- **Data quality issues**: "TRUE" in Province field indicates validation problems
- **International scope**: Both Canadian and US studios
- **Studio codes** used for referencing in other systems

**Business Use Cases**:
- Competition program printing
- Studio communication and coordination
- Judging reference materials
- Awards ceremony organization
- Marketing and outreach databases

---

### 2. **Competition Entry/Performance Export** (`NATIONALS_VIDEO_JUDGE.csv`)

**Purpose**: Complete performance lineup for judges, organizers, and video production

**Data Fields**:
- `Entry` - Sequential entry number (1-388)
- `Studio` - Studio code reference (matches studio directory)
- `Dance Title` - Name of the routine/performance
- `Type` - Competition category with participant count
- `Comments` - Special notes (*Title* marker indicates title rounds)
- `Dancer's Names` - Comma-separated list of participant names

**Performance Categories Identified**:
- **Solo (1)** - Individual performances (majority of entries)
- **Duet/Trio (2-3)** - Partner/small team performances
- **Small Group (4-8)** - Mid-size group routines
- **Large Group (10-13)** - Large ensemble performances
- **Improv (1)** - Improvisation categories

**Competition Structure Analysis**:
- **388 total entries** across all categories
- **Solo dominance**: ~80% of entries are solo performances
- **Title rounds**: Special "*Title*" marking indicates championship/finals
- **Studio diversity**: Entries from 25+ different studios
- **Dancer tracking**: Individual performer names maintained throughout

**Advanced Features Revealed**:
- **Age categories**: Implied through separate age divisions
- **Multiple entries**: Dancers competing in multiple categories
- **Group management**: Complex dancer combinations across studios
- **Competition flow**: Sequential numbering suggests running order

---

### 3. **Competition Scoring Summary Export** (`NATIONALS_SCORING_SUMMARY.csv`)

**Purpose**: Comprehensive competition management and scoring system with detailed performance tracking

**Data Fields** (35+ columns):
- **Basic Info**: `location_id`, `studio_id`, `entry_no`, `performance_date`, `performance_time`, `duration`
- **Competition Structure**: `session`, `location_name`, `studio_name`, `appearance_code`
- **Performance Details**: `title`, `category`, `classification`, `entrysize`, `agegroup`
- **Scoring System**: `scores_count`, `total_score`, `number_of_judges`
- **Participant Data**: `dancer_names`, `dancer_count`, `dancer_id`
- **Advanced Features**: `upgrades`, `award_info`, `heat`, `entry_id`, `sequence_no`
- **Classification System**: `competitive_age_group`, `dynamic_dancer_age_group`, `dance_form_age_grouping`
- **Award Categories**: `category_award_grouping`, `competitive_award_grouping`, `other_award_grouping`
- **Administrative**: `account_name`, `previous_entry`, `next_entry`

**Advanced Competition Features Revealed**:

**Performance Classification System**:
- **Titanium/Crystal Divisions**: Skill-level based competition tiers
- **Age Group Stratification**: Mini (7-8), Pre Junior (9-10), Junior (11-12), Teen (13-14), Senior (15-16), Senior+ (17+)
- **Dynamic Age Grouping**: Multiple age classification systems for different purposes
- **Dance Style Categories**: Ballet, Jazz, Lyrical, Contemporary, Hip Hop, Tap, Acro, Musical Theatre

**Sophisticated Scheduling**:
- **Session Management**: Multiple sessions (1, 2, 3) throughout the day
- **Precise Timing**: Performance times down to the minute with duration tracking
- **Sequential Order**: Entry linking (previous_entry, next_entry) for running order
- **Heat Organization**: Competition subdivisions for large categories

**Title Round System**:
- **"Title Upgrade" Tracking**: Elite level competitions within divisions
- **Award Grouping**: Multiple award categories for different skill levels
- **Competitive vs. Non-competitive**: Distinction between competitive and showcase entries

**Judge Management**:
- **Multi-judge System**: Currently shows 3 judges per location
- **Score Tracking**: Infrastructure for score collection (currently showing 0s - pre-competition export)
- **Judge Assignment**: Structured judging panels

**Business Intelligence Features**:
- **Studio Performance Analytics**: Complete studio participation tracking
- **Dancer Career Tracking**: Individual dancer performance history via dancer_id
- **Revenue Management**: Account-based billing system
- **Competition Production**: Professional event management with video coordination

---

## Technical Implementation Requirements

### **Database Schema Implications**

Based on these exports, the modern system needs:

```sql
-- Studios table with enhanced fields
CREATE TABLE studios (
  id UUID PRIMARY KEY,
  code VARCHAR(5) UNIQUE,  -- Support AA, BB format
  name VARCHAR(255),
  address VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(50),
  contact_name VARCHAR(255),
  account_name VARCHAR(255)  -- Billing account reference
);

-- Competitions with comprehensive structure
CREATE TABLE competitions (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  year INTEGER,
  location_name VARCHAR(255),
  performance_date DATE,
  session_count INTEGER DEFAULT 1,
  number_of_judges INTEGER DEFAULT 3,
  status VARCHAR(50) DEFAULT 'upcoming'
);

-- Competition sessions
CREATE TABLE competition_sessions (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  session_number INTEGER,
  start_time TIME,
  end_time TIME,
  session_date DATE
);

-- Advanced classification system
CREATE TABLE classifications (
  id UUID PRIMARY KEY,
  name VARCHAR(100),  -- "Titanium", "Crystal"
  description TEXT,
  skill_level INTEGER  -- 1-5 ranking
);

-- Age groups with dynamic grouping
CREATE TABLE age_groups (
  id UUID PRIMARY KEY,
  name VARCHAR(100),  -- "Junior (11-12)"
  min_age INTEGER,
  max_age INTEGER,
  competitive_group VARCHAR(100),  -- "Junior (11-12)"
  dynamic_group VARCHAR(100),      -- "Junior (11-12)"
  form_grouping VARCHAR(100)       -- "11-13 Yrs"
);

-- Dance categories with award groupings
CREATE TABLE dance_categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100),  -- "Ballet", "Jazz", "Hip Hop"
  category_award_grouping VARCHAR(255),    -- "Ballet, Demi-Character, Pointe, Modern"
  competitive_award_grouping VARCHAR(100), -- "Solos"
  other_award_grouping VARCHAR(100)        -- "Solos"
);

-- Competition entries with comprehensive tracking
CREATE TABLE competition_entries (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  studio_id UUID REFERENCES studios(id),
  entry_number INTEGER,
  sequence_number INTEGER,

  -- Performance details
  title VARCHAR(255),
  category_id UUID REFERENCES dance_categories(id),
  classification_id UUID REFERENCES classifications(id),
  age_group_id UUID REFERENCES age_groups(id),
  entry_size VARCHAR(50),  -- "Solo", "Small Group (5)"

  -- Scheduling
  session_number INTEGER,
  performance_time TIME,
  duration DECIMAL(4,2),  -- Duration in minutes (2.75)
  heat VARCHAR(50),

  -- Advanced features
  is_title_upgrade BOOLEAN DEFAULT FALSE,
  upgrades TEXT,
  award_info TEXT,

  -- Linking for running order
  previous_entry_id UUID REFERENCES competition_entries(id),
  next_entry_id UUID REFERENCES competition_entries(id),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Entry participants with enhanced tracking
CREATE TABLE entry_participants (
  id UUID PRIMARY KEY,
  entry_id UUID REFERENCES competition_entries(id),
  dancer_id UUID REFERENCES dancers(id),
  dancer_name VARCHAR(255),  -- Denormalized for performance
  display_order INTEGER
);

-- Scoring system
CREATE TABLE judges (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  name VARCHAR(255),
  specialization VARCHAR(100),
  judge_number INTEGER
);

CREATE TABLE scores (
  id UUID PRIMARY KEY,
  entry_id UUID REFERENCES competition_entries(id),
  judge_id UUID REFERENCES judges(id),
  technical_score DECIMAL(5,2),
  artistic_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  comments TEXT,
  scored_at TIMESTAMP DEFAULT NOW()
);

-- Awards and placements
CREATE TABLE awards (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  entry_id UUID REFERENCES competition_entries(id),
  award_type VARCHAR(100),  -- "1st Place", "High Score", "Title Winner"
  award_category VARCHAR(100),  -- Award grouping category
  placement INTEGER,
  special_recognition TEXT
);

-- Indexes for performance
CREATE INDEX idx_entries_competition ON competition_entries(competition_id);
CREATE INDEX idx_entries_studio ON competition_entries(studio_id);
CREATE INDEX idx_entries_sequence ON competition_entries(sequence_number);
CREATE INDEX idx_entries_session ON competition_entries(session_number);
CREATE INDEX idx_participants_entry ON entry_participants(entry_id);
CREATE INDEX idx_scores_entry ON scores(entry_id);
CREATE INDEX idx_scores_judge ON scores(judge_id);
```

### **Export Functionality Requirements**

1. **Studio Directory Export**
   - Filter by competition/location
   - Sort by studio code or name
   - Include/exclude contact information
   - Format for different use cases (programs, contact lists, etc.)

2. **Competition Lineup Export**
   - Sequential entry numbering
   - Group by category or running order
   - Include/exclude dancer names for privacy
   - Mark title rounds and special categories
   - Export for judges, video teams, programs

3. **Competition Scoring Summary Export**
   - Complete performance schedule with precise timing
   - Multi-session organization and heat management
   - Title upgrade and award tracking
   - Judge assignment and scoring infrastructure
   - Linked entry sequence for running order management
   - Dynamic age grouping and classification systems
   - Comprehensive award category management

4. **Advanced Competition Management Exports**
   - **Judge Scorecards**: Individual scoring sheets with entry details
   - **Session Management**: Time-based scheduling with duration tracking
   - **Award Ceremony Reports**: Placement and recognition tracking
   - **Video Production**: Sequenced performance lists for recording
   - **Studio Performance Analytics**: Historical performance tracking
   - **Revenue/Billing Reports**: Account-based competition fees
   - **Title Round Tracking**: Elite competition management

### **Modern Export Features to Implement**

```typescript
// Advanced Export service interface
interface ExportService {
  // Studio exports
  exportStudiosDirectory(competitionId: string, format: 'csv' | 'pdf' | 'json'): Promise<ExportResult>;
  exportStudioDetails(studioId: string, includeFinancials: boolean): Promise<ExportResult>;
  exportStudioPerformanceHistory(studioId: string, yearRange: DateRange): Promise<ExportResult>;

  // Competition lineup and management
  exportCompetitionLineup(competitionId: string, options: LineupExportOptions): Promise<ExportResult>;
  exportScoringsSummary(competitionId: string, options: ScoringExportOptions): Promise<ExportResult>;
  exportRunningOrder(competitionId: string, sessionId?: string): Promise<ExportResult>;
  exportSessionSchedule(competitionId: string, sessionNumber: number): Promise<ExportResult>;

  // Judging and scoring
  exportJudgingSheets(competitionId: string, options: JudgingExportOptions): Promise<ExportResult>;
  exportScoresByJudge(competitionId: string, judgeId: string): Promise<ExportResult>;
  exportScoresByCategory(competitionId: string, categoryId: string): Promise<ExportResult>;

  // Awards and recognition
  exportAwardsCeremony(competitionId: string, options: AwardsExportOptions): Promise<ExportResult>;
  exportTitleRoundResults(competitionId: string): Promise<ExportResult>;
  exportPlacementsByStudio(competitionId: string): Promise<ExportResult>;

  // Production and technical
  exportVideoProductionSchedule(competitionId: string): Promise<ExportResult>;
  exportSoundCueSheet(competitionId: string, sessionId?: string): Promise<ExportResult>;
  exportBackstageSchedule(competitionId: string): Promise<ExportResult>;

  // Dancer and participant tracking
  exportDancerRoster(studioId: string, competitionId?: string): Promise<ExportResult>;
  exportParticipantList(competitionId: string, privacy: 'full' | 'limited'): Promise<ExportResult>;
  exportDancerPerformanceHistory(dancerId: string): Promise<ExportResult>;

  // Administrative and business intelligence
  exportFinancialReport(competitionId: string, dateRange: DateRange): Promise<ExportResult>;
  exportRegistrationStats(competitionId: string): Promise<ExportResult>;
  exportCompetitionAnalytics(competitionId: string): Promise<ExportResult>;
  exportStudioBillingReport(studioId: string, dateRange: DateRange): Promise<ExportResult>;
}

interface ScoringExportOptions extends BaseExportOptions {
  includeScores: boolean;
  includeJudgeComments: boolean;
  groupBySession: boolean;
  showTitleUpgrades: boolean;
  includeTimingDetails: boolean;
  filterByClassification: string[];  // "Titanium", "Crystal"
  filterByAgeGroup: string[];
  filterByCategory: string[];
}

interface JudgingExportOptions extends BaseExportOptions {
  judgeId?: string;
  sessionNumber?: number;
  includeScoreSheets: boolean;
  includeBlankSheets: boolean;  // For pre-competition
  categoryBreakdown: boolean;
}

interface AwardsExportOptions extends BaseExportOptions {
  includeOverallPlacements: boolean;
  includeTitleWinners: boolean;
  includeSpecialRecognition: boolean;
  groupByAwardCategory: boolean;
  formatForCeremony: boolean;  // Special formatting for awards ceremony
}

interface LineupExportOptions {
  includeDancerNames: boolean;
  groupByCategory: boolean;
  includeStudioDetails: boolean;
  markTitleRounds: boolean;
  format: 'csv' | 'pdf' | 'json';
}
```

## Data Quality Improvements

### **Issues Found in Legacy Data**:
1. **Province validation**: "TRUE" instead of proper province code
2. **Inconsistent formatting**: Phone numbers, postal codes
3. **Missing data**: Empty fields in some records
4. **Text encoding**: Potential issues with accented characters

### **Recommended Improvements**:
1. **Strict validation** - Province/state dropdowns with proper codes
2. **Phone formatting** - Consistent (XXX) XXX-XXXX format
3. **Postal code validation** - Format validation for different countries
4. **Required fields** - Enforce mandatory data for exports
5. **UTF-8 encoding** - Proper character handling for names

## Export Performance Considerations

### **Scalability Requirements**:
- **Large competitions**: 400+ entries, 30+ studios
- **Real-time updates**: Live competition changes
- **Multiple formats**: CSV, PDF, JSON, Excel
- **Concurrent access**: Multiple users exporting simultaneously

### **Optimization Strategies**:
```typescript
// Caching strategy for frequently accessed exports
const exportCache = new Map<string, CachedExport>();

// Background job processing for large exports
interface ExportJob {
  id: string;
  type: ExportType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  expiresAt: Date;
}

// Streaming for large datasets
async function streamCompetitionExport(
  competitionId: string,
  format: ExportFormat,
  response: Response
): Promise<void> {
  const stream = createExportStream(competitionId, format);
  return pipeline(stream, response);
}
```

## Integration Points

### **Current System Integration**:
- **Studio codes** must match across all exports
- **Entry numbering** needs to be maintained throughout competition
- **Dancer names** must be consistent across multiple entries
- **Category formats** standardized across all competition materials

### **Modern Platform Integration**:
- **API endpoints** for real-time export generation
- **Webhook notifications** when export jobs complete
- **Permission controls** - different export access levels
- **Audit logging** - track who downloaded what when
- **Version control** - track export format changes over time

---

## Business Impact

These exports reveal a **sophisticated competition management system** handling:
- **Multi-studio coordination** across provinces/states
- **Complex performance categorization** with 400+ individual entries
- **Professional competition production** requiring detailed participant tracking
- **Title round management** for championship levels
- **Video production support** with structured performance data

The modern rebuild must **maintain this level of detail** while improving:
- Data quality and validation
- Export performance and scalability
- User experience for export generation
- Integration with modern competition production tools

This analysis demonstrates the system serves **serious competitive dance events** requiring professional-grade data management and export capabilities.