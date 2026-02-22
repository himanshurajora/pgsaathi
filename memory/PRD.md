# PGSaathi - Hostel/PG Management Platform
## PRD & Architecture Notes

**Last Updated:** February 2026

---

## Product Vision
PGSaathi is an end-to-end digital solution for hostel and paying guest (PG) property owners to manage their accommodations efficiently. It replaces manual registers, spreadsheets, and ad-hoc messaging with a centralized, structured, and auditable platform.

## User Choices / Preferences
- Default language: English (with Hindi toggle on every page)
- Language selector shown on first app visit
- No payment gateway (manual payment tracking only)
- No AI features
- Simple email + password authentication
- Warm and friendly theming (amber/earthy tones)
- Core modules prioritized first

---

## Tech Stack
- **Frontend:** React + Tailwind CSS + shadcn/ui + Recharts
- **Backend:** FastAPI (Python)
- **Database:** MongoDB (Motor async driver)
- **Auth:** JWT tokens (python-jose + bcrypt)
- **Fonts:** Manrope (headings) + Inter (body)

---

## Architecture

### Backend Files
```
/app/backend/
├── server.py           # App setup, auth routes, dashboard stats
├── database.py         # MongoDB connection
├── models.py           # All Pydantic request/response models
├── auth_utils.py       # JWT utilities, get_current_user dependency
└── routes/
    ├── properties.py   # Property, Floor, Room, Bed CRUD (4 routers)
    ├── tenants.py      # Tenant CRUD + bed allocation + KYC
    ├── rent.py         # Invoice + Payment CRUD (2 routers)
    ├── complaints.py   # Complaint CRUD + status updates
    └── mess.py         # Mess Config + Tenant Meal Plans
```

### Frontend Files
```
/app/frontend/src/
├── App.js              # Routing with LanguageGuard + AuthGuard
├── context/
│   ├── AuthContext.js  # User auth state, login/logout
│   └── LanguageContext.js  # i18n language state with t() function
├── translations/
│   └── index.js        # English + Hindi translations
├── services/
│   └── api.js          # Axios client with JWT interceptor
├── components/
│   └── Layout.jsx      # Sidebar + TopNav + Mobile bottom nav
└── pages/
    ├── LanguageSelector.jsx
    ├── Login.jsx
    ├── Register.jsx
    ├── Dashboard.jsx       # Bento grid stats + recent tenants
    ├── Properties.jsx      # Property list with stats cards
    ├── PropertyDetail.jsx  # Floor/Room/Bed hierarchical view
    ├── Tenants.jsx         # Tenant management + bed allocation
    ├── RentManagement.jsx  # Invoices + Payments (tabbed)
    ├── Complaints.jsx      # Complaint tracking with status filters
    ├── MessManagement.jsx  # Mess config + meal plans
    └── Reports.jsx         # Charts + analytics (recharts)
```

---

## Database Schema (MongoDB)

### Collections
- `users` - Auth users (owner/warden/tenant roles)
- `properties` - PG properties with address, gender_type
- `floors` - Floors within properties
- `rooms` - Rooms within floors (single/double/triple/dormitory)
- `beds` - Individual beds with price + status + tenant_id
- `tenants` - Tenant records with KYC status + bed assignment
- `invoices` - Monthly billing records with rent/food/other charges
- `payments` - Payment transactions against invoices
- `complaints` - Complaint tickets with category/priority/status
- `mess_configs` - Mess configuration per property
- `tenant_meal_plans` - Tenant-wise meal preferences

---

## User Roles
1. **Owner** - Full access, manages all properties and users
2. **Warden** - Daily operations for assigned property
3. **Tenant** - Self-service portal (view dues, raise complaints)

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login with email+password
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/dashboard/stats` - Aggregated stats for owner

### Properties
- `GET/POST /api/properties` - List/Create properties
- `GET/PUT/DELETE /api/properties/:id`
- `GET/POST /api/properties/:id/floors`
- `PUT/DELETE /api/floors/:id`
- `GET/POST /api/floors/:id/rooms`
- `PUT/DELETE /api/rooms/:id`
- `GET/POST /api/rooms/:id/beds`
- `PUT/DELETE /api/beds/:id`

### Tenants
- `GET/POST /api/tenants`
- `GET/PUT/DELETE /api/tenants/:id`
- `POST /api/tenants/:id/allocate-bed`
- `POST /api/tenants/:id/release-bed`
- `PUT /api/tenants/:id/kyc`

### Rent
- `GET/POST /api/invoices`
- `GET/PUT/DELETE /api/invoices/:id`
- `GET/POST /api/payments`

### Complaints
- `GET/POST /api/complaints`
- `GET/PUT/DELETE /api/complaints/:id`

### Mess
- `GET/POST /api/mess/config`
- `PUT /api/mess/config/:id`
- `GET/POST /api/mess/plans`
- `PUT /api/mess/plans/:id`

---

## What's Been Implemented (Phase 1 - Core MVP)
✅ Language Selector (shown on first visit, saves to localStorage)
✅ English/Hindi full bilingual support
✅ Email + Password authentication with JWT
✅ Role-based access (owner/warden/tenant)
✅ Owner Dashboard with bento grid stats
✅ Property Management (CRUD)
✅ Floor/Room/Bed hierarchical management
✅ Visual bed map (green=available, red=occupied, gray=maintenance)
✅ Tenant Onboarding (add, KYC status, bed allocation)
✅ Rent & Billing (create invoices, record payments, status tracking)
✅ Complaints Management (raise, assign, resolve, close)
✅ Mess Configuration (meal types, pricing, veg/non-veg)
✅ Meal Plan Assignment per tenant
✅ Reports & Analytics (bar chart revenue, pie charts, summary)
✅ Mobile-responsive design with bottom nav
✅ Language toggle in sidebar/header
✅ Warm amber/earthy theme throughout

---

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Tenant Portal (separate view for tenant role)
- [ ] Notification system (in-app + email reminders)
- [ ] Bulk invoice generation (generate all invoices for a property at once)

### P1 - Important
- [ ] Document upload for KYC (ID proof, agreement)
- [ ] PDF invoice generation and download
- [ ] Check-out workflow with final settlement
- [ ] Room switching with audit trail
- [ ] Prorated rent calculation for mid-month joins

### P2 - Enhancement
- [ ] Housekeeping schedules and cleaning management
- [ ] Broadcast announcements / notice board
- [ ] Maintenance request management
- [ ] Move-out notice workflow
- [ ] Attendance-based mess tracking (individual meal marking)
- [ ] Multi-language invoice PDF (Hindi/English)
- [ ] SLA tracking for complaints
- [ ] Password reset flow via email
- [ ] Admin-level user management

---

## Test Credentials (from testing)
- Email: TEST_owner2@pgsaathi.com
- Password: Test@1234
- Role: Owner

---

## Non-Functional Notes
- All backend routes prefixed with `/api`
- JWT stored in localStorage as `pgsaathi_token`
- Language stored in localStorage as `pgsaathi_language`
- MongoDB uses UUID strings for IDs (not ObjectId) for simplicity
- Hot reload enabled on both frontend and backend
