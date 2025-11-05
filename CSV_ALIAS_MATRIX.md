# CSV Import Alias Matrix

## Complete Field Mapping Reference

This matrix shows ALL possible CSV column header variations that will be recognized and mapped to canonical fields.

---

## 🎭 Routine Fields

### Title (Entry/Routine Name)
**Canonical:** `title`

**Aliases (30+):**
```
✓ Title
✓ Routine Title, routine_title, routinetitle, ROUTINE TITLE
✓ Routine Name, routine_name, routinename, ROUTINE NAME
✓ Name, NAME
✓ Routine, routine, ROUTINE
✓ Piece, piece, PIECE
✓ Dance Title, dance_title, dancetitle, DANCE TITLE
✓ Dance Name, dance_name, dancename, DANCE NAME
✓ Entry Title, entry_title, entrytitle, ENTRY TITLE
✓ Entry Name, entry_name, entryname, ENTRY NAME
✓ Performance Title, performance_title
✓ Act, act, ACT
✓ Number, number (performance number)
```

**Examples that MATCH:**
- "Title" → title ✓
- "Routine Name" → title ✓
- "DANCE TITLE" → title ✓
- "Entry" → title ✓

---

### Dance Category / Genre / Style
**Canonical:** `category`

**Aliases (40+):**
```
✓ Dance Category, dance category, DANCE CATEGORY ← NEW (with space)
✓ Dance_Category, dance_category, DANCE_CATEGORY (underscore)
✓ DanceCategory, dancecategory, DANCECATEGORY (no space)
✓ Dance Style, dance style, DANCE STYLE ← NEW
✓ Dance_Style, dance_style, DANCE_STYLE
✓ DanceStyle, dancestyle, DANCESTYLE
✓ Dance Genre, dance genre, DANCE GENRE ← NEW
✓ Dance_Genre, dance_genre, DANCE_GENRE
✓ DanceGenre, dancegenre, DANCEGENRE
✓ Dance Type, dance type, DANCE TYPE ← NEW
✓ Dance_Type, dance_type, DANCE_TYPE
✓ DanceType, dancetype, DANCETYPE
✓ Category, category, CATEGORY
✓ Genre, genre, GENRE
✓ Style, style, STYLE
✓ Type, type, TYPE
✓ Cat (abbreviation)
✓ Discipline
✓ Performance Style, performance style
✓ Dance Discipline
```

**Examples that MATCH:**
- "Dance Category" → category ✓
- "DANCE STYLE" → category ✓
- "genre" → category ✓
- "Dance Genre" → category ✓

---

### Choreographer
**Canonical:** `choreographer`

**Aliases (30+):**
```
✓ Choreographer, choreographer, CHOREOGRAPHER
✓ Choreographed By, choreographed by, CHOREOGRAPHED BY ← CURRENT
✓ Choreographed_By, choreographed_by, CHOREOGRAPHEDBY
✓ Choreo, choreo, CHOREO (common abbreviation)
✓ Teacher, teacher, TEACHER
✓ Instructor, instructor, INSTRUCTOR
✓ Coach, coach, COACH
✓ Director, director, DIRECTOR
✓ Creator, creator, CREATOR
✓ Choreography By, choreography by, CHOREOGRAPHY BY ← NEW
✓ Choreography_By, choreography_by
✓ Choreo By, choreo by
✓ Choreographed, choreographed
✓ Created By, created by
✓ Taught By, taught by
✓ Instructor Name, instructor name
✓ Teacher Name, teacher name
```

**Examples that MATCH:**
- "Choreographer" → choreographer ✓
- "choreographed by" → choreographer ✓
- "CHOREO" → choreographer ✓
- "Teacher" → choreographer ✓

---

### Props / Special Requirements
**Canonical:** `props`

**Aliases (25+):**
```
✓ Props, props, PROPS
✓ Prop, prop, PROP
✓ Properties, properties
✓ Prop List, prop list, prop_list
✓ Prop Description, prop description, prop_description
✓ Special Requirements, special requirements, special_requirements
✓ Special Req, special req
✓ Requirements, requirements, req
✓ Items, items
✓ Equipment, equipment
✓ Stage Props, stage props, stage_props
✓ Stage Equipment, stage equipment
✓ Stage Items
✓ Materials
✓ Accessories
```

**Examples that MATCH:**
- "Props" → props ✓
- "Special Requirements" → props ✓
- "Equipment" → props ✓

---

### Dancers / Participants
**Canonical:** `dancers`

