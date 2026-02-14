# Team Updates

A casual progress log of what's been built. Written in plain language so everyone can follow along.

---

## Week 1, Day 1-2 (Feb 2025)

### What Got Done

**Built the security foundation for the admin panel.** Here's what that means in plain terms:

1. **Admin login now works** — Admins can log in with email and password (different from regular users who use OTP codes). The login page talks to a new API endpoint that checks credentials against Supabase.

2. **Created a permissions system** — We now have roles: `admin`, `manager`, `staff`, and `public`. Each role can do different things. For example, only admins can manage other admin users, while managers can handle orders and products.

3. **Protected all admin routes** — If you try to access `/admin/dashboard` without being logged in, you get bounced to the login page. If you're logged in but don't have the right role, you get a "forbidden" page.

### Files Created/Modified

- `apps/frontend/app/api/auth/admin/login/route.ts` — The login API
- `apps/frontend/app/api/auth/admin/logout/route.ts` — The logout API
- `apps/frontend/lib/auth/` — Session helpers and route protection
- `apps/frontend/lib/rbac/` — The permissions system (RBAC = Role-Based Access Control)
- `apps/frontend/proxy.ts` — Protects admin routes at the network level
- `apps/frontend/scripts/` — Setup scripts to make testing easier

### Want to Test It Yourself?

Here's everything you need. Should take about 5 minutes.

**First, set up your environment variables.** Create a file called `.env.local` in `apps/frontend/` and add:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
You'll find all three values in your Supabase Dashboard under Project Settings → API. The URL is at the top, and the two keys are listed under "Project API keys".

**Next, set up the database.** Open `apps/backend/db/iris_new_schema.sql`, copy everything, paste it into Supabase's SQL Editor, and hit Run. That's it — all the tables, columns, and permissions are ready.

**Then, create a test admin account.** Claude made a script for this so you don't have to do it manually:
```bash
cd apps/frontend
set -a && source .env.local && set +a && npx tsx scripts/setup-admin-test.ts
```
When it finishes, you'll have a test account ready to go:
- **Email:** `admin@iris.test`
- **Password:** `TestAdmin123!`

**Finally, start the dev server and try it out:**
```bash
npm run dev
```
Head to http://localhost:3000/admin/login, enter the test credentials, and you should land on the admin dashboard.

### Something Not Working?

**"Role column does not exist"** — Your database schema is outdated. Re-run `apps/backend/db/iris_new_schema.sql` in Supabase SQL Editor (this is for initial setup, not migrations).

**"Permission denied for table profiles"** — Run this in Supabase SQL Editor:
```sql
GRANT ALL ON public.profiles TO authenticated, service_role, anon;
```

**Scripts complaining about missing environment variables** — Load the env file first:
```bash
set -a && source .env.local && set +a && npx tsx scripts/setup-admin-test.ts
```

---

## Week 1, Day 3-4 (Feb 2025)

### What Got Done

**Built the customer authentication API.** The backend is ready — you can create accounts, log in, manage profiles, and reset passwords. All through API endpoints:

- **Signup** (`POST /api/auth/signup`) — Create an account with email and password
- **Login** (`POST /api/auth/login`) — Log in and get a session
- **Logout** (`POST /api/auth/logout`) — End your session
- **Password reset** (`POST /api/auth/reset-password`) — Request a reset email
- **Profile** (`GET/PUT /api/profile`) — View and update your profile

### The API Works — Here's Proof

We wrote a test script that checks everything. It runs **16 tests** covering:

- Signup with valid data works
- Signup rejects bad emails and weak passwords
- Login works with correct credentials
- Login rejects wrong passwords
- Profile is protected (must be logged in to access)
- Profile updates work
- Users can't change their own role (security check)
- Logout clears the session

**To run the tests yourself:**
```bash
# Terminal 1 — start the server
cd apps/frontend
npm run dev

# Terminal 2 — run the tests
cd apps/frontend
bash scripts/test-auth-api.sh
```

You should see all 16 tests pass.

**Want to understand exactly what's being tested?** Open `apps/frontend/scripts/test-auth-api.sh` in your editor. It's written to be readable — each test shows the API call being made and what response we expect. You can trace through the logic to see exactly what's happening.

### What's Missing: The UI

**There's no way to test this in a browser yet.**

Unlike the admin login (which has a real page at `/admin/login`), the customer auth doesn't have UI pages connected to these API routes:

- The `/signup` page is just a placeholder
- The `/login` page exists but uses OTP codes, not email/password

**Someone needs to build:**
1. A signup page with email/password fields that calls `POST /api/auth/signup`
2. A login page (or update the existing one) that calls `POST /api/auth/login`
3. A profile page that calls `GET /api/profile` and `PUT /api/profile`

Once those pages exist, testing becomes simple:
- Go to `/signup`, create an account
- Go to `/login`, log in
- See your profile, update it
- Log out

Just like how you can already test admin login at `/admin/login`.

**The API is ready and waiting. It just needs a face.**

### Files Created

- `apps/frontend/app/api/auth/signup/route.ts`
- `apps/frontend/app/api/auth/login/route.ts`
- `apps/frontend/app/api/auth/logout/route.ts`
- `apps/frontend/app/api/auth/reset-password/route.ts`
- `apps/frontend/app/api/auth/callback/route.ts`
- `apps/frontend/app/api/profile/route.ts`
- `apps/frontend/scripts/test-auth-api.sh`

### API Reference

| Endpoint | Method | What it does |
|----------|--------|--------------|
| `/api/auth/signup` | POST | Create a new account |
| `/api/auth/login` | POST | Log in |
| `/api/auth/logout` | POST | Log out |
| `/api/auth/reset-password` | POST | Request password reset email |
| `/api/profile` | GET | Get your profile |
| `/api/profile` | PUT | Update your profile |

### Something Not Working?

**Tests failing with connection errors** — Make sure the dev server is running in another terminal.

**Tests failing for other reasons** — Check the test output. It shows exactly which test failed and why.

### Next Up

- Build the signup/login UI pages to connect to this API
- Week 2: Start building Products & Inventory API

---

## Week 1, Day 5 (Feb 2025)

### What Got Done

**Verified the permissions system works.** We ran 27 tests to confirm that admins, managers, staff, and customers all have exactly the access they should—no more, no less.

### Want to Test It Yourself?

Two steps:

**1. Create test users (one-time):**
```bash
cd apps/frontend
set -a && source .env.local && set +a && npx tsx scripts/setup-rbac-test-users.ts
```

**2. Run the tests:**
```bash
# Terminal 1 - start the server
npm run dev

# Terminal 2 - run the tests
bash scripts/test-rbac.sh
```

You should see all 27 tests pass.

### Test Accounts

