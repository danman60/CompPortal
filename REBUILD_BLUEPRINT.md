# GlowDance Competition Portal - Full-Stack Rebuild Blueprint

## Executive Summary

Based on analysis of the scraped HTML, forms, and navigation patterns, this is a **white-label dance competition registration and management platform** serving studios, dancers, and competition organizers. The existing system uses legacy technologies (jQuery 1.4.2, Blueprint CSS, XHTML 1.0 Transitional) and needs a complete modernization.

---

## 1. Product and UX Summary

### **Platform Purpose**
GlowDance Competition Portal is a **white-label B2B competition management system** that enables dance studios to register for competitions, manage their dancers, and handle competition logistics.

### **Primary Users**
1. **Studio Owners/Directors** - Register studios, manage dancers, create competition reservations
2. **Competition Directors** - Manage events, locations, schedules, and participant data
3. **System Administrators** - Platform management and reporting

### **Core User Flows**

#### **Studio Registration & Management Flow:**
1. **Registration** → Studio creates account with business details
2. **Studio Setup** → Complete studio profile (address, contact info, etc.)
3. **Dancer Management** → Add/edit individual dancers (name, DOB, age override)
4. **Competition Reservation** → Reserve spots at specific competition locations
5. **Schedule Review** → View competition schedules and logistics

#### **Data Collection Forms:**
- **Studio Profile**: Name, address, phone, email, contact person, comments
- **Dancer Registration**: First/last name, date of birth, age override, studio assignment
- **Competition Reservations**: Location selection, number of spaces, agent details, waivers/consent
- **User Management**: Profile editing, authentication

### **Current Page Structure:**
- **Dashboard** - Main landing page with key actions and information
- **Studios** - Studio profile management and overview
- **Dancers** - Individual dancer management (CRUD operations)
- **Reservations** - Competition registration and space booking
- **Reports** - Schedule listings and administrative data
- **User Profile** - Account management and settings
- **Help** - Documentation and support information

---

## 2. Frontend Rebuild Plan

### **Recommended Stack**
```typescript
// Primary Stack
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui
- State Management: Zustand + React Query (TanStack Query)
- Forms: React Hook Form + Zod validation
- Authentication: NextAuth.js
- Icons: Lucide React
```

### **Component Architecture**

#### **Layout Components:**
- `AppShell` - Main layout with navigation
- `Header` - Top navigation with user context
- `Sidebar` - Main navigation menu
- `Footer` - Branding and support links

#### **Feature Components:**

**Authentication:**
- `LoginForm` - Email/password login
- `ProtectedRoute` - Route guards for authenticated areas

**Dashboard:**
- `DashboardOverview` - Main dashboard with quick actions
- `ActionCard` - Individual action items
- `ImportantNotice` - System announcements

**Studio Management:**
- `StudioProfile` - Studio information display/edit
- `StudioForm` - Create/edit studio form with validation

**Dancer Management:**
- `DancerList` - Table/grid of all studio dancers
- `DancerForm` - Add/edit dancer with age calculations
- `DancerCard` - Individual dancer summary

**Reservations:**
- `ReservationWizard` - Multi-step reservation process
- `LocationSelector` - Competition location picker
- `ConsentForms` - Waiver and age consent handling
- `ReservationSummary` - Booking confirmation

**Reporting:**
- `ScheduleViewer` - Competition schedule display
- `DataTable` - Sortable/filterable tables
- `ExportTools` - PDF/CSV export functionality

### **Route Structure**
```
/login
/dashboard
/studios
  /studios/new
  /studios/[id]
  /studios/[id]/edit
/dancers
  /dancers/new
  /dancers/[id]
  /dancers/[id]/edit
/reservations
  /reservations/new
  /reservations/[id]
/reports
  /reports/schedules
/profile
/help
```

### **Modern Improvements:**
- **Responsive Design** - Mobile-first approach with Tailwind breakpoints
- **Accessibility** - ARIA labels, keyboard navigation, screen reader support
- **Progressive Enhancement** - Works without JavaScript for core functions
- **Real-time Updates** - WebSocket integration for live schedule changes
- **Offline Support** - Service worker for form data persistence
- **Performance** - Code splitting, image optimization, lazy loading

---

## 3. Backend & Database Architecture

