# PGSaathi - Hostel/PG Management Platform
## PRD & Development Tracker

### Original Problem Statement
Build a responsive web application named "PGSaathi" for Hostel/PG Management - a comprehensive platform for property owners to manage accommodations, tenants, billing, and operations, replacing manual methods.

### User Personas
- **Property Owner (Super Admin)**: Manages multiple properties, full access to all features
- **Warden/Manager**: Manages assigned property, limited admin capabilities
- **Tenant**: Self-service portal to view dues, raise complaints, manage meal plans

### Core Requirements
- Multi-role authentication (Owner/Warden/Tenant)
- Property hierarchy management (Properties > Floors > Rooms > Beds)
- Tenant lifecycle management (Onboarding with KYC, Room Assignment, Check-in/out, Room Switching)
- Financial management (Rent, Invoices, Payments, PDF generation, Bulk billing, Prorated rent)
- Service management (Mess/Food, Complaints with SLA, Housekeeping/Maintenance)
- Communication (Notices, Notifications)
- Reporting and Analytics
- Hindi/English localization
- Warm and friendly theme (amber-based)
- No AI features, No payment gateway

### Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, Sonner (toasts), Lucide React (icons)
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: JWT tokens
- **PDF**: ReportLab
- **File Storage**: Local server (/app/backend/uploads/kyc/)

### Architecture
```
/app/backend/
  server.py          - Main app, auth, dashboard, bulk invoice, prorate, PDF gen
  auth_utils.py      - JWT auth, password hashing
  database.py        - MongoDB connection
  models.py          - Pydantic models
  routes/
    properties.py    - Property/Floor/Room/Bed CRUD
    tenants.py       - Tenant CRUD + KYC upload + checkout + switch bed
    rent.py          - Invoices + Payments
    complaints.py    - Complaints CRUD
    mess.py          - Mess config + meal plans
    notifications.py - Notification system
    notices.py       - Notice board
    housekeeping.py  - Housekeeping/maintenance tasks
    users.py         - User management + password change
    tenant_portal.py - Tenant self-service endpoints

/app/frontend/src/
  App.js             - Routes + guards (role-based)
  components/
    Layout.jsx       - Sidebar + header (role-based nav)
  pages/
    Dashboard.jsx    - Admin overview stats
    Properties.jsx   - Property management
    PropertyDetail.jsx - Property detail + floors/rooms/beds
    Tenants.jsx      - Tenant list + onboarding with room assignment
    TenantDetail.jsx - Admin view of individual tenant
    TenantDashboard.jsx - Tenant self-service portal
    RentManagement.jsx - Invoices + payments + bulk generation
    Complaints.jsx   - Complaint tracking with SLA
    MessManagement.jsx - Food/mess configuration
    Reports.jsx      - Analytics and reports
    NoticeBoard.jsx  - Notice board
    Housekeeping.jsx - Housekeeping/maintenance tasks
    Settings.jsx     - Profile, password change, language
    UserManagement.jsx - Admin user management
```

### What's Been Implemented (Feb 2026)

#### Phase 1 - Core MVP (Complete)
- [x] JWT Authentication (register, login, role-based access)
- [x] Language selector (English/Hindi) with i18n
- [x] Property management (CRUD for properties, floors, rooms, beds)
- [x] Tenant management (CRUD with search/filter)
- [x] Rent & billing (invoices, payment recording)
- [x] Complaint system (CRUD with status workflow)
- [x] Mess/food management (config + meal plans)
- [x] Dashboard with stats and occupancy
- [x] Reports and analytics

#### Phase 2 - Extended Features (Complete)
- [x] Tenant Self-Service Portal (dashboard, invoices, payments, complaints, notices)
- [x] Admin Tenant Detail Page (view/manage individual tenant with all data)
- [x] KYC Document Upload (file upload + camera capture)
- [x] Room Assignment at Onboarding (with availability warning)
- [x] Tenant Checkout workflow with settlement calculation
- [x] Bed/Room Switching with audit trail
- [x] Bulk Invoice Generation (per property, per month)
- [x] Prorated Rent Calculation
- [x] PDF Invoice Generation (professional, downloadable)
- [x] Notice Board (CRUD, pin/unpin, priority levels)
- [x] Housekeeping & Maintenance (task scheduling, recurrence, status tracking)
- [x] In-app Notification System (with unread count, mark read)
- [x] User Management (owner-only, CRUD for wardens/tenants)
- [x] Settings Page (profile edit, password change, language switch)
- [x] Password Reset (email-based)
- [x] Role-based Navigation (owner sidebar vs tenant sidebar)
- [x] SLA Tracking for Complaints (time-based, priority-dependent)
- [x] Hindi/English translations for all core features

### Testing Status
- Backend: 100% (66/66 tests passed)
- Frontend: 95% (all pages load, navigation works)
- Test credentials: admin@test.com / admin123 (owner)

### Remaining Backlog (P2/P3)
- [ ] Email notifications (requires email service integration)
- [ ] Email OTP verification (deferred by user)
- [ ] Attendance-based mess tracking
- [ ] Multi-language PDF invoices
- [ ] Move-out notice workflow
- [ ] Advanced reporting (monthly trend graphs, export to Excel)
- [ ] Bulk SMS notifications
- [ ] Tenant feedback/rating system