| Email | Role | Password |
|-------|------|----------|
| `admin@iris.test` | admin | `TestUser123!` |
| `manager@iris.test` | manager | `TestUser123!` |
| `staff@iris.test` | staff | `TestUser123!` |
| `customer@iris.test` | public | `TestUser123!` |

### Files Created

- `apps/frontend/scripts/setup-rbac-test-users.ts` — Creates all test users
- `apps/frontend/scripts/test-rbac.sh` — Runs the test suite
- `apps/frontend/app/api/test/rbac/*/route.ts` — Test endpoints (5 files)

### What's Missing

- **Test endpoints are dev-only** — The `/api/test/rbac/*` routes should be removed before production. They exist purely to verify RBAC works.
- **No CI integration** — Tests run manually. No automated testing on push yet.
- **Manual browser verification** — To test in a browser, you'd need to log in as each user and try accessing different pages.

### Something Not Working?

**"User not found" errors** — Run the setup script to create test users.

**Tests failing with 401** — Make sure the dev server is running and test users were created.

**Tests failing with 500** — Check the dev server console for error details.

### Next Up

**Week 1 is complete!** We now have:
- Admin authentication (login/logout)
- Customer authentication (signup/login/logout/password reset)
- RBAC permissions system (verified with 27 tests)

**Week 2: Products & Inventory API** — Building the endpoints for managing products, categories, and inventory.

---

## Week 2, Day 1 (Feb 2025)

### What Got Done

**Fixed two major issues: slow admin dashboard and customer login flow.**

1. **Admin dashboard was excessively slow** — Every time you clicked a sidebar link, it took 1-2 seconds to navigate. The root cause: the proxy (middleware) was making **two network round-trips to Supabase on every page navigation** — one to verify the auth token, and another to query the `profiles` table for the user's role. We fixed this by caching the role in a short-lived HttpOnly cookie (`x-iris-role`, 5-minute TTL). Now only the first navigation after login hits the database; subsequent clicks read the role from the cookie.

2. **Customer login was sending magic links instead of OTP codes** — The login page UI asks the user to enter a 6-digit code, but Supabase was emailing a clickable link instead. This was a **Supabase dashboard configuration issue**, not a code issue. The fix: in Supabase Dashboard → Authentication → Email Templates, replace `{{ .ConfirmationURL }}` with `{{ .Token }}` in both the **Confirm signup** and **Magic Link** templates.

3. **Customer OTP login flow verified working** — Tested the full flow: enter email → receive OTP code → enter code → land on `/products`. Works end-to-end.

### Files Modified

- `apps/frontend/lib/supabase/proxy.ts` — Added role caching in a cookie to eliminate the DB query on every navigation
- `apps/frontend/app/api/auth/admin/logout/route.ts` — Clears the role cookie on admin logout
- `apps/frontend/app/api/auth/logout/route.ts` — Clears the role cookie on customer logout

### Supabase Dashboard Changes (Not in Code)

**Someone on the team needs to do this if setting up a new environment:**

1. Go to **Authentication → Configuration → Email Templates**
2. In both the **Confirm signup** and **Magic Link** templates, replace `{{ .ConfirmationURL }}` with `{{ .Token }}`
3. Example template:
   ```html
   <h2>Your verification code</h2>
   <p>Enter this code to continue:</p>
   <h1>{{ .Token }}</h1>
   <p>This code expires in 1 hour.</p>
   ```

### Something Not Working?

**Admin pages still slow after this update** — Clear your cookies or open an incognito window. The old session may not have the role cookie yet; it gets set on the first navigation.

**Customer login still sends a link instead of a code** — You need to update both email templates in the Supabase dashboard (see above). This is a dashboard setting, not a code change.

### Next Up

- Build out the `/products` page (customer-facing product browsing)
- Week 2: Products & Inventory API

---

## Week 2, Day 2 (Feb 2025)

### What Got Done

**Rebuilt the admin sidebar and polished the dashboard.** The admin panel now looks and feels like a real dashboard (think Supabase-style).

1. **Collapsible sidebar with icons** — The sidebar now sits flush against the left edge of the screen and spans the full viewport height. Each nav item has an icon (Dashboard, Products, Orders, etc.). When collapsed, you only see the icons. Hover over it and it smoothly expands to show the labels. Click the pin button at the top to keep it expanded.

2. **Active route highlighting** — Whichever page you're on gets highlighted in the sidebar automatically. No more guessing which page you're looking at.

3. **Dark sidebar, light content** — The sidebar uses a dark `slate-900` background with light text, matching the Supabase aesthetic. The content area stays light.

4. **Full-height layout** — The entire page structure changed. Instead of a centered card layout, the sidebar now stretches edge-to-edge from top to bottom. The header and main content sit to the right of it, with the content area scrollable independently.

5. **StatsCards got icons** — Each stat card on the dashboard now has a small icon in the top-right corner (dollar sign for sales, shopping cart for orders, etc.) plus helper text for context.

### Files Modified

- `apps/frontend/package.json` — Added `lucide-react` for icons
- `apps/frontend/app/admin/components/Sidebar.tsx` — Full rewrite: client component with icons, collapse/expand, pin toggle, active state, dark theme
- `apps/frontend/app/admin/(dashboard)/layout.tsx` — Restructured to full-height flex layout (sidebar left, header+content right)
- `apps/frontend/app/admin/components/Header.tsx` — Removed max-width centering so it fills its container
- `apps/frontend/app/admin/components/StatsCard.tsx` — Added optional icon prop
- `apps/frontend/app/admin/(dashboard)/page.tsx` — Added icons and helper text to stat cards

### Want to See It?

```bash
cd apps/frontend
npm install --legacy-peer-deps
npm run dev
```

Go to http://localhost:3000/admin/login, log in, and you'll see the new sidebar.

- **Hover** over the sidebar — it expands smoothly
- **Click the pin icon** (top of sidebar) — it stays expanded
- **Click different nav items** — the active one is highlighted
- **Look at the stat cards** — each has an icon and helper text

### Something Not Working?

**`npm install` fails with peer dependency errors** — Use `npm install --legacy-peer-deps`. This is because `react-paystack` hasn't updated its peer deps to support React 19 yet.

### Next Up

- Build out the `/products` page (customer-facing product browsing)
- Products & Inventory API

---

## Week 1, Wrap-Up — Frontend Gaps (Feb 2025)

### What Got Done

**Closed all the frontend gaps from Week 1.** The backend was 100% complete but the UI was missing pieces — signup was a stub, no password reset page, no profile page, no customer dashboard, no route protection, no mobile nav for admin. All fixed now.

Here's the full list:

1. **Signup page works** — Full form with email, password, confirm password, first name, last name, and phone number. Validates everything client-side (Zod + react-hook-form) before hitting the API. On success, redirects to `/login?registered=true` with a green success banner.