### **Recommended Stack**
```typescript
// Backend Stack
- Runtime: Node.js 18+
- Framework: Next.js API routes + tRPC
- Database: PostgreSQL 15+
- ORM: Prisma
- Authentication: NextAuth.js + JWT
- File Storage: AWS S3 or Cloudinary
- Email: Resend or SendGrid
- Monitoring: Sentry
```

### **Database Schema (PostgreSQL)**

```sql
-- Core Entities
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'studio_owner',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  address1 VARCHAR(255),
  address2 VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(255),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  comments TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dancers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  age_override INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE competition_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  date_start DATE,
  date_end DATE,
  capacity INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id),
  location_id UUID REFERENCES competition_locations(id),
  spaces INTEGER NOT NULL,
  agent_first_name VARCHAR(100),
  agent_last_name VARCHAR(100),
  agent_email VARCHAR(255),
  age_of_consent BOOLEAN DEFAULT FALSE,
  waiver_consent BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  dancer_id UUID REFERENCES dancers(id),
  routine_name VARCHAR(255),
  category VARCHAR(100),
  level VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_studios_owner ON studios(owner_id);
CREATE INDEX idx_dancers_studio ON dancers(studio_id);
CREATE INDEX idx_reservations_studio ON reservations(studio_id);
CREATE INDEX idx_entries_reservation ON entries(reservation_id);
```

### **Authentication & Authorization**
- **JWT-based sessions** with refresh tokens
- **Role-based access control**: studio_owner, admin, super_admin
- **Row-level security** - Studios can only access their own data
- **API key authentication** for external integrations

### **Data Validation**
- **Server-side validation** using Zod schemas
- **Input sanitization** for XSS prevention
- **File upload validation** for documents/photos
- **Rate limiting** to prevent abuse

---

## 4. API Layer

### **Recommended Approach: tRPC**
Type-safe API layer with automatic client generation and excellent developer experience.

### **API Endpoints Structure**

```typescript
// tRPC Router Structure
export const appRouter = router({
  // Authentication
  auth: authRouter,

  // Studio Management
  studio: router({
    get: protectedProcedure.query(),
    update: protectedProcedure.mutation(),
    getByOwner: protectedProcedure.query(),
  }),

  // Dancer Management
  dancers: router({
    list: protectedProcedure.query(),
    create: protectedProcedure.mutation(),
    update: protectedProcedure.mutation(),
    delete: protectedProcedure.mutation(),
    getByStudio: protectedProcedure.query(),
  }),

  // Reservations
  reservations: router({
    create: protectedProcedure.mutation(),
    list: protectedProcedure.query(),
    getByStudio: protectedProcedure.query(),
    update: protectedProcedure.mutation(),
  }),

  // Competitions & Locations
  competitions: router({
    list: publicProcedure.query(),
    locations: publicProcedure.query(),
    schedules: protectedProcedure.query(),
  }),

  // Reports & Admin
  reports: router({
    schedules: protectedProcedure.query(),
    export: protectedProcedure.query(),
  }),
});
```

### **Alternative: REST API**
If tRPC isn't suitable, implement RESTful endpoints with OpenAPI specification:

```
GET    /api/studios/:id
PUT    /api/studios/:id
POST   /api/studios

GET    /api/studios/:id/dancers
POST   /api/studios/:id/dancers
PUT    /api/dancers/:id
DELETE /api/dancers/:id

POST   /api/reservations
GET    /api/reservations/:id
PUT    /api/reservations/:id

GET    /api/competitions/:id/locations
GET    /api/reports/schedules
```

### **Real-time Features**
- **WebSocket connections** for live schedule updates
- **Server-sent events** for notifications
- **Optimistic updates** in the UI

---

## 5. Admin & Reporting Features

### **Administrative Dashboard**
- **Studio Approval Workflow** - Review and approve new studio registrations
- **Competition Management** - Create/edit competitions and locations
- **User Management** - Admin user controls and permissions
- **System Settings** - Platform configuration

### **Reporting System**
- **Registration Reports** - Studio and dancer statistics
- **Schedule Exports** - PDF/CSV generation for competition schedules
- **Financial Reports** - Payment tracking and invoicing
- **Analytics Dashboard** - Usage metrics and insights

### **Export Features**
- **PDF Generation** - Competition schedules, registration forms
- **CSV Exports** - Dancer lists, studio directories
- **Email Integration** - Automated notifications and confirmations