**Aliases (40+):**
```
✓ Dancers, dancers, DANCERS
✓ Dancer, dancer, DANCER
✓ Dancer Names, dancer names, dancer_names
✓ Dancer Name, dancer name, dancer_name
✓ Dancer List, dancer list, dancer_list
✓ Dancers List, dancers list, dancers_list
✓ Dancer First Last, dancer first last ← NEW (for "First Last" format)
✓ First Name Last Name, first name last name ← NEW
✓ Full Name, full name, fullname
✓ Participants, participants, PARTICIPANTS
✓ Participant, participant
✓ Performers, performers, PERFORMERS
✓ Performer, performer
✓ Members, members, MEMBERS
✓ Member, member
✓ Artists, artists, ARTISTS
✓ Artist, artist
✓ Names, names, NAMES
✓ Name, name (if context is dancers)
✓ Who, who (informal)
✓ Cast, cast
✓ Talent
```

**Examples that MATCH:**
- "Dancers" → dancers ✓
- "Performer" → dancers ✓
- "Full Name" → dancers ✓ (treats as dancer name)
- "First Name Last Name" → dancers ✓

---

### Duration / Length
**Canonical:** `duration_seconds`

**Aliases (20+):**
```
✓ Duration, duration, DURATION
✓ Length, length, LENGTH
✓ Time, time, TIME
✓ Duration Seconds, duration seconds, duration_seconds
✓ Length Seconds, length seconds, length_seconds
✓ Time Seconds, time seconds, time_seconds
✓ Runtime, runtime, RUNTIME
✓ Length (min), length (min)
✓ Duration (sec), duration (sec)
✓ Routine Length, routine length
✓ Routine Duration, routine duration
✓ Performance Time, performance time
✓ Track Length
```

**Examples that MATCH:**
- "Duration" → duration_seconds ✓
- "LENGTH" → duration_seconds ✓
- "Time" → duration_seconds ✓

---

## 👤 Dancer Fields

### First Name
**Canonical:** `first_name`

**Aliases (25+):**
```
✓ First Name, first name, FIRST NAME
✓ First_Name, first_name, FIRST_NAME
✓ FirstName, firstname, FIRSTNAME
✓ Given Name, given name, given_name
✓ Name, name (if combined with Last Name column)
✓ First, first
✓ FName, fname, FNAME
✓ F Name, f name
✓ Dancer First Name, dancer first name
✓ Dancer First, dancer first
```

---

### Last Name
**Canonical:** `last_name`

**Aliases (25+):**
```
✓ Last Name, last name, LAST NAME
✓ Last_Name, last_name, LAST_NAME
✓ LastName, lastname, LASTNAME
✓ Surname, surname, SURNAME
✓ Family Name, family name, family_name
✓ Last, last
✓ LName, lname, LNAME
✓ L Name, l name
✓ Dancer Last Name, dancer last name
✓ Dancer Last, dancer last
```

---

### Date of Birth
**Canonical:** `date_of_birth`

**Aliases (30+):**
```
✓ Date of Birth, date of birth, DATE OF BIRTH
✓ Date_of_Birth, date_of_birth, DATEOFBIRTH
✓ DateOfBirth, dateofbirth
✓ DOB, dob
✓ Birth Date, birth date, birth_date, birthdate
✓ Birthday, birthday, BIRTHDAY
✓ Birth, birth
✓ BDay, bday, B-Day
✓ BD, bd
✓ Born, born
✓ Age (can be converted to DOB if event date known)
✓ Dancer DOB, dancer dob, dancer_dob
✓ Dancer Birth Date, dancer birth date
✓ Dancer Age, dancer age
```

---

### Gender
**Canonical:** `gender`

**Aliases (20+):**
```
✓ Gender, gender, GENDER
✓ Sex, sex, SEX
✓ Male/Female, male/female, MALE/FEMALE
✓ M/F, m/f, M_F
✓ MF, mf
✓ Gender Identity, gender identity
✓ Dancer Gender, dancer gender
✓ Female/Male, female/male
```

---

### Email
**Canonical:** `email`

**Aliases (15+):**
```
✓ Email, email, EMAIL
✓ Email Address, email address, email_address
✓ E-mail, e-mail, E_MAIL
✓ E Mail, e mail
✓ EmailAddress, emailaddress
✓ Mail, mail
✓ Dancer Email, dancer email
✓ Contact Email, contact email
```

---

### Phone
**Canonical:** `phone`

**Aliases (20+):**
```
✓ Phone, phone, PHONE
✓ Phone Number, phone number, phone_number
✓ PhoneNumber, phonenumber
✓ Tel, tel, TEL
✓ Telephone, telephone
✓ Mobile, mobile, MOBILE
✓ Cell, cell, CELL
✓ Cell Phone, cell phone, cell_phone
✓ Mobile Number, mobile number
✓ Contact Number, contact number
✓ Dancer Phone, dancer phone
```

