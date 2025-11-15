# CompPortal Phase 1: Registration - Implementation Specification

**For:** Claude Code / Development Team  
**Status:** ✅ Finalized and Ready for Implementation  
**Last Updated:** October 24, 2025

---

## Quick Reference

**Phase Duration:** ~3 months  
**Primary Goal:** Manage event setup, studio registration, entry slot reservations, and invoice generation  
**Access Roles:** Competition Director (CD), Studio Director (SD)

---

## Core Business Principles

1. **Capacity = Number of Entries** (not dancers, not routines)
2. **Multiple Reservations Allowed** (same studio can have multiple reservations per event)
3. **Summary Triggers Invoice** (not the initial reservation approval)
4. **Immediate Capacity Refund** (unused entries return to capacity when summary submitted)
5. **Payment Required for Phase 2** (but also gated by calendar date)
6. **Entries Convert to Routines** (happens in Phase 2)

---

## Data Model

### Events Table
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    capacity_entries INT NOT NULL,
    remaining_capacity INT NOT NULL,
    planning_phase_start TIMESTAMP NOT NULL,
    competition_settings_id UUID REFERENCES competition_settings(id),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Status: draft | registration_open | registration_closed | planning | live | completed
```

**Derived Field:**
```python
def calculate_remaining_capacity(event_id):
    """
    remaining_capacity = initial_capacity 
                       - SUM(approved_entries) 
                       + SUM(refunded_entries_from_summaries)
    """
    event = Event.get(id=event_id)
    approved = Reservation.filter(
        event_id=event_id,
        status__in=['approved', 'adjusted', 'summarized', 'invoiced', 'closed']
    ).aggregate(Sum('entries_approved'))
    
    refunded = Summary.filter(
        reservation__event_id=event_id
    ).aggregate(Sum('entries_unused'))
    
    return event.capacity_entries - (approved or 0) + (refunded or 0)
```

---

### Competition Settings Table
```sql
CREATE TABLE competition_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_entry_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    title_upgrade_fee DECIMAL(10,2) NOT NULL DEFAULT 30.00,
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.13,
    age_divisions JSONB NOT NULL,
    levels JSONB NOT NULL,
    categories JSONB NOT NULL,
    styles JSONB NOT NULL,
    group_size_rules JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**JSONB Structure Examples:**
```json
{
  "age_divisions": [
    {"id": "uuid", "name": "Mini", "min_age": 5, "max_age": 8},
    {"id": "uuid", "name": "Petite", "min_age": 9, "max_age": 11},
    {"id": "uuid", "name": "Junior", "min_age": 12, "max_age": 14},
    {"id": "uuid", "name": "Teen", "min_age": 15, "max_age": 17},
    {"id": "uuid", "name": "Senior", "min_age": 18, "max_age": 99}
  ],
  "levels": [
    {"id": "uuid", "name": "Recreational"},
    {"id": "uuid", "name": "Competitive"},
    {"id": "uuid", "name": "Elite"}
  ],
  "categories": [
    {"id": "uuid", "name": "Performance"},
    {"id": "uuid", "name": "Championship"}
  ],
  "styles": [
    {"id": "uuid", "name": "Jazz"},
    {"id": "uuid", "name": "Contemporary"},
    {"id": "uuid", "name": "Ballet"},
    {"id": "uuid", "name": "Hip Hop"},
    {"id": "uuid", "name": "Tap"}
  ],
  "group_size_rules": {
    "solo": 1,
    "duo": 2,
    "trio": 3,
    "small_max": 9,
    "large_min": 10
  }
}
```

**Important:** Settings are immutable once event registration opens (version per event).

---

### Studios Table
```sql
CREATE TABLE studios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_user_id UUID REFERENCES users(id),
    contact_email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### Dancers Table
```sql
CREATE TABLE dancers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT dancers_studio_unique UNIQUE(studio_id, name, date_of_birth)
);

