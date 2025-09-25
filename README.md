# GlowDance Competition Portal

A modern, white-label dance competition registration and management platform rebuilt from legacy systems with contemporary web technologies.

## 🎯 Project Overview

This project is a complete modernization of a dance competition portal, transforming a legacy system using outdated technologies (jQuery 1.4.2, Blueprint CSS, XHTML 1.0) into a modern, responsive web application.

### Current Status: Analysis & Design Phase
- ✅ **Legacy System Analysis Complete** - Scraped and analyzed 18 pages of the existing portal
- ✅ **Technical Blueprint Created** - Comprehensive rebuild strategy documented
- ✅ **Modern UI Samples** - Login and dashboard mockups created with contemporary design

## 📁 Repository Structure

```
CompPortal/
├── glow_output/                 # Scraped legacy system files (18 HTML pages + forms)
├── crawl-glow-dance.js         # Playwright crawler used for legacy system analysis
├── sample-login.html           # Modern login page mockup
├── sample-dashboard.html       # Modern dashboard mockup
├── REBUILD_BLUEPRINT.md        # Comprehensive technical roadmap (50+ pages)
└── package.json               # Node.js dependencies for crawler
```

## 🚀 Technology Stack (Proposed)

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand + React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js 18+
- **API**: tRPC for type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js + JWT

### Hosting & DevOps
- **Frontend**: Vercel
- **Database**: PlanetScale or Neon
- **Monitoring**: Sentry
- **Email**: Resend

## 🎨 Design Samples

The repository includes two sample pages demonstrating the modern design approach:

### Login Page (`sample-login.html`)
- Glassmorphism design with animated background
- Responsive form with smooth transitions
- Dance-themed color palette (pink, purple, gold)
- Modern authentication flow

### Dashboard (`sample-dashboard.html`)
- Clean card-based layout
- Interactive action items
- Real-time status indicators
- Mobile-first responsive design

## 📋 Key Features (Planned)

### Studio Management
- Complete studio profile management
- Multi-location support
- Contact management system

### Dancer Registration
- Individual dancer profiles
- Age calculations and overrides
- Bulk import/export capabilities

### Competition Reservations
- Location-based booking system
- Capacity management
- Waiver and consent handling

### Reporting & Analytics
- Competition schedules
- Registration reports
- Payment tracking
- Export functionality (PDF/CSV)

## 🔍 Legacy System Analysis

The `glow_output/` directory contains a complete crawl of the existing system:
- **18 HTML pages** captured with full dynamic content
- **Form structures** extracted as JSON files
- **Navigation patterns** and user flows documented
- **Technical debt** identified and catalogued

### Critical Issues Found in Legacy System:
- jQuery 1.4.2 (2010) with security vulnerabilities
- No mobile responsiveness
- XHTML 1.0 Transitional (deprecated)
- Inline styles and poor maintainability
- Limited accessibility features

## 📖 Documentation

### Technical Blueprint (`REBUILD_BLUEPRINT.md`)
Comprehensive 50+ page document covering:
- Product and UX analysis
- Frontend architecture plan
- Database design with PostgreSQL schema
- API layer design (tRPC)
- Admin and reporting features
- DevOps and deployment strategy
- Performance optimization recommendations

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Git

### Getting Started
```bash
# Clone the repository
git clone https://github.com/danman60/CompPortal.git
cd CompPortal

# Install dependencies (for crawler analysis)
npm install

# View sample pages
open sample-login.html
open sample-dashboard.html
```

## 📊 Project Timeline

- **Phase 1: MVP Development** - 8-10 weeks
- **Phase 2: Full Feature Parity** - 12-16 weeks
- **Phase 3: Advanced Features** - +4-6 weeks
- **Phase 4: Migration & Testing** - +2-4 weeks

**Total Estimated Timeline: 20-26 weeks**

## 🎭 White Label Platform

This platform is designed as a white-label solution that can be customized for different dance competition organizers while maintaining core functionality.

### Customization Options
- Branding and color schemes
- Competition-specific workflows
- Payment processing integration
- Custom reporting requirements

## 🤝 Contributing

This project is in the analysis and planning phase. Future contributions will focus on:
- Frontend component development
- Backend API implementation
- Database schema refinement
- Testing and deployment automation

## 📄 License

[License to be determined]

## 📞 Support

For questions about this project or the technical blueprint, please create an issue in the GitHub repository.

---

**Note**: This repository currently contains the analysis, planning, and design work. The actual application development will begin based on the comprehensive blueprint provided in `REBUILD_BLUEPRINT.md`.