### **Implementation Approach**
- **React-Admin** or custom admin interface
- **Recharts** for data visualization
- **jsPDF + html2canvas** for PDF generation
- **csv-writer** for CSV exports

---

## 6. Hosting, DevOps & Deployment

### **Recommended Architecture**
```yaml
# Production Stack
Frontend: Vercel (Next.js deployment)
Backend API: Vercel Serverless Functions
Database: PlanetScale (MySQL) or Neon (PostgreSQL)
File Storage: AWS S3 + CloudFront CDN
Monitoring: Sentry + Vercel Analytics
Email: Resend or SendGrid
```

### **Alternative Hosting**
```yaml
# Self-hosted option
Frontend: AWS S3 + CloudFront
Backend: AWS ECS or DigitalOcean App Platform
Database: AWS RDS PostgreSQL
File Storage: AWS S3
Monitoring: DataDog or New Relic
```

### **Security Measures**
- **HTTPS everywhere** with SSL certificates
- **Environment variable management** for secrets
- **Database connection pooling** and encryption
- **CORS configuration** for API security
- **Input validation** and SQL injection prevention

### **CI/CD Pipeline**
```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main, staging]

jobs:
  test:
    - TypeScript compilation
    - Unit/integration tests
    - Linting and formatting
    - Security scanning

  deploy:
    - Database migrations
    - Environment deployment
    - Health checks
    - Rollback capability
```

### **Local Development Setup**
```bash
# Development environment
git clone <repo>
npm install
cp .env.example .env.local
docker-compose up -d  # PostgreSQL + Redis
npx prisma migrate dev
npm run dev
```

---

## 7. Optional Improvements

### **Mobile Experience**
- **Progressive Web App** - Offline capability and mobile app-like experience
- **Touch-optimized interfaces** - Better mobile form interactions
- **Responsive data tables** - Mobile-friendly table layouts

### **Performance Optimizations**
- **Image optimization** - Next.js automatic image optimization
- **Code splitting** - Route-based and component-based splitting
- **Caching strategies** - Redis for session/data caching
- **CDN integration** - Global content delivery

### **User Experience Enhancements**
- **Multi-step forms** - Better UX for complex registration processes
- **Auto-save drafts** - Prevent data loss during form completion
- **Smart validation** - Real-time feedback and suggestions
- **Keyboard shortcuts** - Power user productivity features

### **Developer Experience**
- **Component library** - Reusable UI components with Storybook
- **API documentation** - Auto-generated docs with examples
- **Development tools** - Hot reload, debugging, testing utilities
- **Deployment previews** - Automatic staging deployments

### **Advanced Features**
- **Payment integration** - Stripe for competition fees
- **Calendar integration** - Competition schedule sync
- **Notification system** - Email/SMS reminders
- **Multi-language support** - i18n for French/English (Canadian requirement)

---

## Legacy System Issues Identified

### **Critical Technical Debt:**
- **jQuery 1.4.2** (2010) - Severe security vulnerabilities
- **Blueprint CSS** - Obsolete grid system
- **XHTML 1.0 Transitional** - Deprecated markup
- **Inline styles** - Poor maintainability
- **No mobile responsiveness** - Poor user experience
- **Client-side eval()** in footer - Security risk
- **No CSRF protection** visible
- **Mixed HTTP/HTTPS** resources potential

### **UX/Design Issues:**
- **Outdated visual design** - Looks unprofessional
- **Poor information hierarchy** - Hard to navigate
- **No loading states** - Poor feedback
- **Form validation** - Appears minimal/client-side only
- **No error handling** visible in UI
- **Accessibility concerns** - No visible ARIA labels or semantic HTML

### **Recommended Migration Strategy:**
1. **Phase 1**: New frontend with existing API integration
2. **Phase 2**: New API with data migration
3. **Phase 3**: Advanced features and optimizations
4. **Phase 4**: Legacy system sunset

---

## Implementation Timeline Estimate

- **MVP (Basic CRUD)**: 8-10 weeks
- **Full Feature Parity**: 12-16 weeks
- **Advanced Features**: +4-6 weeks
- **Migration & Testing**: +2-4 weeks

**Total Project Timeline: 20-26 weeks**

This blueprint provides a comprehensive foundation for rebuilding the GlowDance Competition Portal as a modern white-label platform with improved security, enhanced user experience, and full customization capabilities for different competition organizers.