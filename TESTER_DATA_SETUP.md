# Tester Environment Data Setup

**Date:** November 12, 2025
**Status:** In Progress

---

## ✅ Completed

### 1. Competition Created
- **ID:** 1b786221-8f8e-413f-b532-06fa20a2ff63
- **Name:** Test Competition Spring 2026
- **Dates:** April 9-12, 2026
- **Venue Capacity:** 600 tokens
- **Settings:** Matches GLOW configuration exactly

---

## 🔨 Manual Steps Required

### Create Test User Accounts (Via Supabase Dashboard)

**1. Super Admin Account:**
```
Email: test-sa@compsync.net
Password: 123456
Role: super_admin
Tenant: NULL (super admin not tied to tenant)
```

**Steps:**
1. Supabase Dashboard → Authentication → Users → Add User
2. Email: test-sa@compsync.net, Password: 123456
3. Auto-confirm email
4. Get user UUID
5. Insert into user_profiles:
```sql
INSERT INTO user_profiles (id, email, role, tenant_id, created_at, updated_at)
VALUES ('[USER_UUID]', 'test-sa@compsync.net', 'super_admin', NULL, NOW(), NOW());
```

**2. Competition Director Account:**
```
Email: test-cd@compsync.net
Password: 123456
Role: competition_director
Tenant: Test Environment (tester)
```

**Steps:**
1. Create auth user (same as above)
2. Insert into user_profiles:
```sql
INSERT INTO user_profiles (id, email, role, tenant_id, created_at, updated_at)
VALUES ('[USER_UUID]', 'test-cd@compsync.net', 'competition_director', '00000000-0000-0000-0000-000000000003', NOW(), NOW());
```

**3. Studio Director Account:**
```
Email: test-sd@compsync.net
Password: 123456
Role: studio_director
Tenant: Test Environment (tester)
Studio: Will be assigned after first studio is created
```

**Steps:**
1. Create auth user (same as above)
2. Wait for first studio to be created
3. Insert into user_profiles with studio_id:
```sql
INSERT INTO user_profiles (id, email, role, tenant_id, studio_id, created_at, updated_at)
VALUES ('[USER_UUID]', 'test-sd@compsync.net', 'studio_director', '00000000-0000-0000-0000-000000000003', '[FIRST_STUDIO_ID]', NOW(), NOW());
```

---

## 📋 Next Steps (Automated via SQL)

- [ ] Generate 15 studios
- [ ] Generate 30-80 dancers per studio (~750 total)
- [ ] Generate 600 routines with proper distribution
- [ ] Create reservations (all in summarized state)
- [ ] Create entries and attach dancers
- [ ] Mark invoices as paid

---

## 🎯 Target Data Distribution

### Studios (15 total):
- Mix of small (30-40 dancers) and large (60-80 dancers)
- Total routines: 600 across all studios

### Dancers (~750 total):
- Age range: 5-18 years
- Classifications: 40% Recreational, 40% Competitive, 20% Elite
- Complete profiles (email, parent info, phone)
- Some withdrawn (5-10%)
- Age group conflicts intentionally included

### Routines (600 total):
- Solo: ~200
- Duet/Trio: ~150
- Small Group: ~150
- Large Group: ~80
- Line/Production: ~20

### Reservations:
- All in "summarized" state (ready for scheduling)
- Tokens requested = tokens approved
- Total: 600 tokens reserved

### Invoices:
- All marked as "paid"
- Simulate complete payment flow

---

## 📊 Current Status

✅ Competition created
⏳ User accounts (manual step required)
⏳ Studios (SQL script ready)
⏳ Dancers (SQL script ready)
⏳ Routines (SQL script ready)
⏳ Reservations (SQL script ready)