CREATE INDEX idx_dancers_studio ON dancers(studio_id);
```

**Business Rule:** Dancers must exist before entries can be created.

---

### Reservations Table
```sql
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    studio_id UUID REFERENCES studios(id),
    entries_requested INT NOT NULL CHECK (entries_requested > 0),
    entries_approved INT CHECK (entries_approved > 0),
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by_user_id UUID REFERENCES users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reservations_event_submitted ON reservations(event_id, submitted_at);
CREATE INDEX idx_reservations_studio_event ON reservations(studio_id, event_id);

-- Status: pending | approved | rejected | adjusted | summarized | invoiced | closed
```

**State Transitions:**
```
pending → approved (CD approves full amount)
pending → adjusted (CD approves partial amount)
pending → rejected (CD rejects)
approved/adjusted → summarized (SD submits summary)
summarized → invoiced (CD creates invoice)
invoiced → closed (CD marks invoice paid)
```

**Business Rule:** Multiple reservations per (studio_id, event_id) are allowed.

---

### Entries Table
```sql
CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    routine_name VARCHAR(255) NOT NULL,
    choreographer_name VARCHAR(255),
    event_id UUID REFERENCES events(id),
    category_id UUID NOT NULL,
    level_id UUID NOT NULL,
    style_id UUID NOT NULL,
    props_details TEXT,
    age_division_id UUID NOT NULL,
    group_size_category VARCHAR(20) NOT NULL,
    title_upgrade BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    CONSTRAINT entries_title_upgrade_solo_only 
        CHECK (NOT title_upgrade OR group_size_category = 'solo')
);

CREATE INDEX idx_entries_reservation ON entries(reservation_id);
CREATE INDEX idx_entries_event ON entries(event_id);
CREATE INDEX idx_entries_status ON entries(status);

-- Status: draft | submitted | invoiced | routine_created
-- Group Size: solo | duo | trio | small | large
```

**Edit Permissions by Status:**
| Field | draft | submitted | invoiced |
|-------|-------|-----------|----------|
| routine_name, choreographer_name, dancers | ✅ | ✅ | ✅ |
| category, level, style, props, title_upgrade | ✅ | ❌ | ❌ |
| Delete | Self-serve | CD approval | CD approval |

---

### Entry Dancers Junction Table
```sql
CREATE TABLE entry_dancers (
    entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
    dancer_id UUID REFERENCES dancers(id),
    PRIMARY KEY (entry_id, dancer_id)
);