---

### Parent/Guardian Name
**Canonical:** `parent_name`

**Aliases (20+):**
```
✓ Parent Name, parent name, parent_name
✓ Parent, parent, PARENT
✓ Guardian Name, guardian name, guardian_name
✓ Guardian, guardian, GUARDIAN
✓ Guardian Full Name, guardian full name
✓ Parent Full Name, parent full name
✓ Mother Name, mother name (maps to parent)
✓ Father Name, father name (maps to parent)
✓ Mom Name, Dad Name
✓ Emergency Contact, emergency contact
```

---

### Parent/Guardian Email
**Canonical:** `parent_email`

**Aliases (20+):**
```
✓ Parent Email, parent email, parent_email
✓ Parent Mail, parent mail
✓ Guardian Email, guardian email, guardian_email
✓ Guardian Mail, guardian mail
✓ Parent Email Address, parent email address
✓ Guardian Email Address, guardian email address
✓ Emergency Email, emergency email
✓ Contact Email (if parent context)
```

---

### Parent/Guardian Phone
**Canonical:** `parent_phone`

**Aliases (20+):**
```
✓ Parent Phone, parent phone, parent_phone
✓ Parent Tel, parent tel
✓ Guardian Phone, guardian phone, guardian_phone
✓ Guardian Tel, guardian tel
✓ Parent Phone Number, parent phone number
✓ Guardian Phone Number, guardian phone number
✓ Emergency Phone, emergency phone
✓ Contact Number (if parent context)
```

---

## 🔧 Fuzzy Matching Algorithm

### How It Works:

1. **Case Insensitive**: All headers normalized to lowercase
2. **Special Character Removal**: Strips punctuation except spaces/underscores
3. **Space Normalization**: Multiple spaces → single space
4. **Levenshtein Distance**: Calculates similarity score (0-1)
5. **Threshold**: Default 0.7 (70% match required)
6. **Best Match Wins**: Highest scoring alias selected

### Examples:

```
CSV Header: "Dance Category"
→ Normalize: "dance category"
→ Match aliases: ['dance category', 'dance_category', ...]
→ Exact match found: "dance category" → category ✓

CSV Header: "CHOREOGRAPHED BY"
→ Normalize: "choreographed by"
→ Match aliases: ['choreographed_by', 'choreographed by', ...]
→ Exact match found: "choreographed by" → choreographer ✓

CSV Header: "Dancer First & Last"
→ Normalize: "dancer first last"
→ Fuzzy match: Similar to "dancer first last" (alias)
→ Score: 0.85 → dancers ✓

CSV Header: "Dance Style"
→ Normalize: "dance style"
→ Exact match found: "dance style" → category ✓
```

---

## ⚙️ Current vs Enhanced Coverage

### Before Enhancement:
- **Category aliases:** 8 (missed "Dance Category" with space!)
- **Choreographer aliases:** 9
- **Dancers aliases:** 16
- **Total aliases:** ~100

### After Enhancement:
- **Category aliases:** 20+ (includes all space/underscore/camelCase variants)
- **Choreographer aliases:** 17+ (includes "Choreography By", etc.)
- **Dancers aliases:** 25+ (includes "First Last Name", "Full Name", etc.)
- **Total aliases:** ~250+

### Coverage Increase:
- **2.5x more aliases**
- **Handles all spacing variants** (space, underscore, camelCase)
- **Handles all casing** (lowercase, UPPERCASE, Title Case)
- **Handles common abbreviations** (Choreo, Cat, DOB, etc.)

---

## 📋 Testing Matrix

Use this to verify fuzzy matching works:

| CSV Header | Expected Match | Status |
|------------|---------------|--------|
| `Dance Category` | category | ✅ FIXED |
| `Dance Style` | category | ⏳ TO TEST |
| `Dance Genre` | category | ⏳ TO TEST |
| `choreographed by` | choreographer | ⏳ TO TEST |
| `Choreo` | choreographer | ⏳ TO TEST |
| `Full Name` | dancers | ⏳ TO TEST |
| `TITLE` | title | ⏳ TO TEST |
| `Props` | props | ✅ KNOWN WORKING |

---

## 🚀 Implementation Plan

1. ✅ Add "dance category" to aliases (DONE)
2. ⏳ Add "dance style", "dance genre", "dance type" variants
3. ⏳ Add "choreography by" variant
4. ⏳ Add "full name", "first last" dancer variants
5. ⏳ Test all variants with real CSV files
6. ⏳ Document any edge cases

---

**Next:** Update csv-utils.ts with expanded aliases