2. **Password reset page** — Simple email form at `/reset-password`. Submits to the existing API, shows a generic "check your inbox" message (doesn't reveal if the email exists — security best practice).

3. **Login page updated** — Now has links to signup and password reset at the bottom. Shows "Account created successfully" banner when arriving from signup.

4. **Auth layout** — All auth pages (login, signup, reset-password) share a centered layout with "Iris" branding at top and copyright at bottom. Cleaner than each page managing its own centering.

5. **Customer dashboard layout** — Horizontal header nav with Waitlist, Inner Circle, and Profile links. "Iris" brand links back to `/products`. Has a hamburger menu on mobile that drops down. Logout button included.

6. **Profile page** — Loads your profile from the API, lets you edit first name, last name, phone number, and notification preferences (email/SMS checkboxes). Shows success/error messages inline.

7. **Route protection** — Unauthenticated users get redirected:
   - `/profile`, `/inner-circle`, `/waitlist` → redirected to `/login`
   - `/admin/*` → redirected to `/admin/login` (this already worked, now unified in the same proxy)

8. **Admin mobile nav** — The sidebar now has a mobile overlay mode. On small screens, a hamburger button appears in the header. Tap it and the sidebar slides in over a dark backdrop. Tap the backdrop or a nav link to close it.

9. **Admin role-based menu filtering** — Sidebar nav items now have permission requirements. Staff only see Dashboard, Products, Orders, Inventory, and Customers. Managers see those plus Waitlist and Analytics. Admins see everything including Settings. The role is read from the `x-iris-role` cookie (set by the proxy).

10. **Breadcrumb component** — Reusable `<Breadcrumb />` component that auto-generates from the current URL path, or accepts manual items. Uses ChevronRight separators, slate color scheme. Exported from `components/ui`.

11. **Custom Zod resolver** — Small utility at `lib/validation/zod-resolver.ts` that bridges Zod schemas with react-hook-form, so we don't need the `@hookform/resolvers` package.

### Test Suite Added

**Set up Vitest + Testing Library from scratch** — the project had no test framework before this. Now has 82 tests across 10 files, all passing.

| Test File | Tests | Covers |
|-----------|-------|--------|
| `zod-resolver.test.ts` | 6 | Valid/invalid input, refine schemas |
| `login/page.test.tsx` | 9 | OTP flow, method toggle, registered banner, nav links |
| `signup/page.test.tsx` | 8 | Validation errors, 201 redirect, 409 conflict, network errors |
| `reset-password/page.test.tsx` | 6 | Submit success, API error, network error |
| `(dashboard)/layout.test.tsx` | 5 | Nav links, hamburger toggle, logout |
| `profile/page.test.tsx` | 6 | Loading state, data population, save/error, checkboxes |
| `Sidebar.test.tsx` | 8 | Role filtering (admin/manager/staff), mobile overlay, active state |
| `Header.test.tsx` | 6 | Hamburger visibility, logout |
| `Breadcrumb.test.tsx` | 6 | Auto-generate, manual items, separators, kebab-to-title |
| `proxy.test.ts` | 22 | Route protection logic, permission matrix, matcher regex |

**To run the tests:**
```bash
cd apps/frontend
npm test
```

### Files Created

| File | What |
|------|------|
| `lib/validation/zod-resolver.ts` | Custom Zod ↔ react-hook-form resolver |
| `lib/validation/index.ts` | Barrel export |
| `app/(auth)/layout.tsx` | Shared auth page layout |
| `app/(auth)/reset-password/page.tsx` | Password reset page |
| `app/(dashboard)/layout.tsx` | Customer dashboard layout with nav |
| `app/(dashboard)/profile/page.tsx` | Profile edit page |
| `components/ui/Breadcrumb.tsx` | Breadcrumb navigation component |
| `app/admin/components/AdminShell.tsx` | Client wrapper for admin layout (manages mobile state) |
| `vitest.config.ts` | Test framework config |
| `vitest.setup.ts` | Test setup (jest-dom matchers) |
| 10 test files | See table above |

### Files Modified

| File | What Changed |
|------|-------------|
| `app/(auth)/login/page.tsx` | Removed outer wrapper, added registered banner + nav links, added Suspense boundary |
| `app/(auth)/signup/page.tsx` | Full rewrite — real form with validation |
| `app/admin/(auth)/login/page.tsx` | Added Suspense boundary (build fix) |
| `app/admin/(dashboard)/layout.tsx` | Now reads role cookie server-side, passes to AdminShell |
| `app/admin/components/Sidebar.tsx` | Mobile overlay, permission filtering, role/mobileOpen/onClose props |
| `app/admin/components/Header.tsx` | Hamburger menu button on mobile, onMenuToggle prop |
| `components/ui/index.ts` | Exports Breadcrumb |
| `lib/supabase/proxy.ts` | Added customer route protection (/profile, /inner-circle, /waitlist) |
| `package.json` | Added test deps + scripts |

### Want to Test It?

```bash
cd apps/frontend
npm install --legacy-peer-deps
npm run dev
```

- Go to `/signup` — fill the form, submit, you'll land on `/login` with a success message
- Go to `/login` — see the links to signup and reset-password
- Go to `/reset-password` — enter an email, see the success message
- Open an incognito window, go to `/profile` — you'll be redirected to `/login`
- Log in, go to `/profile` — edit your name, save it
- Resize to mobile — see the hamburger menu in the customer dashboard
- Log in as admin, resize to mobile — hamburger toggles the sidebar overlay
- Log in as staff — sidebar only shows items you have permission for

### Something Not Working?

**`npm install` fails** — Use `npm install --legacy-peer-deps` (react-paystack peer dep issue).

**Tests failing** — Run `npm test` and check the output. All 82 should pass.

**Build failing** — Run `npm run build`. Should complete with 0 errors.

### Next Up

- Week 2: Products & Inventory API
- Build out the `/products` page (customer-facing product browsing)

---

## Week 2, Day 3 — NestJS Backend Migration (Feb 2025)

### What Got Done

**Migrated the entire backend from Next.js API routes to a proper NestJS application.** The old approach (handler functions in `app/api/`) worked for prototyping, but had no dependency injection, no service layer, and no real module boundaries. The new backend is a standalone NestJS app at `apps/backend/` with proper architecture.

### Why This Matters

- **Clean separation** — Frontend is just a frontend now. Backend has its own process, its own port (4000), its own dependency tree.
- **Dependency injection** — Services are injectable, testable, and swappable. No more importing Supabase directly in every route handler.
- **Module boundaries** — Auth, Profile, SMS, Payments are separate NestJS modules. Adding new features means adding a new module, not a new folder of loose files.
- **JWT-based auth** — Instead of Supabase session cookies, the backend now issues its own JWTs. Frontend stores the token and sends `Authorization: Bearer <token>` on every request. This is more standard and makes the backend stateless.

### Architecture

```
Frontend (Next.js, port 3000)      Backend (NestJS, port 4000)
  ├── Pages / UI                     ├── AuthModule (login, signup, logout, reset)
  ├── API client (lib/api/client.ts) ├── ProfileModule (GET/PUT profile)
  ├── Proxy (route protection)       ├── SmsModule (Termii integration)
  └── Auth callback (stays here)     ├── PaymentsModule (Paystack webhooks)
                                     ├── SupabaseModule (shared DB access)
                                     └── RBAC Guards + Decorators
```

### How Auth Works Now

1. User submits email + password on frontend
2. Frontend calls `POST http://localhost:4000/api/auth/login`
3. NestJS validates credentials against Supabase, fetches the user's role
4. NestJS signs a JWT with `{ sub: userId, email, role }` and returns it
5. Frontend stores the JWT in localStorage + a cookie (cookie is for proxy route protection)
6. All subsequent API requests include `Authorization: Bearer <token>`
7. NestJS verifies the JWT on every request (global guard)

**Important change for customer login:** Customer login now uses email + password (same as admin), not OTP codes. The OTP flow was removed from the login page.

### Running the Backend

```bash
# Terminal 1 — NestJS backend
cd apps/backend
npm install
npm run start:dev
# Runs on http://localhost:4000

# Terminal 2 — Next.js frontend
cd apps/frontend
npm run dev
# Runs on http://localhost:3000
```

**Both must be running for the app to work.** The frontend calls the backend for all auth and data operations.

### Backend Environment Variables

Create `apps/backend/.env` with:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=pick-a-strong-secret
JWT_EXPIRATION=24h

PAYSTACK_SECRET_KEY=your-paystack-secret

FRONTEND_URL=http://localhost:3000
PORT=4000
```

Also add to `apps/frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### API Endpoints (NestJS)

| Endpoint | Method | Auth | What it does |
|----------|--------|------|--------------|
| `/api/auth/login` | POST | Public | Login, returns JWT |
| `/api/auth/signup` | POST | Public | Create account |
| `/api/auth/logout` | POST | JWT | End session |
| `/api/auth/reset-password` | POST | Public | Send reset email |
| `/api/auth/admin/login` | POST | Public | Admin login (checks role), returns JWT |
| `/api/profile` | GET | JWT | Get your profile |
| `/api/profile` | PUT | JWT | Update your profile |
| `/api/webhooks/paystack` | POST | Signature | Paystack webhook (stub) |
| `/api/test/rbac/auth-only` | GET | JWT | Test: any authenticated user |
| `/api/test/rbac/admin-only` | GET | JWT + Role | Test: admin/manager/staff only |
| `/api/test/rbac/manager-only` | GET | JWT + Role | Test: admin/manager only |
| `/api/test/rbac/products-create` | GET | JWT + Permission | Test: products:create |
| `/api/test/rbac/orders-refund` | GET | JWT + Permission | Test: orders:refund |

### Files Created (Backend)

| File | What |
|------|------|
| `apps/backend/package.json` | NestJS dependencies |
| `apps/backend/tsconfig.json` | TypeScript config |
| `apps/backend/nest-cli.json` | NestJS CLI config |
| `apps/backend/src/main.ts` | Bootstrap, CORS, global pipes, `/api` prefix |
| `apps/backend/src/app.module.ts` | Root module wiring everything together |
| `apps/backend/src/common/supabase/` | SupabaseModule + SupabaseService |
| `apps/backend/src/common/guards/` | JwtAuthGuard, RolesGuard, PermissionsGuard |
| `apps/backend/src/common/decorators/` | @Public, @Roles, @RequirePermission, @CurrentUser |
| `apps/backend/src/common/rbac/permissions.ts` | Permissions matrix (mirror of frontend) |
| `apps/backend/src/auth/` | AuthModule, AuthController, AuthService, DTOs |
| `apps/backend/src/profile/` | ProfileModule, ProfileController, ProfileService, DTO |
| `apps/backend/src/sms/` | SmsModule, SmsService (Termii) |
| `apps/backend/src/payments/` | PaymentsModule, PaymentsController, PaymentsService |
| `apps/backend/src/test-rbac/` | RBAC test endpoints |

### Files Modified (Frontend)

| File | What Changed |
|------|-------------|
| `lib/api/client.ts` | **New** — fetch wrapper with JWT auth |
| `app/(auth)/login/page.tsx` | Switched from OTP to email/password via NestJS |
| `app/(auth)/signup/page.tsx` | Calls NestJS instead of Next.js API |
| `app/(auth)/reset-password/page.tsx` | Calls NestJS instead of Next.js API |
| `app/admin/(auth)/login/page.tsx` | Calls NestJS, stores JWT |
| `app/(dashboard)/profile/page.tsx` | Calls NestJS for profile GET/PUT |
| `app/(dashboard)/layout.tsx` | Logout calls NestJS + clears JWT |
| `app/admin/components/Header.tsx` | Logout calls NestJS + clears JWT |
| `app/admin/(dashboard)/layout.tsx` | Reads role from JWT cookie instead of x-iris-role |
| `lib/supabase/proxy.ts` | Route protection via JWT cookie (no more Supabase session) |
| `.env.local` | Added NEXT_PUBLIC_API_URL |

### What Stayed in Next.js

- **`/api/auth/callback`** — This handles browser OAuth redirects from Supabase and must stay in the frontend.
- **Proxy (route protection)** — Still runs in Next.js, but now reads the JWT cookie instead of Supabase session cookies.
- **All the old `/api/*` routes** — Still exist in the codebase but are no longer called by the frontend. Can be removed in a future cleanup.

### Something Not Working?

**"Login failed" with no details** — The NestJS backend isn't running. Start it with `cd apps/backend && npm run start:dev`.

**Port 4000 already in use** — Kill the old process: find it with `netstat -ano | grep :4000` then `taskkill /PID <id> /F` (Windows) or `kill <pid>` (Mac/Linux).

**CORS errors in browser console** — Make sure `FRONTEND_URL` in the backend `.env` matches your frontend URL exactly (including port).

**Admin login says "Account does not have admin access"** — Your account's role in the `profiles` table isn't `admin`, `manager`, or `staff`. Check it in Supabase.

### Next Up

- Remove old Next.js API routes (cleanup)
- Week 2: Products & Inventory API (now on NestJS)
- Add e2e tests for the new backend

---

## Week 2, Day 4 — OTP Email Verification After Signup (Feb 2025)

### What Got Done

**Added email verification to the signup flow.** Previously, signup used `auth.admin.createUser()` with `email_confirm: true` to skip verification — which meant anyone could sign up with a fake email. Now Supabase sends a real OTP code to the user's email, and they must enter it before their account is activated.

### How It Works Now

1. User fills out signup form → frontend calls `POST /api/auth/signup`
2. Backend calls `supabase.auth.signUp()` (instead of the old admin API) → Supabase sends an 8-digit OTP to the user's email
3. Frontend redirects to `/verify?email=user@example.com`
4. User enters the 8-digit code from their email
5. Frontend calls `POST /api/auth/verify-otp` with the email + code
6. Backend verifies the OTP with Supabase, creates the user's profile, signs a JWT, and returns it
7. Frontend stores the JWT and redirects to `/products` — user is logged in immediately

**Profile creation moved to verification.** The profile record (name, phone, role) is now created *after* OTP verification, not during signup. User metadata (first name, last name, phone) is stored in Supabase's `user_metadata` during signup and read back when creating the profile.

### The Verify Page

The `/verify` page has:
- **8 individual digit inputs** that auto-advance when you type and auto-submit when you enter the last digit
- **Paste support** — paste the full code and it fills all boxes + auto-submits
- **Backspace navigation** — pressing backspace on an empty box moves to the previous one
- **Resend code** button with a 60-second cooldown timer
- **"Use a different email"** link back to signup
- Matches the existing black/white minimalist auth styling

### API Endpoints Added

| Endpoint | Method | Auth | What it does |
|----------|--------|------|--------------|
| `/api/auth/verify-otp` | POST | Public | Verify the OTP code, create profile, return JWT |
| `/api/auth/resend-otp` | POST | Public | Resend the OTP email |

### Files Created

| File | What |
|------|------|
| `apps/backend/src/auth/dto/verify-otp.dto.ts` | VerifyOtpDto (email + 6-8 char token) and ResendOtpDto |
| `apps/frontend/app/(auth)/verify/page.tsx` | OTP verification page with 8-digit input |

### Files Modified

| File | What Changed |
|------|-------------|
| `apps/backend/src/auth/auth.service.ts` | Reverted signup from `admin.createUser()` to `auth.signUp()`, added `verifyOtp()` and `resendOtp()` methods |
| `apps/backend/src/auth/auth.controller.ts` | Added `POST /auth/verify-otp` and `POST /auth/resend-otp` endpoints |
| `apps/frontend/app/(auth)/signup/page.tsx` | Redirect changed from `/login?registered=true` to `/verify?email=<email>` |
| `apps/frontend/app/(auth)/login/page.tsx` | Removed "Account created successfully" banner (no longer needed), removed Suspense wrapper |

### Want to Test It?

```bash
# Terminal 1 — backend
cd apps/backend
npm run start:dev

# Terminal 2 — frontend
cd apps/frontend
npm run dev
```

1. **Delete any existing test user** from Supabase Dashboard → Authentication → Users (so you can sign up fresh)
2. Go to `/signup`, fill in the form with a **real email address**, submit
3. You should land on `/verify?email=your@email.com`
4. Check your email for an 8-digit code from Supabase
5. Enter the code (or paste it) → you should be logged in and redirected to `/products`
6. Try clicking "Resend code" — it should grey out for 60 seconds, and you'll get another email

### Something Not Working?

**No email received** — Check your spam folder. Also verify your Supabase project has email sending enabled (Authentication → Configuration → SMTP).

**"Token has expired or is invalid"** — OTP codes expire after 1 hour. Request a new one with the resend button.

**Still getting a 6-digit code** — Check your Supabase email template. The code length is configured in Supabase Dashboard → Authentication → Configuration. The backend accepts 6-8 digit codes.

### Next Up

- Week 2: Products & Inventory API
- Build out the `/products` page (customer-facing product browsing)

---

## Week 2, Day 5 — Products & Inventory System (Feb 2025)

### What Got Done

**Built the complete Products & Inventory system** — backend API, admin management pages, and customer-facing storefront. This is the core of the e-commerce platform that everything else (cart, orders, payments) depends on.

### Backend: Three New NestJS Modules

**ProductsModule** — Full product CRUD with 14 endpoints:

| Endpoint | Method | Auth | What it does |
|----------|--------|------|--------------|
| `/api/products` | GET | Public | Storefront: published products with images + variants |
| `/api/products/:idOrHandle` | GET | Public | Single product (by UUID or URL handle) |
| `/api/products/admin/list` | GET | `products:read` | Admin: all products including drafts/archived |
| `/api/products` | POST | `products:create` | Create product (optionally with inline variants) |
| `/api/products/:id` | PUT | `products:update` | Update product |
| `/api/products/:id` | DELETE | `products:delete` | Soft-delete (sets deleted_at) |
| `/api/products/:id/publish` | PATCH | `products:publish` | Toggle published flag |
| `/api/products/:id/variants` | POST | `products:create` | Add variant |
| `/api/products/:id/variants/:vid` | PUT | `products:update` | Update variant |
| `/api/products/:id/variants/:vid` | DELETE | `products:update` | Delete variant |
| `/api/products/:id/images` | POST | `products:update` | Add image (URL-based) |
| `/api/products/:id/images/:imgId` | DELETE | `products:update` | Remove image |
| `/api/products/:id/images/reorder` | PUT | `products:update` | Reorder images |

Key details:
- URL handles are auto-generated from the title (slugified), with `-2`, `-3` suffixes for uniqueness
- Public queries filter `deleted_at IS NULL` and `published = true`
- All list endpoints return paginated responses: `{ data, total, page, limit, totalPages }`

**InventoryModule** — Stock management with 6 endpoints:

| Endpoint | Method | Permission | What it does |
|----------|--------|------------|--------------|
| `/api/inventory` | GET | `inventory:read` | Variants with stock levels + product title |
| `/api/inventory/stats` | GET | `inventory:read` | Total SKUs, low stock count, out of stock count, total value |
| `/api/inventory/low-stock` | GET | `inventory:read` | Variants with quantity < 10 |
| `/api/inventory/adjust` | POST | `inventory:update` | Adjust stock for one variant |
| `/api/inventory/bulk-adjust` | POST | `inventory:update` | Adjust stock for multiple variants |
| `/api/inventory/movements` | GET | `inventory:read` | Movement history with filters |

Stock adjustments update the variant's `inventory_quantity` and log to the `inventory_movements` table with before/after quantities, movement type, and who made the change.

**CollectionsModule** — Product groupings with 8 endpoints:

| Endpoint | Method | Auth | What it does |
|----------|--------|------|--------------|
| `/api/collections` | GET | Public | Published collections |
| `/api/collections/:idOrHandle` | GET | Public | Single collection with its products |
| `/api/collections/admin/list` | GET | `products:read` | All collections |
| `/api/collections` | POST | `products:create` | Create collection |
| `/api/collections/:id` | PUT | `products:update` | Update collection |
| `/api/collections/:id` | DELETE | `products:delete` | Soft-delete |
| `/api/collections/:id/products` | POST | `products:update` | Add products to collection |
| `/api/collections/:id/products/:pid` | DELETE | `products:update` | Remove product from collection |

### Frontend: Admin Product Management

**Products list** (`/admin/products`) — Real data table replacing the old mock data:
- Search by product name, filter by status (active/draft/archived) and gender
- Table shows image thumbnail, title, SKU, status badge (colored pill), price, total stock
- Clickable rows navigate to product detail
- Pagination controls

**Product create** (`/admin/products/new`) — Full form with:
- Two-column layout: main content left, sidebar right
- Basic info: title, description, base price, compare-at price
- Sidebar: status dropdown, published checkbox, gender, product type, vendor, tags, URL handle
- Collections picker (multi-select from existing collections)

**Product edit** (`/admin/products/{id}`) — Same form plus:
- Variants editor: inline table with add/edit/delete, shows option value, SKU, price, stock
- Images editor: grid of image thumbnails with URL-based add, delete on hover
- Publish/Unpublish and Delete buttons in the header

**Inventory dashboard** (`/admin/inventory`) — Full inventory management:
- 4 stats cards at the top: Total SKUs, Low Stock (yellow), Out of Stock (red), Total Value
- Stock table with search, low-stock/out-of-stock filter, pagination
- "Adjust" button on each row opens a modal with: current stock, quantity change input, movement type dropdown, notes field, live preview of new quantity
- Toggleable movement history section showing all stock changes with type badges, date, quantity change, before/after values

### Frontend: Customer Storefront

**Product catalog** (`/products`) — Browse published products:
- Gender tabs (All / Men / Women / Unisex) at the top
- Search input and sort dropdown (Newest, Price Low→High, etc.)
- Responsive product grid (3 columns desktop, 2 tablet, 1 mobile)
- Product cards with image, title, price, "New" badge for items < 7 days old, hover zoom effect
- Pagination

**Product detail** (`/product/{handle}`) — Individual product page:
- Two-column layout: image gallery left, product info right
- Image gallery with main image + thumbnail strip (click to switch)
- Variant selector: option buttons (e.g. size/color) that update displayed price and availability
- Stock status indicator (green "In stock" / red "Out of stock")
- "Add to cart" button (placeholder — ready for cart implementation)
- Description section and tags
- Breadcrumb navigation

### Shared Infrastructure

**React Query** — Added `@tanstack/react-query` provider wrapping the entire app in `layout.tsx`. All data fetching uses React Query hooks with 30-second stale time and automatic cache invalidation on mutations.

**Reusable admin components:**
- `DataTable` — Enhanced with generic typing, custom render functions per column, loading skeleton state, clickable rows
- `StatusBadge` — Colored pills (green = active, yellow = draft, gray = archived)
- `Pagination` — Previous/Next with page indicator
- `SearchInput` — Debounced (300ms) text input with search icon

### Files Created

| Category | Files |
|----------|-------|
| Backend: Products | `products.module.ts`, `products.controller.ts`, `products.service.ts`, 5 DTOs |
| Backend: Inventory | `inventory.module.ts`, `inventory.controller.ts`, `inventory.service.ts`, 3 DTOs |
| Backend: Collections | `collections.module.ts`, `collections.controller.ts`, `collections.service.ts`, 3 DTOs |
| Frontend: Shared | `lib/query/providers.tsx`, `lib/api/products.ts`, `lib/api/inventory.ts`, `lib/api/collections.ts`, `lib/validation/product.ts` |
| Frontend: Admin | `StatusBadge.tsx`, `Pagination.tsx`, `SearchInput.tsx`, `ProductForm.tsx`, `VariantsEditor.tsx`, `ImagesEditor.tsx`, `CollectionsPicker.tsx`, `AdjustStockModal.tsx`, `MovementHistory.tsx` |
| Frontend: Storefront | `ProductCard.tsx`, `ProductGrid.tsx`, `ProductFilters.tsx`, `ImageGallery.tsx`, `VariantSelector.tsx` |

### Files Modified

| File | What Changed |
|------|-------------|
| `apps/backend/src/app.module.ts` | Registered ProductsModule, InventoryModule, CollectionsModule |
| `apps/frontend/app/layout.tsx` | Wrapped children with QueryProvider |
| `apps/frontend/app/admin/components/DataTable.tsx` | Added generics, render functions, loading skeletons, row click |
| `apps/frontend/app/admin/(dashboard)/products/page.tsx` | Replaced mock data with real API data |
| `apps/frontend/app/admin/(dashboard)/products/new/page.tsx` | Now renders ProductForm |
| `apps/frontend/app/admin/(dashboard)/products/[id]/page.tsx` | Full product edit page with publish/delete |
| `apps/frontend/app/admin/(dashboard)/inventory/page.tsx` | Full inventory dashboard |
| `apps/frontend/app/(shop)/products/page.tsx` | Full product catalog |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | Full product detail page |

### Want to Test It?

```bash
# Terminal 1 — backend
cd apps/backend
npm install
npm run start:dev

# Terminal 2 — frontend
cd apps/frontend
npm install --legacy-peer-deps
npm run dev
```

**Test the backend with curl:**
```bash
# Get a JWT first (log in as admin)
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@iris.test","password":"TestUser123!"}' | jq -r '.access_token')

# Create a product with variants
curl -X POST http://localhost:4000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Calm Candle",
    "base_price": 5500,
    "status": "active",
    "published": true,
    "gender": "unisex",
    "variants": [
      {"option1_name": "Size", "option1_value": "Small", "price": 5500, "sku": "CND-S", "inventory_quantity": 25},
      {"option1_name": "Size", "option1_value": "Large", "price": 8500, "sku": "CND-L", "inventory_quantity": 10}
    ]
  }'

# Browse public products (no auth needed)
curl http://localhost:4000/api/products

# Check inventory stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/inventory/stats

# Adjust stock
curl -X POST http://localhost:4000/api/inventory/adjust \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"variant_id": "<variant-id>", "quantity_change": -5, "movement_type": "sale", "notes": "Sold 5 units"}'
```

**Test the admin frontend:**
1. Go to `/admin/login`, log in as admin
2. `/admin/products` — should show real data table (create a product first if empty)
3. `/admin/products/new` — fill form, create product, verify it appears in list
4. `/admin/products/{id}` — edit product, manage variants and images
5. `/admin/inventory` — should show stats cards and stock table, try adjusting stock

**Test the storefront:**
1. Go to `/products` — should show published products in a grid
2. Filter by gender, search by name, change sort order
3. Click a product → detail page with images and variant selector

### Something Not Working?

**No products showing up on storefront** — Make sure the product has `published: true`. Draft/archived products only show in admin.

**"Variant not found" when adjusting stock** — Copy the variant ID from the product detail response, not the product ID.

**Admin product list empty but products exist** — Check that your JWT has a role with `products:read` permission (staff, manager, or admin).

### Next Up

- Cart & checkout functionality
- Order management
- Payment processing with Paystack

---

## Week 2, Day 6 — Bugfixes & Storefront Theme (Feb 2025)

### What Got Done

**Fixed three production-blocking bugs and added a light/dark theme toggle to the storefront.**

### Bug Fixes

1. **Products not loading (RLS permission denied)** — The Supabase service_role client wasn't properly bypassing Row Level Security because it was missing auth options. Fixed by adding `{ auth: { autoRefreshToken: false, persistSession: false } }` to the admin client in `supabase.service.ts`.

2. **Product images returning 404** — The `src` URLs stored in the `product_images` table didn't match the actual filenames in Supabase Storage (old filenames from a previous upload). Wrote a migration script that scanned all storage buckets, matched files to DB records by product handle, and updated all 237 image URLs. Also added a `resolveImageUrl()` helper in the products service that converts storage paths to full public URLs (handles both full URLs and relative storage paths).

3. **SQL grants needed** — If you get `42501 permission denied` errors, run this in Supabase SQL Editor:
   ```sql
   GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
   ```

### Storefront Theme

**Light theme is now the default.** Previously the store followed the OS dark mode preference, which made text invisible on dark backgrounds. Now:

- **Default is light** — white background, dark text, clean and readable
- **Dark mode toggle** — moon/sun icon button in the header. Click to switch. Preference is saved in `localStorage` so it persists across visits
- **All shop components support both themes** — every component has `dark:` Tailwind variants for backgrounds, text, borders, buttons, inputs, badges, etc.

**Shop header added** — The storefront now has a proper header with:
- IRIS logo (links to home)
- Shop and Cart navigation links
- Dark mode toggle button
- Responsive design

**Homepage redirects to /products** — The old Next.js boilerplate landing page has been replaced with a redirect to the product catalog.

### How Dark Mode Works

- Uses Tailwind CSS v4 class-based dark mode (`@custom-variant dark`)
- `.dark` class on `<html>` element toggles all `dark:` utilities
- `color-scheme: light` set on `<html>` to prevent browser auto-dark
- Theme state managed by `ThemeProvider` context at `lib/theme/theme-provider.tsx`
- Persisted in `localStorage` as `iris-theme` (values: `"light"` or `"dark"`)

### Files Created

| File | What |
|------|------|
| `apps/frontend/app/(shop)/layout.tsx` | Shop layout with header, nav, and dark mode toggle |
| `apps/frontend/lib/theme/theme-provider.tsx` | Theme context provider with localStorage persistence |

### Files Modified

| File | What Changed |
|------|-------------|
| `apps/backend/src/common/supabase/supabase.service.ts` | Added auth options to admin client for proper RLS bypass |
| `apps/backend/src/products/products.service.ts` | Added `resolveImageUrl()` and `resolveProductImages()` helpers, injected ConfigService |
| `apps/frontend/app/globals.css` | Switched from `prefers-color-scheme` to class-based dark mode, explicit light defaults |
| `apps/frontend/app/layout.tsx` | Added `colorScheme: "light"` on `<html>` |
| `apps/frontend/app/page.tsx` | Replaced Next.js boilerplate with redirect to `/products` |
| `apps/frontend/app/(shop)/components/ProductCard.tsx` | Added `dark:` variants |
| `apps/frontend/app/(shop)/components/ProductGrid.tsx` | Added `dark:` variants |
| `apps/frontend/app/(shop)/components/ProductFilters.tsx` | Added `dark:` variants for tabs, inputs, select |
| `apps/frontend/app/(shop)/components/ImageGallery.tsx` | Added `dark:` variants |
| `apps/frontend/app/(shop)/components/VariantSelector.tsx` | Added `dark:` variants |
| `apps/frontend/app/(shop)/products/page.tsx` | Added `dark:` variants for skeletons, pagination, heading |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | Added `dark:` variants for all text, buttons, tags, breadcrumbs |

### Something Not Working?

**Store still looks dark** — Clear localStorage: open browser console and run `localStorage.removeItem("iris-theme")`, then refresh. If your OS is in dark mode, the `color-scheme: light` fix should override it.

**Images still not showing** — The image URL fix was a one-time DB migration. If you add new images, make sure the `src` is either a full URL (`https://...`) or a valid Supabase storage path (`product-images/originals/...`).

### Next Up

- Cart & checkout functionality
- Order management
- Payment processing with Paystack

---

## Week 3, Day 1 — Cart, Checkout, Orders & Payments (Feb 2025)

### What Got Done

**Built the complete purchasing flow** — from adding items to cart, through Paystack payment, to order management for both customers and admins. This is the feature that turns browsing into revenue.

### Phase 1: Cart System

**Cart lives in localStorage** — no backend needed. Fast, works offline, persists across page refreshes.

- **Cart context** (`lib/cart/`) — `CartProvider` wraps the shop layout. Uses `useReducer` internally with actions: ADD, REMOVE, UPDATE_QTY, CLEAR, HYDRATE. Hydrates from `localStorage("iris_cart")` in `useEffect` (SSR-safe). Persists on every change.
- **`useCart()` hook** — returns `items`, `itemCount`, `subtotal`, `addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()`
- **Cart badge** — Shows item count next to "Cart" in the shop header. Black circle with white number (inverted in dark mode).
- **Product page wired** — "Add to cart" button now works. Adds the selected variant with product title, price, and image. Button text changes to "Added!" for 2 seconds.
- **Cart page** (`/cart`) — Full cart with item image, title, variant info, quantity controls (±), remove button, subtotal, "Proceed to checkout" link, and empty state. Dark mode support.

### Phase 2: Orders Backend (NestJS)

**New `OrdersModule`** with 7 endpoints:

| Endpoint | Method | Auth | What it does |
|----------|--------|------|--------------|
| `/api/orders` | POST | JWT | Create order after payment |
| `/api/orders/my` | GET | JWT | Customer's own orders (paginated) |
| `/api/orders/my/:id` | GET | JWT | Customer's own order detail |
| `/api/orders/admin/list` | GET | `orders:read` | Admin list with search/status/date filters |
| `/api/orders/admin/:id` | GET | `orders:read` | Admin order detail |
| `/api/orders/admin/:id/status` | PATCH | `orders:update` | Update order status |
| `/api/orders/:id/cancel` | POST | JWT | Cancel own order (pending/paid only) |

**Key logic:**
- `generateOrderNumber()` — Auto-increments from `IRD-000001`
- `create()` — Validates stock → inserts order (status='paid') → inserts order_items → deducts inventory with `movement_type='sale'` → returns full order
- `cancelOrder()` — Only if pending/paid. Sets status='cancelled', restores inventory with `movement_type='cancellation_reversal'`
- `confirmPayment()` — Called by Paystack webhook to confirm payment status

**Paystack webhook completed** — `handleWebhook()` in `PaymentsService` now handles `charge.success` events by looking up the order by `payment_reference` and confirming payment.

### Phase 3: Checkout + Paystack Integration

**Checkout page** (`/checkout`) — Two-column layout:
- **Left:** Shipping form (full name, address, city, region, postal code, phone) with inline validation
- **Right:** Order summary showing cart items and total, with Paystack payment button
- **Auth required** — redirects to `/login?redirect=/checkout` if not logged in
- **Email auto-detected** from JWT token

**Payment flow:**
1. User fills shipping form, clicks "Pay GH₵{total}"
2. Form validates (required fields check)
3. Reference generated: `IRD-{timestamp}-{random4}`
4. Paystack popup opens (amount in pesewas, currency GHS)
5. On success → `POST /api/orders` with cart items + address + reference
6. Cart cleared → redirect to `/checkout/confirmation?order={orderNumber}`

**Confirmation page** (`/checkout/confirmation`) — Shows green checkmark, order number, links to "View my orders" and "Continue shopping". Wrapped in Suspense for `useSearchParams()`.

### Phase 4: Orders UI

**Admin orders** (`/admin/orders`):
- Real data via `useAdminOrders()` hook replacing mock data
- Search by order number or email
- Status filter dropdown (pending/paid/processing/shipped/delivered/cancelled/refunded)
- DataTable with order number, customer email, status badge, total, date
- Pagination
- Click row → order detail

**Admin order detail** (`/admin/orders/{id}`):
- Items table with product name, variant, qty, unit price, total
- Summary card with subtotal/discount/shipping/total
- Customer info and shipping address
- Status update: dropdown + notes + tracking number/carrier fields (shown for shipped/delivered)
- Status timeline from `order_status_history`

**Customer orders** (`/orders`):
- Order history list with order number, date, item count, status badge, total
- Click → order detail (read-only)
- Cancel button for pending/paid orders (with confirmation dialog)
- Order timeline showing status changes
- Shipping address and tracking info when available

**Status badges updated** — `StatusBadge` component now supports order statuses: pending (yellow), paid (blue), processing (indigo), shipped (purple), delivered (green), cancelled (red), refunded (gray).

**Dashboard nav** — Added "Orders" link to customer dashboard navigation.

### Files Created

| Category | File | What |
|----------|------|------|
| Cart | `lib/cart/cart-context.tsx` | CartProvider + useCart hook |
| Cart | `lib/cart/index.ts` | Re-exports |
| Backend | `orders/orders.module.ts` | NestJS module |
| Backend | `orders/orders.controller.ts` | 7 endpoints |
| Backend | `orders/orders.service.ts` | Business logic |
| Backend | `orders/dto/create-order.dto.ts` | Create order DTO |
| Backend | `orders/dto/query-orders.dto.ts` | Query filters DTO |
| Backend | `orders/dto/update-order-status.dto.ts` | Status update DTO |
| Frontend | `lib/api/orders.ts` | Types + React Query hooks |
| Frontend | `app/(shop)/checkout/confirmation/page.tsx` | Order confirmation |
| Frontend | `app/(dashboard)/orders/page.tsx` | Customer order history |
| Frontend | `app/(dashboard)/orders/[id]/page.tsx` | Customer order detail |

### Files Modified

| File | What Changed |
|------|-------------|
| `apps/backend/src/app.module.ts` | Added OrdersModule |
| `apps/backend/src/payments/payments.module.ts` | Imports OrdersModule |
| `apps/backend/src/payments/payments.service.ts` | Webhook handles `charge.success` |
| `apps/frontend/app/(shop)/layout.tsx` | CartProvider + cart badge |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | Add to cart wired |
| `apps/frontend/app/(shop)/cart/page.tsx` | Full cart page |
| `apps/frontend/app/(shop)/checkout/page.tsx` | Full checkout with Paystack |
| `apps/frontend/app/admin/(dashboard)/orders/page.tsx` | Real data + filters |
| `apps/frontend/app/admin/(dashboard)/orders/[id]/page.tsx` | Full detail + status management |
| `apps/frontend/app/admin/components/StatusBadge.tsx` | Order status colors |
| `apps/frontend/app/(dashboard)/layout.tsx` | Orders nav link |
| `apps/frontend/lib/paystack/client.ts` | Added `currency: "GHS"` |

### Want to Test It?

```bash
# Terminal 1 — backend
cd apps/backend
npm run start:dev

# Terminal 2 — frontend
cd apps/frontend
npm run dev
```

**Test the cart:**
1. Go to `/products`, click a product
2. Select a variant, click "Add to cart" — button says "Added!" for 2s
3. Check the cart badge in header — should show count
4. Go to `/cart` — see items, adjust quantities, remove items
5. Refresh the page — cart persists

**Test checkout:**
1. Add items to cart, click "Proceed to checkout"
2. If not logged in, you'll be redirected to `/login`
3. Fill shipping form, click "Pay GH₵{total}"
4. Paystack popup opens (use test card: 4084 0840 8408 4081, any future expiry, any CVV)
5. On success → order created → cart cleared → confirmation page

**Test admin orders:**
1. Log in as admin at `/admin/login`
2. Go to `/admin/orders` — see the order you just placed
3. Click the order → see full detail with items, shipping, timeline
4. Update status to "processing" → see timeline entry added

**Test customer orders:**
1. Log in as customer
2. Go to `/orders` — see your order history
3. Click an order → see detail with items and timeline
4. Try cancelling a pending/paid order

### Something Not Working?

**Paystack popup not opening** — Make sure `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is set in `apps/frontend/.env.local`. Get it from Paystack Dashboard → Settings → API Keys & Webhooks.

**"Insufficient stock" error** — The product variant doesn't have enough `inventory_quantity`. Adjust stock in `/admin/inventory`.

**Order not created after payment** — Check the backend console for errors. The order creation requires valid variant IDs and sufficient stock.

**Webhook not confirming payment** — Webhooks only work with a public URL. For local testing, use `ngrok` to tunnel to port 4000 and set the URL in Paystack Dashboard → Settings → Webhooks.

### Next Up

- Email notifications (order confirmation, shipping updates)
- Discount codes / coupons
- Customer reviews
- Analytics dashboard with real order data

---

*Last updated: February 2025*
