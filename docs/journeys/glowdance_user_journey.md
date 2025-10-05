# User Journey – GlowDance Competition Portal

## Overview
The GlowDance Competition Portal is a white-label B2B platform connecting **studio owners/directors**, **competition directors**, and **system administrators**. The user journey emphasizes smooth onboarding, efficient dancer/competition management, and transparent scheduling.

---

## 1. Studio Owner / Director Journey

### Onboarding & Setup
1. **Account Creation**  
   - Visit `/login` → Create account with business email + password  
   - Verify email, log in, and land on the dashboard  

2. **Studio Profile Setup**  
   - Fill out studio profile (address, contact info, comments)  
   - Submit for approval (status: pending → approved by admin)  

### Managing Dancers
3. **Dancer Registration**  
   - Navigate to `/dancers` → Add new dancer(s)  
   - Input: name, DOB, age override (if applicable)  
   - View dancers in sortable list with edit/delete options  

### Competition Registration
4. **Make a Reservation**  
   - Navigate to `/reservations/new`  
   - Select competition location from available list  
   - Enter number of spaces, agent details, and waivers/consent  
   - Confirm reservation and receive summary  

5. **Entries & Routines**  
   - Within reservation, add entries:  
     - Assign dancer(s)  
     - Add routine name, category, level  

### Reviewing Schedules
6. **Check Schedule**  
   - Access `/reports/schedules`  
   - View finalized competition schedule  
   - Export to PDF/CSV for distribution  

---

## 2. Competition Director Journey

1. **Create Competition**  
   - Access admin dashboard → Add new competition (name, year, status)  
   - Add locations (address, start/end dates, capacity)  

2. **Monitor Registrations**  
   - Track studio approvals and reservations  
   - Review age/waiver consents  

3. **Generate Reports**  
   - Pull registration reports, dancer lists, or studio summaries  
   - Export schedules for judges, staff, and studios  

---

## 3. Administrator Journey

1. **User & Studio Management**  
   - Review new studio registrations (approve/reject)  
   - Manage user roles (studio_owner, admin, super_admin)  

2. **System Oversight**  
   - Monitor database activity (reservations, dancers, entries)  
   - Manage platform settings and integrations  

3. **Analytics & Reporting**  
   - Generate financial and usage reports  
   - Export analytics dashboards for stakeholders  

---

## 4. Cross-Journey Touchpoints

- **Authentication**  
  - All users authenticate via JWT sessions and role-based access  
- **Notifications**  
  - Reservation confirmations and schedule updates via email  
- **Mobile Access**  
  - Responsive PWA allows studio owners to register/update from mobile  
- **Exports**  
  - PDF/CSV exports used across admin and studio flows  

---

✅ This user journey maps out how **each role** interacts with the portal, from account creation through competition day logistics. It follows the flows outlined in the blueprint but framed from the **user’s perspective**.