CREATE INDEX idx_entry_dancers_entry ON entry_dancers(entry_id);
CREATE INDEX idx_entry_dancers_dancer ON entry_dancers(dancer_id);
```

**Constraint:** At least 1 dancer required per entry.

---

### Summaries Table
```sql
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) UNIQUE,
    entries_used INT NOT NULL CHECK (entries_used >= 0),
    entries_unused INT NOT NULL CHECK (entries_unused >= 0),
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT summaries_total_check 
        CHECK (entries_used + entries_unused = 
               (SELECT entries_approved FROM reservations 
                WHERE id = reservation_id))
);
```

**Business Rule:** One summary per reservation (1:1 relationship).

---

### Summary Entries Junction Table
```sql
CREATE TABLE summary_entries (
    summary_id UUID REFERENCES summaries(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES entries(id),
    snapshot JSONB NOT NULL,
    PRIMARY KEY (summary_id, entry_id)
);
```

**Purpose:** Immutable audit trail of which entries were included in summary.

---

### Invoices Table
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id),
    subtotal DECIMAL(10,2) NOT NULL,
    discount_percent INT DEFAULT 0 CHECK (discount_percent IN (0, 5, 10, 15)),
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    credits JSONB DEFAULT '[]',
    tax_amount DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status VARCHAR(20) DEFAULT 'issued' NOT NULL,
    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMP,
    payment_method VARCHAR(100),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_reservation ON invoices(reservation_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Status: issued | paid | void
-- Credits JSONB: [{"amount": 200.00, "label": "Deposit 2024", "applied_at": "ISO8601"}]
```

**Notes Field:** Internal CD-only, NOT visible to SD on invoice download.

---

## Business Process Flows

### 1. Dancer Management (Pre-Reservation)

**Manual Entry:**
```python
def add_dancer(studio_id, name, dob, gender=None):
    # Check for duplicates (case-insensitive name)
    existing = Dancer.filter(
        studio_id=studio_id,
        name__iexact=name,
        date_of_birth=dob
    ).first()
    
    if existing:
        raise ValidationError(f"Dancer '{name}' with DOB {dob} already exists")
    
    return Dancer.create(
        studio_id=studio_id,
        name=name,
        date_of_birth=dob,
        gender=gender
    )
```

**Bulk Import:**
```python
def import_dancers_csv(studio_id, file):
    """
    CSV Format: name,dob,gender
    Returns: {added: int, skipped: int, errors: [str]}
    """
    results = {'added': 0, 'skipped': 0, 'errors': []}
    
    existing_dancers = Dancer.filter(studio_id=studio_id).values_list(
        'name', 'date_of_birth'
    )
    existing_set = {(n.lower(), dob) for n, dob in existing_dancers}
    
    for row_num, row in enumerate(parse_csv(file), start=2):
        try:
            name = row['name'].strip()
            dob = parse_date(row['dob'])
            gender = row.get('gender', '').strip() or None
            
            # Validate
            if not name:
                results['errors'].append(f"Row {row_num}: Name is required")
                continue
            if not dob or dob > today():
                results['errors'].append(f"Row {row_num}: Invalid date of birth")
                continue
            
            # Check duplicate
            if (name.lower(), dob) in existing_set:
                results['skipped'] += 1
                continue
            
            # Create
            Dancer.create(studio_id=studio_id, name=name, date_of_birth=dob, gender=gender)
            existing_set.add((name.lower(), dob))
            results['added'] += 1
            
        except Exception as e:
            results['errors'].append(f"Row {row_num}: {str(e)}")
    
    return results
```

---

### 2. Reservation Submission

```python
def submit_reservation(studio_id, event_id, entries_requested):
    # Validation
    if entries_requested <= 0:
        raise ValidationError("Must request at least 1 entry")
    
    with transaction():
        # Row-level lock to prevent race conditions
        event = Event.objects.select_for_update().get(id=event_id)
        
        if entries_requested > event.remaining_capacity:
            raise InsufficientCapacityError(
                f"Only {event.remaining_capacity} entries available"
            )
        
        reservation = Reservation.create(
            event_id=event_id,
            studio_id=studio_id,
            entries_requested=entries_requested,
            status='pending',
            submitted_at=now()
        )
        
        # Capacity NOT deducted yet - only on approval
        
        # Send notification
        send_email(
            to=event.cd_email,
            template='reservation_submitted',
            context={
                'studio_name': studio.name,
                'event_name': event.name,
                'entries_requested': entries_requested,
                'review_link': f'/admin/reservations/{reservation.id}/review'
            }
        )
        
        return reservation
```

---

### 3. Reservation Review (CD)

```python
def approve_reservation(reservation_id, entries_approved=None):
    reservation = Reservation.get(id=reservation_id)
    
    if entries_approved is None:
        entries_approved = reservation.entries_requested
    
    with transaction():
        event = Event.objects.select_for_update().get(id=reservation.event_id)
        
        if entries_approved > event.remaining_capacity:
            raise InsufficientCapacityError(
                f"Cannot approve {entries_approved} - only {event.remaining_capacity} available"
            )
        
        reservation.entries_approved = entries_approved
        reservation.status = 'approved' if entries_approved == reservation.entries_requested else 'adjusted'
        reservation.reviewed_at = now()
        reservation.reviewed_by_user_id = current_user.id
        reservation.save()
        
        # Deduct capacity NOW
        event.remaining_capacity -= entries_approved
        event.save()
        
        send_email(
            to=reservation.studio.contact_email,
            template='reservation_approved',
            context={
                'event_name': event.name,
                'entries_approved': entries_approved,
                'entries_requested': reservation.entries_requested,
                'create_entries_link': f'/events/{event.id}/entries/create'
            }
        )

def reject_reservation(reservation_id, rejection_reason):
    if len(rejection_reason) < 20:
        raise ValidationError("Rejection reason must be at least 20 characters")
    
    reservation = Reservation.get(id=reservation_id)
    reservation.status = 'rejected'
    reservation.rejection_reason = rejection_reason
    reservation.reviewed_at = now()
    reservation.reviewed_by_user_id = current_user.id
    reservation.save()
    
    send_email(
        to=reservation.studio.contact_email,
        template='reservation_rejected',
        context={
            'event_name': reservation.event.name,
            'reason': rejection_reason
        }
    )
```

---

### 4. Entry Creation (3-Step Process)

**Step 1: Basic Details**
```python
def validate_entry_quota(reservation_id):
    reservation = Reservation.get(id=reservation_id)
    
    if reservation.status not in ['approved', 'adjusted']:
        raise ValidationError("Reservation not approved")
    
    active_entries = Entry.count(
        reservation_id=reservation_id,
        deleted_at=None
    )
    
    if active_entries >= reservation.entries_approved:
        raise ValidationError(
            f"Entry limit reached: {active_entries} of {reservation.entries_approved} used"
        )
    
    dancer_count = Dancer.count(studio_id=reservation.studio_id)
    if dancer_count == 0:
        raise ValidationError("Must add dancers before creating entries")
```

**Step 2: Add Dancers**
```python
def add_dancers_to_entry(entry_id, dancer_ids):
    if not dancer_ids:
        raise ValidationError("Must select at least 1 dancer")
    
    # Verify all dancers belong to same studio
    entry = Entry.get(id=entry_id)
    studio_id = entry.reservation.studio_id
    
    dancers = Dancer.filter(id__in=dancer_ids, studio_id=studio_id)
    if len(dancers) != len(dancer_ids):
        raise ValidationError("Invalid dancer selection")
    
    for dancer in dancers:
        EntryDancer.create(entry_id=entry_id, dancer_id=dancer.id)
```

**Step 3: Auto-Calculate and Create**
```python
def calculate_entry_metadata(entry_id, competition_year):
    entry = Entry.get(id=entry_id)
    dancers = entry.dancers.all()

    # Age division (youngest dancer)
    # BUSINESS RULE: Ages calculated as of December 31st of registration year
    # NOT based on competition date - this is standard competition practice
    youngest_dob = min(d.date_of_birth for d in dancers)
    dec_31_reference = datetime(competition_year, 12, 31).date()
    age_at_dec_31 = (dec_31_reference - youngest_dob).days // 365

    age_divisions = entry.event.competition_settings.age_divisions
    age_division = next(
        (div for div in age_divisions
         if div['min_age'] <= age_at_dec_31 <= div['max_age']),
        None
    )

    if not age_division:
        raise ValidationError(f"No age division found for age {age_at_dec_31}")
    
    # Group size
    dancer_count = len(dancers)
    if dancer_count == 1:
        group_size = 'solo'
    elif dancer_count == 2:
        group_size = 'duo'
    elif dancer_count == 3:
        group_size = 'trio'
    elif dancer_count <= 9:
        group_size = 'small'
    else:
        group_size = 'large'
    
    # Update entry
    entry.age_division_id = age_division['id']
    entry.group_size_category = group_size
    entry.save()
    
    return entry
```

---

### 5. Summary Submission

```python
def submit_summary(reservation_id):
    with transaction():
        reservation = Reservation.get(id=reservation_id)
        
        if reservation.status not in ['approved', 'adjusted']:
            raise ValidationError("Reservation not approved")
        
        if Summary.exists(reservation_id=reservation_id):
            raise ValidationError("Summary already submitted")
        
        entries = Entry.filter(reservation_id=reservation_id, deleted_at=None)
        entries_used = len(entries)
        
        if entries_used == 0:
            raise ValidationError("Must create at least 1 entry before submitting summary")
        
        entries_unused = reservation.entries_approved - entries_used
        
        # Create summary
        summary = Summary.create(
            reservation_id=reservation_id,
            entries_used=entries_used,
            entries_unused=entries_unused,
            submitted_at=now()
        )
        
        # Create audit trail
        for entry in entries:
            SummaryEntry.create(
                summary_id=summary.id,
                entry_id=entry.id,
                snapshot=entry.to_json()
            )
            entry.status = 'submitted'
            entry.save()
        
        # Update reservation
        reservation.status = 'summarized'
        reservation.save()
        
        # IMMEDIATE capacity refund
        event = Event.objects.select_for_update().get(id=reservation.event_id)
        event.remaining_capacity += entries_unused
        event.save()
        
        # Notify CD
        send_email(
            to=event.cd_email,
            template='summary_submitted',
            context={
                'studio_name': reservation.studio.name,
                'event_name': event.name,
                'entries_used': entries_used,
                'entries_unused': entries_unused,
                'create_invoice_link': f'/admin/invoices/create?reservation_id={reservation_id}'
            }
        )
        
        return summary
```

---

### 6. Invoice Generation

```python
def calculate_invoice(reservation_id, discount_percent=0, credits=[]):
    """
    credits = [
        {"amount": 200.00, "label": "Deposit from 2024"},
        {"amount": 50.00, "label": "Referral bonus"}
    ]
    """
    summary = Summary.get(reservation_id=reservation_id)
    event = Reservation.get(id=reservation_id).event
    settings = event.competition_settings
    
    # Base entries
    base_cost = summary.entries_used * settings.global_entry_fee
    
    # Title upgrades (solo only)
    title_upgrades = Entry.count(
        reservation_id=reservation_id,
        title_upgrade=True,
        group_size_category='solo',
        deleted_at=None
    )
    upgrade_cost = title_upgrades * settings.title_upgrade_fee
    
    subtotal = base_cost + upgrade_cost
    
    # Discount
    if discount_percent not in [0, 5, 10, 15]:
        raise ValidationError("Discount must be 0, 5, 10, or 15 percent")
    discount_amount = round(subtotal * (discount_percent / 100), 2)
    
    # Credits
    credit_total = sum(Decimal(c['amount']) for c in credits)
    for credit in credits:
        if len(credit['label']) < 5:
            raise ValidationError("Credit label must be at least 5 characters")
    
    # Taxable amount
    taxable_amount = subtotal - discount_amount - credit_total
    if taxable_amount < 0:
        raise ValidationError(
            f"Credits (${credit_total}) and discount (${discount_amount}) "
            f"exceed subtotal (${subtotal})"
        )
    
    # Tax
    tax_amount = round(taxable_amount * settings.tax_rate, 2)
    
    # Total
    total = taxable_amount + tax_amount
    
    return {
        'subtotal': subtotal,
        'discount_percent': discount_percent,
        'discount_amount': discount_amount,
        'credits': credits,
        'tax_amount': tax_amount,
        'total': total,
        'line_items': {
            'base_entries': summary.entries_used,
            'entry_fee': settings.global_entry_fee,
            'title_upgrades': title_upgrades,
            'title_upgrade_fee': settings.title_upgrade_fee
        }
    }

def create_invoice(reservation_id, discount_percent=0, credits=[], notes=''):
    calc = calculate_invoice(reservation_id, discount_percent, credits)
    
    with transaction():
        reservation = Reservation.get(id=reservation_id)
        
        if reservation.status != 'summarized':
            raise ValidationError("Summary not submitted")
        
        if Invoice.exists(reservation_id=reservation_id):
            raise ValidationError("Invoice already exists")
        
        # Add timestamps to credits
        credits_with_timestamp = [
            {**credit, 'applied_at': now().isoformat()}
            for credit in credits
        ]
        
        invoice = Invoice.create(
            reservation_id=reservation_id,
            subtotal=calc['subtotal'],
            discount_percent=discount_percent,
            discount_amount=calc['discount_amount'],
            credits=credits_with_timestamp,
            tax_amount=calc['tax_amount'],
            total=calc['total'],
            status='issued',
            issued_at=now(),
            notes=notes,
            created_by_user_id=current_user.id
        )
        
        # Update reservation
        reservation.status = 'invoiced'
        reservation.save()
        
        # Update entries
        Entry.filter(reservation_id=reservation_id, deleted_at=None).update(
            status='invoiced'
        )
        
        # Notify studio
        send_email(
            to=reservation.studio.contact_email,
            template='invoice_created',
            context={
                'event_name': reservation.event.name,
                'invoice_number': invoice.id,
                'total': calc['total'],
                'download_link': f'/invoices/{invoice.id}/download'
            }
        )
        
        return invoice
```

---

### 7. Payment Confirmation

```python
def mark_invoice_paid(invoice_id, payment_method, reference, payment_date=None, notes=''):
    """
    payment_method: One of ['Check', 'Wire Transfer', 'Cash', 'E-transfer', 'Other']
    reference: Check number, transaction ID, etc.
    notes: Optional internal CD notes
    """
    with transaction():
        invoice = Invoice.get(id=invoice_id)
        
        if invoice.status == 'paid':
            raise ValidationError("Invoice already marked as paid")
        
        invoice.status = 'paid'
        invoice.paid_at = payment_date or now()
        invoice.payment_method = f"{payment_method} - {reference}"
        
        if notes:
            invoice.notes = (invoice.notes or '') + f"\n\nPayment Notes: {notes}"
        invoice.save()
        
        # Update reservation
        reservation = Reservation.get(id=invoice.reservation_id)
        reservation.status = 'closed'
        reservation.save()
        
        # Notify studio
        send_email(
            to=reservation.studio.contact_email,
            template='payment_confirmed',
            context={
                'event_name': reservation.event.name,
                'invoice_number': invoice.id,
                'amount_paid': invoice.total,
                'payment_date': invoice.paid_at,
                'phase2_access_date': reservation.event.planning_phase_start
            }
        )
```

---

## Validation Rules

### Reservation
```python
RESERVATION_VALIDATION = {
    'entries_requested': lambda x: 1 <= x <= 1000,
    'capacity_check': lambda req, event: req <= event.remaining_capacity,
    'no_duplicate_pending': lambda studio_id, event_id: not Reservation.exists(
        studio_id=studio_id,
        event_id=event_id,
        status='pending'
    )
}
```

### Entry
```python
ENTRY_VALIDATION = {
    'routine_name': lambda x: 3 <= len(x) <= 255 and re.match(r'^[a-zA-Z0-9\s\-_\']+$', x),
    'dancer_count': lambda dancers: len(dancers) >= 1,
    'title_upgrade_solo_only': lambda upgrade, group: not upgrade or group == 'solo',
    'quota_limit': lambda reservation_id: Entry.count(
        reservation_id=reservation_id,
        deleted_at=None
    ) < Reservation.get(id=reservation_id).entries_approved
}
```

### Summary
```python
SUMMARY_VALIDATION = {
    'min_entries': lambda entries: len(entries) >= 1,
    'no_duplicate': lambda reservation_id: not Summary.exists(reservation_id=reservation_id),
    'all_draft': lambda entries: all(e.status == 'draft' for e in entries)
}
```

### Invoice
```python
INVOICE_VALIDATION = {
    'discount_valid': lambda x: x in [0, 5, 10, 15],
    'credit_label_length': lambda label: 5 <= len(label) <= 100,
    'total_positive': lambda total: total >= 0,
    'summary_exists': lambda res_id: Summary.exists(reservation_id=res_id),
    'no_duplicate': lambda res_id: not Invoice.exists(reservation_id=res_id)
}
```

---

## Email Notifications

### Templates Required

1. **reservation_submitted** (to CD)
   - Studio name, event name, entries requested
   - Link to review reservation

2. **reservation_approved** (to SD)
   - Event name, entries approved
   - Link to create entries

3. **reservation_rejected** (to SD)
   - Event name, rejection reason
   - No action link

4. **summary_submitted** (to CD)
   - Studio name, event name, entries used/unused
   - Link to create invoice

5. **invoice_created** (to SD)
   - Invoice number, total amount
   - Link to download PDF

6. **payment_confirmed** (to SD)
   - Payment amount, date
   - Phase 2 access date

7. **capacity_alert** (to CD)
   - Event name, remaining capacity
   - Triggered when capacity < 50

---

## Access Control

### Row-Level Security (RLS)

```sql
-- Studios see only their own data
CREATE POLICY studios_isolation ON studios
FOR ALL USING (id = current_setting('app.current_studio_id')::uuid);

-- SDs see only their reservations
CREATE POLICY reservations_studio_access ON reservations
FOR SELECT USING (studio_id = current_setting('app.current_studio_id')::uuid);

-- CDs see all reservations for their events
CREATE POLICY reservations_cd_access ON reservations
FOR SELECT USING (
    event_id IN (
        SELECT id FROM events 
        WHERE created_by = current_user_id()
    )
);

-- Entries inherit from reservations
CREATE POLICY entries_studio_access ON entries
FOR ALL USING (
    reservation_id IN (
        SELECT id FROM reservations 
        WHERE studio_id = current_setting('app.current_studio_id')::uuid
    )
);
```

---

## Edge Cases

### 1. Entry Deletion After Summary
- SD requests deletion → CD approves
- Entry soft-deleted (`deleted_at` timestamp)
- Capacity refunded (+1 to event)
- Invoice NOT automatically adjusted

### 2. Capacity Race Condition
- Database row-level locking on events table
- First transaction to acquire lock wins
- Losers receive `InsufficientCapacityError`

### 3. Negative Invoice Total
- Validation prevents submission
- Show real-time warning as CD adjusts credits/discounts

### 4. Zero-Entry Summary
- Validation blocks submission
- Must create at least 1 entry

### 5. Phase 2 Access with Unpaid Invoice
- Calendar gate: Must be past `event.planning_phase_start`
- Payment gate: All invoices for that event must be `status='paid'`
- Display clear error with invoice details

### 6. Multiple Reservations, Partial Payment
- All invoices must be paid for Phase 2 access
- No partial access (all or nothing)

---

## Implementation Checklist

### Database
- [ ] Create all tables with proper constraints
- [ ] Add indexes for performance
- [ ] Implement RLS policies
- [ ] Add database triggers for `updated_at` timestamps

### Backend Logic
- [ ] Implement all 7 process flows
- [ ] Add validation for all inputs
- [ ] Implement state machine guards
- [ ] Set up email service integration

### API Endpoints
- [ ] POST `/api/reservations` - Submit reservation
- [ ] PATCH `/api/reservations/{id}/approve` - CD approval
- [ ] PATCH `/api/reservations/{id}/reject` - CD rejection
- [ ] POST `/api/entries` - Create entry (3-step)
- [ ] POST `/api/summaries` - Submit summary
- [ ] POST `/api/invoices` - Generate invoice
- [ ] PATCH `/api/invoices/{id}/mark-paid` - Payment confirmation
- [ ] GET `/api/events/{id}/capacity` - Real-time capacity

### UI Components
- [ ] Dancer management (add/import)
- [ ] Reservation form and pipeline dashboard
- [ ] Entry creation wizard (3 steps)
- [ ] Entry management table
- [ ] Summary submission with confirmation
- [ ] Invoice creation form (CD)
- [ ] Invoice preview/download
- [ ] Payment marking form (CD)

### Testing
- [ ] Unit tests for calculations
- [ ] Integration tests for state transitions
- [ ] Race condition testing (concurrent reservations)
- [ ] Email delivery testing
- [ ] Edge case scenarios

---

## Quick Reference: State Flow

```
RESERVATION FLOW:
SD submits → pending
CD approves → approved/adjusted (capacity deducted)
SD creates entries → draft
SD submits summary → summarized (capacity refunded)
CD creates invoice → invoiced
CD marks paid → closed

ENTRY FLOW:
Created → draft
Summary submitted → submitted (can edit dancers only)
Invoice created → invoiced (same restrictions)
Phase 2 → routine_created (immutable)
```

---

**END OF PHASE 1 IMPLEMENTATION SPEC**

This document contains all information needed to implement Phase 1. For questions or clarifications, refer to the master summary document.
