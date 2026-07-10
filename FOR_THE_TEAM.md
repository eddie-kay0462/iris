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

Head to [http://localhost:3000/admin/login](http://localhost:3000/admin/login), enter the test credentials, and you should land on the admin dashboard.

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


| Endpoint                   | Method | What it does                 |
| -------------------------- | ------ | ---------------------------- |
| `/api/auth/signup`         | POST   | Create a new account         |
| `/api/auth/login`          | POST   | Log in                       |
| `/api/auth/logout`         | POST   | Log out                      |
| `/api/auth/reset-password` | POST   | Request password reset email |
| `/api/profile`             | GET    | Get your profile             |
| `/api/profile`             | PUT    | Update your profile          |


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


| Email                | Role    | Password       |
| -------------------- | ------- | -------------- |
| `admin@iris.test`    | admin   | `TestUser123!` |
| `manager@iris.test`  | manager | `TestUser123!` |
| `staff@iris.test`    | staff   | `TestUser123!` |
| `customer@iris.test` | public  | `TestUser123!` |


### Files Created

- `apps/frontend/scripts/setup-rbac-test-users.ts` — Creates all test users
- `apps/frontend/scripts/test-rbac.sh` — Runs the test suite
- `apps/frontend/app/api/test/rbac/*/route.ts` — Test endpoints (5 files)

### What's Missing

- **Test endpoints are dev-only** — The `/api/test/rbac/`* routes should be removed before production. They exist purely to verify RBAC works.
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

Go to [http://localhost:3000/admin/login](http://localhost:3000/admin/login), log in, and you'll see the new sidebar.

- **Hover** over the sidebar — it expands smoothly
- **Click the pin icon** (top of sidebar) — it stays expanded
- **Click different nav items** — the active one is highlighted
- **Look at the stat cards** — each has an icon and helper text

### Something Not Working?

`**npm install` fails with peer dependency errors** — Use `npm install --legacy-peer-deps`. This is because `react-paystack` hasn't updated its peer deps to support React 19 yet.

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
  - `/admin/`* → redirected to `/admin/login` (this already worked, now unified in the same proxy)
8. **Admin mobile nav** — The sidebar now has a mobile overlay mode. On small screens, a hamburger button appears in the header. Tap it and the sidebar slides in over a dark backdrop. Tap the backdrop or a nav link to close it.
9. **Admin role-based menu filtering** — Sidebar nav items now have permission requirements. Staff only see Dashboard, Products, Orders, Inventory, and Customers. Managers see those plus Waitlist and Analytics. Admins see everything including Settings. The role is read from the `x-iris-role` cookie (set by the proxy).
10. **Breadcrumb component** — Reusable `<Breadcrumb />` component that auto-generates from the current URL path, or accepts manual items. Uses ChevronRight separators, slate color scheme. Exported from `components/ui`.
11. **Custom Zod resolver** — Small utility at `lib/validation/zod-resolver.ts` that bridges Zod schemas with react-hook-form, so we don't need the `@hookform/resolvers` package.

### Test Suite Added

**Set up Vitest + Testing Library from scratch** — the project had no test framework before this. Now has 82 tests across 10 files, all passing.


| Test File                      | Tests | Covers                                                             |
| ------------------------------ | ----- | ------------------------------------------------------------------ |
| `zod-resolver.test.ts`         | 6     | Valid/invalid input, refine schemas                                |
| `login/page.test.tsx`          | 9     | OTP flow, method toggle, registered banner, nav links              |
| `signup/page.test.tsx`         | 8     | Validation errors, 201 redirect, 409 conflict, network errors      |
| `reset-password/page.test.tsx` | 6     | Submit success, API error, network error                           |
| `(dashboard)/layout.test.tsx`  | 5     | Nav links, hamburger toggle, logout                                |
| `profile/page.test.tsx`        | 6     | Loading state, data population, save/error, checkboxes             |
| `Sidebar.test.tsx`             | 8     | Role filtering (admin/manager/staff), mobile overlay, active state |
| `Header.test.tsx`              | 6     | Hamburger visibility, logout                                       |
| `Breadcrumb.test.tsx`          | 6     | Auto-generate, manual items, separators, kebab-to-title            |
| `proxy.test.ts`                | 22    | Route protection logic, permission matrix, matcher regex           |


**To run the tests:**

```bash
cd apps/frontend
npm test
```

### Files Created


| File                                  | What                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `lib/validation/zod-resolver.ts`      | Custom Zod ↔ react-hook-form resolver                  |
| `lib/validation/index.ts`             | Barrel export                                          |
| `app/(auth)/layout.tsx`               | Shared auth page layout                                |
| `app/(auth)/reset-password/page.tsx`  | Password reset page                                    |
| `app/(dashboard)/layout.tsx`          | Customer dashboard layout with nav                     |
| `app/(dashboard)/profile/page.tsx`    | Profile edit page                                      |
| `components/ui/Breadcrumb.tsx`        | Breadcrumb navigation component                        |
| `app/admin/components/AdminShell.tsx` | Client wrapper for admin layout (manages mobile state) |
| `vitest.config.ts`                    | Test framework config                                  |
| `vitest.setup.ts`                     | Test setup (jest-dom matchers)                         |
| 10 test files                         | See table above                                        |


### Files Modified


| File                               | What Changed                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `app/(auth)/login/page.tsx`        | Removed outer wrapper, added registered banner + nav links, added Suspense boundary |
| `app/(auth)/signup/page.tsx`       | Full rewrite — real form with validation                                            |
| `app/admin/(auth)/login/page.tsx`  | Added Suspense boundary (build fix)                                                 |
| `app/admin/(dashboard)/layout.tsx` | Now reads role cookie server-side, passes to AdminShell                             |
| `app/admin/components/Sidebar.tsx` | Mobile overlay, permission filtering, role/mobileOpen/onClose props                 |
| `app/admin/components/Header.tsx`  | Hamburger menu button on mobile, onMenuToggle prop                                  |
| `components/ui/index.ts`           | Exports Breadcrumb                                                                  |
| `lib/supabase/proxy.ts`            | Added customer route protection (/profile, /inner-circle, /waitlist)                |
| `package.json`                     | Added test deps + scripts                                                           |


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

`**npm install` fails** — Use `npm install --legacy-peer-deps` (react-paystack peer dep issue).

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


| Endpoint                         | Method | Auth             | What it does                           |
| -------------------------------- | ------ | ---------------- | -------------------------------------- |
| `/api/auth/login`                | POST   | Public           | Login, returns JWT                     |
| `/api/auth/signup`               | POST   | Public           | Create account                         |
| `/api/auth/logout`               | POST   | JWT              | End session                            |
| `/api/auth/reset-password`       | POST   | Public           | Send reset email                       |
| `/api/auth/admin/login`          | POST   | Public           | Admin login (checks role), returns JWT |
| `/api/profile`                   | GET    | JWT              | Get your profile                       |
| `/api/profile`                   | PUT    | JWT              | Update your profile                    |
| `/api/webhooks/paystack`         | POST   | Signature        | Paystack webhook (stub)                |
| `/api/test/rbac/auth-only`       | GET    | JWT              | Test: any authenticated user           |
| `/api/test/rbac/admin-only`      | GET    | JWT + Role       | Test: admin/manager/staff only         |
| `/api/test/rbac/manager-only`    | GET    | JWT + Role       | Test: admin/manager only               |
| `/api/test/rbac/products-create` | GET    | JWT + Permission | Test: products:create                  |
| `/api/test/rbac/orders-refund`   | GET    | JWT + Permission | Test: orders:refund                    |


### Files Created (Backend)


| File                                          | What                                                  |
| --------------------------------------------- | ----------------------------------------------------- |
| `apps/backend/package.json`                   | NestJS dependencies                                   |
| `apps/backend/tsconfig.json`                  | TypeScript config                                     |
| `apps/backend/nest-cli.json`                  | NestJS CLI config                                     |
| `apps/backend/src/main.ts`                    | Bootstrap, CORS, global pipes, `/api` prefix          |
| `apps/backend/src/app.module.ts`              | Root module wiring everything together                |
| `apps/backend/src/common/supabase/`           | SupabaseModule + SupabaseService                      |
| `apps/backend/src/common/guards/`             | JwtAuthGuard, RolesGuard, PermissionsGuard            |
| `apps/backend/src/common/decorators/`         | @Public, @Roles, @RequirePermission, @CurrentUser     |
| `apps/backend/src/common/rbac/permissions.ts` | Permissions matrix (mirror of frontend)               |
| `apps/backend/src/auth/`                      | AuthModule, AuthController, AuthService, DTOs         |
| `apps/backend/src/profile/`                   | ProfileModule, ProfileController, ProfileService, DTO |
| `apps/backend/src/sms/`                       | SmsModule, SmsService (Termii)                        |
| `apps/backend/src/payments/`                  | PaymentsModule, PaymentsController, PaymentsService   |
| `apps/backend/src/test-rbac/`                 | RBAC test endpoints                                   |


### Files Modified (Frontend)


| File                                 | What Changed                                               |
| ------------------------------------ | ---------------------------------------------------------- |
| `lib/api/client.ts`                  | **New** — fetch wrapper with JWT auth                      |
| `app/(auth)/login/page.tsx`          | Switched from OTP to email/password via NestJS             |
| `app/(auth)/signup/page.tsx`         | Calls NestJS instead of Next.js API                        |
| `app/(auth)/reset-password/page.tsx` | Calls NestJS instead of Next.js API                        |
| `app/admin/(auth)/login/page.tsx`    | Calls NestJS, stores JWT                                   |
| `app/(dashboard)/profile/page.tsx`   | Calls NestJS for profile GET/PUT                           |
| `app/(dashboard)/layout.tsx`         | Logout calls NestJS + clears JWT                           |
| `app/admin/components/Header.tsx`    | Logout calls NestJS + clears JWT                           |
| `app/admin/(dashboard)/layout.tsx`   | Reads role from JWT cookie instead of x-iris-role          |
| `lib/supabase/proxy.ts`              | Route protection via JWT cookie (no more Supabase session) |
| `.env.local`                         | Added NEXT_PUBLIC_API_URL                                  |


### What Stayed in Next.js

- `**/api/auth/callback`** — This handles browser OAuth redirects from Supabase and must stay in the frontend.
- **Proxy (route protection)** — Still runs in Next.js, but now reads the JWT cookie instead of Supabase session cookies.
- **All the old `/api/`* routes** — Still exist in the codebase but are no longer called by the frontend. Can be removed in a future cleanup.

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


| Endpoint               | Method | Auth   | What it does                                    |
| ---------------------- | ------ | ------ | ----------------------------------------------- |
| `/api/auth/verify-otp` | POST   | Public | Verify the OTP code, create profile, return JWT |
| `/api/auth/resend-otp` | POST   | Public | Resend the OTP email                            |


### Files Created


| File                                          | What                                                   |
| --------------------------------------------- | ------------------------------------------------------ |
| `apps/backend/src/auth/dto/verify-otp.dto.ts` | VerifyOtpDto (email + 6-8 char token) and ResendOtpDto |
| `apps/frontend/app/(auth)/verify/page.tsx`    | OTP verification page with 8-digit input               |


### Files Modified


| File                                       | What Changed                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/auth/auth.service.ts`    | Reverted signup from `admin.createUser()` to `auth.signUp()`, added `verifyOtp()` and `resendOtp()` methods |
| `apps/backend/src/auth/auth.controller.ts` | Added `POST /auth/verify-otp` and `POST /auth/resend-otp` endpoints                                         |
| `apps/frontend/app/(auth)/signup/page.tsx` | Redirect changed from `/login?registered=true` to `/verify?email=<email>`                                   |
| `apps/frontend/app/(auth)/login/page.tsx`  | Removed "Account created successfully" banner (no longer needed), removed Suspense wrapper                  |


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


| Endpoint                           | Method | Auth               | What it does                                          |
| ---------------------------------- | ------ | ------------------ | ----------------------------------------------------- |
| `/api/products`                    | GET    | Public             | Storefront: published products with images + variants |
| `/api/products/:idOrHandle`        | GET    | Public             | Single product (by UUID or URL handle)                |
| `/api/products/admin/list`         | GET    | `products:read`    | Admin: all products including drafts/archived         |
| `/api/products`                    | POST   | `products:create`  | Create product (optionally with inline variants)      |
| `/api/products/:id`                | PUT    | `products:update`  | Update product                                        |
| `/api/products/:id`                | DELETE | `products:delete`  | Soft-delete (sets deleted_at)                         |
| `/api/products/:id/publish`        | PATCH  | `products:publish` | Toggle published flag                                 |
| `/api/products/:id/variants`       | POST   | `products:create`  | Add variant                                           |
| `/api/products/:id/variants/:vid`  | PUT    | `products:update`  | Update variant                                        |
| `/api/products/:id/variants/:vid`  | DELETE | `products:update`  | Delete variant                                        |
| `/api/products/:id/images`         | POST   | `products:update`  | Add image (URL-based)                                 |
| `/api/products/:id/images/:imgId`  | DELETE | `products:update`  | Remove image                                          |
| `/api/products/:id/images/reorder` | PUT    | `products:update`  | Reorder images                                        |


Key details:

- URL handles are auto-generated from the title (slugified), with `-2`, `-3` suffixes for uniqueness
- Public queries filter `deleted_at IS NULL` and `published = true`
- All list endpoints return paginated responses: `{ data, total, page, limit, totalPages }`

**InventoryModule** — Stock management with 6 endpoints:


| Endpoint                     | Method | Permission         | What it does                                                 |
| ---------------------------- | ------ | ------------------ | ------------------------------------------------------------ |
| `/api/inventory`             | GET    | `inventory:read`   | Variants with stock levels + product title                   |
| `/api/inventory/stats`       | GET    | `inventory:read`   | Total SKUs, low stock count, out of stock count, total value |
| `/api/inventory/low-stock`   | GET    | `inventory:read`   | Variants with quantity < 10                                  |
| `/api/inventory/adjust`      | POST   | `inventory:update` | Adjust stock for one variant                                 |
| `/api/inventory/bulk-adjust` | POST   | `inventory:update` | Adjust stock for multiple variants                           |
| `/api/inventory/movements`   | GET    | `inventory:read`   | Movement history with filters                                |


Stock adjustments update the variant's `inventory_quantity` and log to the `inventory_movements` table with before/after quantities, movement type, and who made the change.

**CollectionsModule** — Product groupings with 8 endpoints:


| Endpoint                             | Method | Auth              | What it does                        |
| ------------------------------------ | ------ | ----------------- | ----------------------------------- |
| `/api/collections`                   | GET    | Public            | Published collections               |
| `/api/collections/:idOrHandle`       | GET    | Public            | Single collection with its products |
| `/api/collections/admin/list`        | GET    | `products:read`   | All collections                     |
| `/api/collections`                   | POST   | `products:create` | Create collection                   |
| `/api/collections/:id`               | PUT    | `products:update` | Update collection                   |
| `/api/collections/:id`               | DELETE | `products:delete` | Soft-delete                         |
| `/api/collections/:id/products`      | POST   | `products:update` | Add products to collection          |
| `/api/collections/:id/products/:pid` | DELETE | `products:update` | Remove product from collection      |


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


| Category             | Files                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend: Products    | `products.module.ts`, `products.controller.ts`, `products.service.ts`, 5 DTOs                                                                                                               |
| Backend: Inventory   | `inventory.module.ts`, `inventory.controller.ts`, `inventory.service.ts`, 3 DTOs                                                                                                            |
| Backend: Collections | `collections.module.ts`, `collections.controller.ts`, `collections.service.ts`, 3 DTOs                                                                                                      |
| Frontend: Shared     | `lib/query/providers.tsx`, `lib/api/products.ts`, `lib/api/inventory.ts`, `lib/api/collections.ts`, `lib/validation/product.ts`                                                             |
| Frontend: Admin      | `StatusBadge.tsx`, `Pagination.tsx`, `SearchInput.tsx`, `ProductForm.tsx`, `VariantsEditor.tsx`, `ImagesEditor.tsx`, `CollectionsPicker.tsx`, `AdjustStockModal.tsx`, `MovementHistory.tsx` |
| Frontend: Storefront | `ProductCard.tsx`, `ProductGrid.tsx`, `ProductFilters.tsx`, `ImageGallery.tsx`, `VariantSelector.tsx`                                                                                       |


### Files Modified


| File                                                         | What Changed                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `apps/backend/src/app.module.ts`                             | Registered ProductsModule, InventoryModule, CollectionsModule  |
| `apps/frontend/app/layout.tsx`                               | Wrapped children with QueryProvider                            |
| `apps/frontend/app/admin/components/DataTable.tsx`           | Added generics, render functions, loading skeletons, row click |
| `apps/frontend/app/admin/(dashboard)/products/page.tsx`      | Replaced mock data with real API data                          |
| `apps/frontend/app/admin/(dashboard)/products/new/page.tsx`  | Now renders ProductForm                                        |
| `apps/frontend/app/admin/(dashboard)/products/[id]/page.tsx` | Full product edit page with publish/delete                     |
| `apps/frontend/app/admin/(dashboard)/inventory/page.tsx`     | Full inventory dashboard                                       |
| `apps/frontend/app/(shop)/products/page.tsx`                 | Full product catalog                                           |
| `apps/frontend/app/(shop)/product/[id]/page.tsx`             | Full product detail page                                       |


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

**No products showing up on storefront** — (1) **Backend must be running:** from repo root run `cd apps/backend && npm run start:dev` (default port 4000). (2) **Backend needs its own `.env`** in `apps/backend/` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (same values as `apps/frontend/.env.local`). (3) In Supabase, products only show on the storefront when `published = true` and `deleted_at` is null. Draft/archived products only show in admin.

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


| File                                         | What                                                 |
| -------------------------------------------- | ---------------------------------------------------- |
| `apps/frontend/app/(shop)/layout.tsx`        | Shop layout with header, nav, and dark mode toggle   |
| `apps/frontend/lib/theme/theme-provider.tsx` | Theme context provider with localStorage persistence |


### Files Modified


| File                                                      | What Changed                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/backend/src/common/supabase/supabase.service.ts`    | Added auth options to admin client for proper RLS bypass                               |
| `apps/backend/src/products/products.service.ts`           | Added `resolveImageUrl()` and `resolveProductImages()` helpers, injected ConfigService |
| `apps/frontend/app/globals.css`                           | Switched from `prefers-color-scheme` to class-based dark mode, explicit light defaults |
| `apps/frontend/app/layout.tsx`                            | Added `colorScheme: "light"` on `<html>`                                               |
| `apps/frontend/app/page.tsx`                              | Replaced Next.js boilerplate with redirect to `/products`                              |
| `apps/frontend/app/(shop)/components/ProductCard.tsx`     | Added `dark:` variants                                                                 |
| `apps/frontend/app/(shop)/components/ProductGrid.tsx`     | Added `dark:` variants                                                                 |
| `apps/frontend/app/(shop)/components/ProductFilters.tsx`  | Added `dark:` variants for tabs, inputs, select                                        |
| `apps/frontend/app/(shop)/components/ImageGallery.tsx`    | Added `dark:` variants                                                                 |
| `apps/frontend/app/(shop)/components/VariantSelector.tsx` | Added `dark:` variants                                                                 |
| `apps/frontend/app/(shop)/products/page.tsx`              | Added `dark:` variants for skeletons, pagination, heading                              |
| `apps/frontend/app/(shop)/product/[id]/page.tsx`          | Added `dark:` variants for all text, buttons, tags, breadcrumbs                        |


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
- `**useCart()` hook** — returns `items`, `itemCount`, `subtotal`, `addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()`
- **Cart badge** — Shows item count next to "Cart" in the shop header. Black circle with white number (inverted in dark mode).
- **Product page wired** — "Add to cart" button now works. Adds the selected variant with product title, price, and image. Button text changes to "Added!" for 2 seconds.
- **Cart page** (`/cart`) — Full cart with item image, title, variant info, quantity controls (±), remove button, subtotal, "Proceed to checkout" link, and empty state. Dark mode support.

### Phase 2: Orders Backend (NestJS)

**New `OrdersModule`** with 7 endpoints:


| Endpoint                       | Method | Auth            | What it does                               |
| ------------------------------ | ------ | --------------- | ------------------------------------------ |
| `/api/orders`                  | POST   | JWT             | Create order after payment                 |
| `/api/orders/my`               | GET    | JWT             | Customer's own orders (paginated)          |
| `/api/orders/my/:id`           | GET    | JWT             | Customer's own order detail                |
| `/api/orders/admin/list`       | GET    | `orders:read`   | Admin list with search/status/date filters |
| `/api/orders/admin/:id`        | GET    | `orders:read`   | Admin order detail                         |
| `/api/orders/admin/:id/status` | PATCH  | `orders:update` | Update order status                        |
| `/api/orders/:id/cancel`       | POST   | JWT             | Cancel own order (pending/paid only)       |


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


| Category | File                                        | What                        |
| -------- | ------------------------------------------- | --------------------------- |
| Cart     | `lib/cart/cart-context.tsx`                 | CartProvider + useCart hook |
| Cart     | `lib/cart/index.ts`                         | Re-exports                  |
| Backend  | `orders/orders.module.ts`                   | NestJS module               |
| Backend  | `orders/orders.controller.ts`               | 7 endpoints                 |
| Backend  | `orders/orders.service.ts`                  | Business logic              |
| Backend  | `orders/dto/create-order.dto.ts`            | Create order DTO            |
| Backend  | `orders/dto/query-orders.dto.ts`            | Query filters DTO           |
| Backend  | `orders/dto/update-order-status.dto.ts`     | Status update DTO           |
| Frontend | `lib/api/orders.ts`                         | Types + React Query hooks   |
| Frontend | `app/(shop)/checkout/confirmation/page.tsx` | Order confirmation          |
| Frontend | `app/(dashboard)/orders/page.tsx`           | Customer order history      |
| Frontend | `app/(dashboard)/orders/[id]/page.tsx`      | Customer order detail       |


### Files Modified


| File                                                       | What Changed                     |
| ---------------------------------------------------------- | -------------------------------- |
| `apps/backend/src/app.module.ts`                           | Added OrdersModule               |
| `apps/backend/src/payments/payments.module.ts`             | Imports OrdersModule             |
| `apps/backend/src/payments/payments.service.ts`            | Webhook handles `charge.success` |
| `apps/frontend/app/(shop)/layout.tsx`                      | CartProvider + cart badge        |
| `apps/frontend/app/(shop)/product/[id]/page.tsx`           | Add to cart wired                |
| `apps/frontend/app/(shop)/cart/page.tsx`                   | Full cart page                   |
| `apps/frontend/app/(shop)/checkout/page.tsx`               | Full checkout with Paystack      |
| `apps/frontend/app/admin/(dashboard)/orders/page.tsx`      | Real data + filters              |
| `apps/frontend/app/admin/(dashboard)/orders/[id]/page.tsx` | Full detail + status management  |
| `apps/frontend/app/admin/components/StatusBadge.tsx`       | Order status colors              |
| `apps/frontend/app/(dashboard)/layout.tsx`                 | Orders nav link                  |
| `apps/frontend/lib/paystack/client.ts`                     | Added `currency: "GHS"`          |


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

## Week 3, Day 2 — Storefront Redesign: Homepage, Products, Checkout & Lookbook (Feb 2025)

### What Got Done

**Major storefront overhaul** — redesigned the checkout page, built a full editorial homepage, redesigned the products catalog, and created a lookbook page with scroll-triggered animations.

### 1. Checkout Page Redesign

Completely rewrote the checkout page to match a professional e-commerce design:

- **Three numbered step sections** — (1) Customer (auto-filled email with green check), (2) Delivery (shipping form), (3) Payment
- **Two-column layout** — form fields on the left, order summary on the right with gray background
- **Order summary** shows product images, names, variant info, quantities, subtotal, and shipping cost
- **Delivery options** — Standard (GH₵40) and Express (GH₵68) radio buttons
- **Promo code** input field (UI ready, logic TBD)
- **Paystack integration** — uppercase "PAY NOW" button triggers Paystack popup
- Still uses Paystack only (no PayPal despite the reference design having it)

### 2. Homepage

Built an editorial fashion homepage at `/` with full-screen image sections:

- **New shop header** — centered "IRIS" logo with left-side nav links (Shop, New Arrivals, Lookbook) in uppercase tracking-widest style. Shopping bag icon with cart badge. Mobile hamburger menu.
- **New shop footer** — 4-column grid (Brand tagline, Shop links, Help links, Connect/social). Copyright bar at bottom.
- **4 full-width hero sections** stacked vertically, each with:
  - Full-bleed background image (from `/public/homepage/`)
  - Dark overlay for text readability
  - Centered title, subtitle, and CTA button with hover effect
  - `object-top` positioning for portrait images so faces are visible
- **Images:** Intercessor Department camo collection, Psalm 52 black set, Essentials sweats, Betrayer's Kiss jacket
- Header + footer wrap ALL shop pages as the shared template

### 3. Products Page Redesign

Redesigned to match an editorial fashion catalog:

- **"DISCOVER ALL PRODUCTS"** heading in uppercase tracking-widest
- **Gender tabs** — "Shop All | Men's | Women's" with underline active state
- **Category tabs** — All, Sale, Shirts, Pants, Shorts, Hoodies and Sweatshirts, Ties/Hats, Accessories (scrollable)
- **"Match..." search** — minimal underline-style input
- **4-column product grid** (was 3) — `grid-cols-2 sm:3 lg:4`
- **Cleaner product cards** — uppercase title, subtle price text, `object-top` so model faces show, no rounded corners
- **Minimal pagination** — uppercase Previous/Next text links

### 4. Lookbook Page (NEW)

Created `/lookbook` with advanced scroll-triggered animations:

- **Sub-header** — "FW'24 | APOLUO | LOOKBOOK" in the editorial style from the reference design
- **Serif italic intro text** — "The year it all makes sense." / "Apoluo means to fall away..."
- **5 image rows** with varying layouts:
  - Triple row (3 equal portrait columns)
  - Double row (2 wide landscape images)
  - Offset row (staggered 5/4/3 column grid with different vertical offsets — editorial magazine feel)
  - Single row (full-width cinematic 21:9 aspect)
  - Triple row (closing)
- **Scroll-triggered reveal animations** — images and text fade up with staggered delays as you scroll. Uses IntersectionObserver with `threshold: 0.15`.
- **Closing section** — "Fall / Winter 2024" / "IRIS — Apoluo Collection"
- Reuses the homepage images in creative arrangements

### 5. Gender Value Migration

Changed gender value from `unisex` to `all` across the stack:

- Backend DTOs updated (`create-product.dto.ts`, `query-products.dto.ts`)
- Frontend types and validation updated
- SQL migration: `supabase/migrations/20260214100000_replace_unisex_with_all_in_products.sql`

### Files Created


| File                                         | What                                     |
| -------------------------------------------- | ---------------------------------------- |
| `apps/frontend/app/(shop)/page.tsx`          | Homepage with 4 editorial image sections |
| `apps/frontend/app/(shop)/lookbook/page.tsx` | Lookbook with scrollytelling animations  |
| `apps/frontend/public/homepage/1.jpeg`       | Camo collection image                    |
| `apps/frontend/public/homepage/2.jpeg`       | Black set image                          |
| `apps/frontend/public/homepage/3.png`        | Essentials pants image                   |
| `apps/frontend/public/homepage/4.jpeg`       | Betrayer's Kiss jacket image             |
| `supabase/migrations/20260214100000_...`     | Gender unisex→all migration              |


### Files Modified


| File                                                          | What Changed                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/frontend/app/(shop)/layout.tsx`                         | Full rewrite — centered logo header, nav with Lookbook link, footer, mobile menu |
| `apps/frontend/app/(shop)/checkout/page.tsx`                  | Full rewrite — 3-step checkout with delivery options, order summary              |
| `apps/frontend/app/(shop)/components/ProductFilters.tsx`      | Gender tabs, category tabs, Match search input                                   |
| `apps/frontend/app/(shop)/components/ProductGrid.tsx`         | 4-column grid                                                                    |
| `apps/frontend/app/(shop)/components/ProductCard.tsx`         | Cleaner card, uppercase title, object-top                                        |
| `apps/frontend/app/(shop)/products/page.tsx`                  | New heading, category filter, 16 items per page                                  |
| `apps/frontend/app/page.tsx`                                  | Removed (homepage now at `(shop)/page.tsx`)                                      |
| `apps/backend/src/products/dto/create-product.dto.ts`         | `unisex` → `all`                                                                 |
| `apps/backend/src/products/dto/query-products.dto.ts`         | `unisex` → `all`                                                                 |
| `apps/frontend/lib/api/products.ts`                           | `unisex` → `all`                                                                 |
| `apps/frontend/lib/validation/product.ts`                     | `unisex` → `all`                                                                 |
| `apps/frontend/app/admin/(dashboard)/products/page.tsx`       | `Unisex` → `All` in filter                                                       |
| `apps/frontend/app/admin/components/products/ProductForm.tsx` | `unisex` → `all` in gender options                                               |


### Want to Test It?

```bash
# Terminal 1 — backend
cd apps/backend
npm run start:dev

# Terminal 2 — frontend
cd apps/frontend
npm run dev
```

- **Homepage:** Go to `/` — see 4 full-screen image sections with centered text
- **Products:** Go to `/products` — see the redesigned catalog with 4-column grid and category tabs
- **Lookbook:** Go to `/lookbook` — scroll down to see images fade in with staggered animations
- **Checkout:** Add items to cart → `/checkout` — see the 3-step layout with delivery options
- **Header/Footer:** Navigate between pages — shared header with centered IRIS logo and footer on all shop pages

### Something Not Working?

**Homepage images not loading** — Make sure `public/homepage/` has the 4 image files (1.jpeg, 2.jpeg, 3.png, 4.jpeg).

**Gender "unisex" causing errors** — Run the SQL migration in Supabase SQL Editor to update existing products from `unisex` to `all`.

### Next Up

- Email notifications (order confirmation, shipping updates)
- Discount codes / coupons
- Customer reviews
- Analytics dashboard with real order data

---

## Week 3, Day 3 — Homepage Polish, Admin Payments/Settings/Export, Search (Feb 2025)

### What Got Done

**Polished the homepage scrollytelling, built out missing admin features, and added storefront search.**

### 1. Homepage Updates

- **Removed duplicate slide** — The first slide in the horizontal scroll section (Intercessory Department) was already the hero, so it was removed. Horizontal scroll now has 3 panels instead of 4.
- **Removed "Scroll" text** from the progress bar in the horizontal scroll section.
- **Added newsletter section** — "Join Our Newsletter" section with email input before the footer. Calls `POST /api/newsletter/subscribe` on submit with success/error feedback.
- **Added social media icons** to footer Connect section — Instagram, X/Twitter, and TikTok with SVG icons.

### 2. Admin Payments Page (NEW)

Full payments management at `/admin/payments`:

- **4 stats cards** — Total Collected (green), Pending (yellow), Refunded (red), Transaction Count
- **Payments table** with search, status filter, pagination
- **Backend endpoints** — `GET /api/payments/admin/list` and `GET /api/payments/admin/stats` (permission: `orders:read`)

### 3. Admin Settings Wired to Real Data

Previously the settings pages had mock/hardcoded data. Now they hit the backend:

- **Users page** (`/admin/settings/users`) — Real data table from `GET /api/settings/users`. Inline role dropdown to change user roles via `PATCH /api/settings/users/:id/role`.
- **Roles page** (`/admin/settings/roles`) — Fetches all 4 roles with their permissions from `GET /api/settings/roles`. Shows permission badges for each role.
- **Backend module** — New `SettingsModule` with user management and role listing endpoints.

### 4. CSV Export

Added export buttons to admin pages:

- **Orders page** — "Export CSV" button downloads orders as CSV via `GET /api/export/orders` (supports status filter)
- **Products page** — "Export" button downloads products as CSV via `GET /api/export/products`
- **Backend module** — New `ExportModule` that generates CSV from database queries with proper Content-Type and Content-Disposition headers.

### 5. Newsletter Backend

- **New `NewsletterModule`** — `POST /api/newsletter/subscribe` (public) and `GET /api/newsletter/admin/list` (admin)
- **DB migration** — `newsletter_subscribers` table with email (unique) and subscribed_at
- Upserts on subscribe so duplicate emails don't error

### 6. Storefront Search

Added a search icon to the customer-facing store header:

- **Search icon** — magnifying glass icon next to the theme toggle and cart icons
- **Search overlay** — clicking the icon opens a centered modal with a text input. Type a query and press Enter to navigate to `/products?search=<query>`.
- **ESC to close** — press Escape or click the backdrop to dismiss
- **Products page** now reads the `search` URL parameter so searches from the header pre-populate the filter

### Files Created


| File                                                                   | What                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `apps/backend/src/settings/`                                           | SettingsModule, controller, service, DTO (4 files)   |
| `apps/backend/src/newsletter/`                                         | NewsletterModule, controller, service, DTO (4 files) |
| `apps/backend/src/export/`                                             | ExportModule, controller, service (3 files)          |
| `apps/backend/src/payments/dto/query-payments.dto.ts`                  | Query DTO for payments                               |
| `apps/frontend/lib/api/payments.ts`                                    | Payments API hooks                                   |
| `apps/frontend/lib/api/settings.ts`                                    | Settings API hooks                                   |
| `apps/frontend/app/admin/(dashboard)/payments/page.tsx`                | Admin payments page                                  |
| `supabase/migrations/20260214200000_create_newsletter_subscribers.sql` | Newsletter table                                     |


### Files Modified


| File                                                          | What Changed                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/backend/src/app.module.ts`                              | Added SettingsModule, NewsletterModule, ExportModule                     |
| `apps/backend/src/payments/payments.controller.ts`            | Added admin list/stats endpoints                                         |
| `apps/backend/src/payments/payments.service.ts`               | Added findAdminPayments(), getPaymentStats()                             |
| `apps/frontend/app/(shop)/layout.tsx`                         | Added search icon + search overlay to header                             |
| `apps/frontend/app/(shop)/page.tsx`                           | Removed duplicate slide, removed "Scroll" text, added newsletter section |
| `apps/frontend/app/(shop)/products/page.tsx`                  | Reads `search` URL param                                                 |
| `apps/frontend/app/admin/(dashboard)/orders/page.tsx`         | Added CSV export button                                                  |
| `apps/frontend/app/admin/(dashboard)/products/page.tsx`       | Added CSV export button                                                  |
| `apps/frontend/app/admin/(dashboard)/settings/users/page.tsx` | Wired to real API data                                                   |
| `apps/frontend/app/admin/(dashboard)/settings/roles/page.tsx` | Wired to real API data                                                   |
| `apps/frontend/app/admin/components/Sidebar.tsx`              | Added Payments nav item                                                  |


### Want to Test It?

- **Search:** Click the magnifying glass in the store header → type a product name → press Enter
- **Payments:** Log in as admin → `/admin/payments` → see stats and transaction list
- **Export:** Go to `/admin/orders` or `/admin/products` → click "Export CSV"
- **Newsletter:** Scroll to the bottom of the homepage → enter email → submit
- **Settings:** Go to `/admin/settings/users` → change a user's role from the dropdown

### Bug Fix: Analytics Infinite Requests

The analytics page was making endless API requests because `new Date().toISOString()` produced a different value on every render (millisecond precision), which changed the React Query key each time → refetch → re-render → loop. Fixed by memoizing the date and truncating to day precision (`2026-02-15` instead of full ISO timestamp). Also improved the page to show proper empty states when there's no order data yet, and display actual error messages when the API fails.

### Next Up

- **Waitlist & Inner Circle pages** — Build out the customer-facing waitlist signup and inner circle membership pages (currently stubs)
- **Admin waitlist management** — Wire `/admin/waitlist` to real data with approve/reject functionality
- **Admin customers page** — Add customer detail view and order history per customer
- **Email notifications** — Order confirmation, shipping updates, newsletter welcome email
- **Discount codes / coupons** — Promo code system for checkout
- **Admin analytics enhancements** — Revenue charts, top products, conversion funnel

---

## Week 3, Day 4 — Admin Analytics Enhancements & Customer Page Improvements (Feb 2025)

### What Got Done

**Major upgrade to the analytics dashboard and customer management pages.** The analytics page now has real charts, period-over-period comparison, and a conversion funnel. The customers page has stats cards and segmentation. The customer detail page has a timeline view and spending sparkline.

### 1. Analytics Page Overhaul

The analytics page (`/admin/analytics`) was completely rewritten:

- **Period comparison on stat cards** — Revenue, Orders, and Avg Order Value cards now show `↑12.5% vs prev period` or `↓8.3% vs prev period` in green/red. The backend calculates the equivalent prior period (e.g. if viewing last 30 days, it compares against the 30 days before that).
- **SVG vertical bar charts** — Replaced the old horizontal bar lists with proper vertical bar charts (inline SVG, no chart library). Revenue and Orders charts sit side-by-side with y-axis labels, grid lines, date labels on x-axis, and hover tooltips. Charts are responsive via SVG viewBox.
- **Order funnel** — New visualization showing how orders progress through stages: Paid → Processing → Shipped → Delivered. Each stage shows count, bar width proportional to volume, and drop-off percentage between stages.
- **Product images in Top Products** — Each product in the top 10 list now shows a 32×32 thumbnail image (batch-fetched from `product_images` table). Falls back to a placeholder if no image exists.
- **Status breakdown** kept as-is (colored pills).

### 2. Customer Page Stats & Segmentation

The customers list page (`/admin/customers`) now has:

- **4 stats cards** at the top — Total Customers (Users icon), New This Month (UserPlus), Avg Order Value (ShoppingCart), Top Spender (Crown with spend amount)
- **Segment filter bar** — "All | New (≤1 order) | Returning (2+)" button group that filters the customer list by order count
- **Backend support** — New `GET /api/orders/admin/customer-stats` endpoint returns `totalCustomers`, `newThisMonth`, `avgOrderValue`, and `topSpender`. The existing customers endpoint now accepts `min_orders` and `max_orders` query params.

### 3. Customer Detail Page Enhancements

The customer detail page (`/admin/customers/{id}`) now has:

- **Avatar with initials** — 48×48 rounded circle with the customer's initials (e.g. "JD" for John Doe) in the header next to their name
- **Mini sparkline** — 6 tiny bars in the Lifetime Value card showing the last 6 months of spending, computed client-side from the orders array
- **Timeline view** — Replaced the orders table with a vertical timeline. Each order appears as a card on a vertical line with dots, showing order number (clickable link to order detail), status badge, total, item count, and date.

### Backend Changes


| Endpoint                           | Method | Permission    | What's new                                                                                                 |
| ---------------------------------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------- |
| `/api/orders/admin/customer-stats` | GET    | `orders:read` | **New** — customer stats for dashboard cards                                                               |
| `/api/orders/admin/analytics`      | GET    | `orders:read` | **Enhanced** — now returns `previousPeriodRevenue`, `previousPeriodOrders`, `funnelCounts`, product images |
| `/api/orders/admin/customers`      | GET    | `orders:read` | **Enhanced** — accepts `min_orders`, `max_orders` query params                                             |


### Files Created


| File                                                                       | What                                      |
| -------------------------------------------------------------------------- | ----------------------------------------- |
| `apps/frontend/app/admin/(dashboard)/analytics/components/BarChart.tsx`    | Reusable SVG vertical bar chart component |
| `apps/frontend/app/admin/(dashboard)/analytics/components/OrderFunnel.tsx` | Order funnel visualization component      |


### Files Modified


| File                                                          | What Changed                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/orders/orders.service.ts`                   | Added `getCustomerStats()`, enhanced `getAnalytics()` with previous period + funnel + images, added order count filters to `findAdminCustomers()` |
| `apps/backend/src/orders/orders.controller.ts`                | Added `customer-stats` route, updated customers query params                                                                                      |
| `apps/frontend/lib/api/orders.ts`                             | Extended `AnalyticsData` type, added `CustomerStats` interface + `useCustomerStats()` hook, added filter params                                   |
| `apps/frontend/app/admin/components/StatsCard.tsx`            | `helperText` now accepts `ReactNode` (non-breaking change)                                                                                        |
| `apps/frontend/app/admin/(dashboard)/analytics/page.tsx`      | Full rewrite with comparison cards, SVG charts, funnel, product images                                                                            |
| `apps/frontend/app/admin/(dashboard)/customers/page.tsx`      | Added stats cards, segment filter bar                                                                                                             |
| `apps/frontend/app/admin/(dashboard)/customers/[id]/page.tsx` | Added avatar, sparkline, timeline view                                                                                                            |


### Want to Test It?

```bash
# Terminal 1 — backend
cd apps/backend
npm run start:dev

# Terminal 2 — frontend
cd apps/frontend
npm run dev
```

- **Analytics:** Log in as admin → `/admin/analytics` → see comparison cards, bar charts, funnel, product images
- **Customers:** Go to `/admin/customers` → see stats cards, try the segment filter buttons
- **Customer detail:** Click a customer → see avatar, sparkline in Lifetime Value card, timeline view for orders
- **Empty states:** All new features handle zero data gracefully (no crashes, helpful messages)

### Something Not Working?

**Charts empty but orders exist** — Check the date range selector. The default is "Last 30 days" — if orders are older, switch to "Last year".

**Product images not showing in Top Products** — Images are fetched from the `product_images` table where `is_primary = true`. If products don't have a primary image set, they'll show a placeholder.

**Customer stats all zeros** — The stats endpoint counts profiles with `role = 'public'`. Admin/staff/manager accounts are excluded.

### Next Up

- Waitlist & Inner Circle pages
- Admin waitlist management
- Email notifications (order confirmation, shipping updates)
- Discount codes / coupons

---

## Week 3, Day 5 — Admin App Separation (Feb 2025)

### What Got Done

**Separated the admin panel into its own standalone Next.js app.** The admin dashboard used to live inside the storefront at `/admin/`*. Now it's a fully independent app at `apps/admin/` running on port 3001, while the storefront stays at `apps/frontend/` on port 3000.

### Why This Matters

- **Independent deployments** — Ship admin changes without touching the storefront, and vice versa
- **Smaller bundles** — The storefront no longer ships admin code (DataTable, Sidebar, analytics charts, etc.) to customers
- **Cleaner separation** — Each app has exactly the dependencies it needs. Admin doesn't have `react-paystack`, `sharp`, or `zustand`. Storefront doesn't have admin components.
- **Simpler routing** — Admin routes no longer need the `/admin` prefix. Dashboard is at `/`, products at `/products`, orders at `/orders`, etc.

### New Structure

```
iris/
├── apps/
│   ├── frontend/   (storefront — port 3000)
│   ├── admin/      (admin panel — port 3001)  ← NEW
│   └── backend/    (NestJS API — port 4000)
```

### What Changed

**New `apps/admin/` app:**

- Own `package.json` (name: `iris-admin`, dev runs on port 3001)
- Own `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- Own `lib/` with copies of: API client, RBAC, validation, React Query provider, Supabase clients, auth utils
- Own `types/database.types.ts`
- All admin pages moved from `app/admin/(auth|dashboard)/...` to `app/(auth|dashboard)/...`
- All admin components moved from `app/admin/components/` to `app/components/`
- All `/admin` prefixes stripped from links, redirects, and router.push calls
- Simplified proxy — every route except `/login` requires admin auth (no customer route logic)
- `.env.local` with Supabase + API URL config

**Storefront (`apps/frontend/`) cleaned up:**

- `app/admin/` directory deleted entirely (36 files removed)
- `lib/supabase/proxy.ts` simplified — removed all admin route protection, keeps only customer route protection
- No more admin-related code in the storefront bundle

**Backend (`apps/backend/src/main.ts`):**

- CORS updated to accept both `http://localhost:3000` (storefront) and `http://localhost:3001` (admin)

**Bug fix:** Removed `compare_at_price` from the products CSV export query — the column didn't exist in the live database, causing an internal server error when exporting products.

### Running Both Apps

```bash
# Terminal 1 — backend
cd apps/backend
npm run start:dev
# Runs on http://localhost:4000

# Terminal 2 — admin
cd apps/admin
npm run dev
# Runs on http://localhost:3001

# Terminal 3 — storefront
cd apps/frontend
npm run dev
# Runs on http://localhost:3000
```

**All three must be running for full functionality.**

### Admin Environment Variables

Create `apps/admin/.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Want to Test It?

- **Admin login:** Go to `http://localhost:3001/login` → log in with admin credentials
- **Admin dashboard:** `http://localhost:3001/` → stats cards, orders by status
- **Admin pages:** Products, Orders, Customers, Inventory, Analytics, Payments, Settings, Waitlist — all work as before, just without the `/admin` prefix
- **Storefront:** `http://localhost:3000` → works exactly as before
- **Storefront /admin:** `http://localhost:3000/admin` → 404 (admin routes no longer exist here)

### Something Not Working?

**Admin pages show empty data** — Restart the NestJS backend. The backend needs to be running with the updated CORS config that allows port 3001.

**CORS errors in browser console** — Make sure the backend was restarted after the CORS change. The `ADMIN_URL` env var in the backend defaults to `http://localhost:3001`.

**Products CSV export shows "Internal Server Error"** — This was fixed by removing the `compare_at_price` column from the export query. Make sure you have the latest backend code.

### Next Up

- Waitlist & Inner Circle pages
- Admin waitlist management
- Email notifications (order confirmation, shipping updates)
- Discount codes / coupons

---

## Week 2, Day 6 — Infinite Scrolling (Feb 2025)

### What Got Done

**Replaced pagination with infinite scrolling in the product grid.** The `/products` page now loads more items automatically as you scroll down, creating a smoother browsing experience.

1. **Seamless Loading** — No more "Next Page" buttons. As you reach the bottom of the list, the next batch of products loads instantly.
2. **Skeleton Loading State** — A subtle pulse animation shows while new products are being fetched.
3. **Filter Compatible** — Changing filters (Gender, Sort, etc.) resets the list to the top, and infinite scrolling continues from there.
4. **End of List Indicator** — Friendly message when you've seen everything.
5. **No More Page Reloads** — Everything happens client-side, preserving your scroll position and feeling much faster.

### Technical Details

- **React Intersection Observer** — Uses `useInView` hook to detect when the user hits the bottom of the viewport.
- **TanStack Query** — Switched to `useInfiniteQuery` for efficient data fetching and caching of multiple pages.
- **New Component** — `InfiniteProductGrid` replaced the old `ProductGrid` + pagination controls.

### Files Modified

- `apps/frontend/lib/api/products.ts` — Added `useInfiniteProducts` hook
- `apps/frontend/app/(shop)/components/InfiniteProductGrid.tsx` — **New component** handling the scroll logic
- `apps/frontend/app/(shop)/products/page.tsx` — Swapped out the grid component

### Want to See It?

Go to `/products` and just keep scrolling!

---

## Week 3, Day 6 — Multi-Option Variant Selector (Feb 2025)

### What Got Done

**Upgraded the product variant selector to support multiple option groups (Color + Size).** Previously, the `VariantSelector` only rendered `option1` (e.g., just Color). Products with both Color and Size variants (Red/S, Red/M, Blue/S, Blue/M) only showed Color buttons — users had no way to pick a size.

### How It Works Now

1. **Multiple option rows** — The selector extracts up to 3 option groups from the variant data (e.g., Color, Size, Material) and renders a row of buttons for each one.
2. **Cross-filtering** — When you select Color=Red, only the sizes available in Red are shown as clickable. Unavailable combinations are grayed out.
3. **Sold out indicators** — If a combination exists but is out of stock, the button shows "(Sold out)" with disabled styling but remains visible.
4. **Auto-selection** — On page load, the first in-stock variant is automatically selected so the price and stock status are immediately correct.
5. **Backwards compatible** — Products with only 1 option (just sizes or just colors) still work exactly as before. Products with no variants show no selector.

### What Changed

The **cart, checkout, and backend are untouched** — they already handled multi-option variants correctly. Only the shop-side display needed updating.

### Files Modified


| File                                                      | What Changed                                                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/frontend/app/(shop)/components/VariantSelector.tsx` | Full rewrite — extracts option groups, renders per-group button rows, cross-filters availability, exports `findMatchingVariant()`                                              |
| `apps/frontend/app/(shop)/product/[id]/page.tsx`          | Manages `selectedOptions` as `Record<string, string>` instead of flat `selectedId`, auto-selects first in-stock variant via `useEffect`, resolves active variant via `useMemo` |


### Want to Test It?

1. Go to a product with multiple variant options (e.g., a shirt with Color + Size combos)
2. Confirm both Color and Size button rows appear
3. Select a color → sizes filter to show only what's available for that color
4. Select a size → price and stock status update to match the exact variant
5. Out-of-stock combos show "(Sold out)" and are disabled
6. "Add to cart" adds the correct variant with proper title (e.g., "Red / M")
7. Products with only 1 option still work as before

### Something Not Working?

**Only one option row showing** — The product's variants might only have `option1` populated. Check the admin product edit page to ensure variants have both `option1` and `option2` filled in.

**Wrong variant selected on load** — The auto-selection picks the first in-stock variant. If all variants are out of stock, it falls back to the first variant.

### Next Up

- Waitlist & Inner Circle pages
- Admin waitlist management
- Email notifications (order confirmation, shipping updates)
- Discount codes / coupons

---

## Week 3, Day 6 (cont.) — Infinite Scrolling & Quick Add (Feb 2025)

### What Got Done

**1. Replaced pagination with infinite scrolling.** The `/products` page now loads more items automatically as you scroll down — no more "Next Page" buttons.

- Uses `react-intersection-observer` to detect when the user hits the bottom
- Switched to `useInfiniteQuery` from TanStack Query for multi-page caching
- New `InfiniteProductGrid` component replaced the old `ProductGrid` + pagination controls
- Skeleton loading animation while fetching, "You've reached the end" message at the bottom
- Filters/sort reset the list and infinite scroll continues from there

**2. Added "Quick Add" overlay to product cards.** Each product card now has a `+` button in the bottom-right corner of the image. Click it and a row of available sizes expands with a smooth staggered animation (powered by Framer Motion). Selecting a size adds to cart instantly without navigating away.

- Sharp square styling (no rounded corners) matching the brand aesthetic
- Staggered size buttons slide in from left for a premium feel
- Subtle gray hover highlight so size labels stay readable
- Spinner → checkmark → auto-close flow on size selection
- Closes on mouse leave or outside click
- Auto-detects the "Size" option across all variant slots (option1/option2/option3)
- Integrates with the existing `useCart()` context — items appear in the cart immediately

### Files Created


| File                                                          | What                                            |
| ------------------------------------------------------------- | ----------------------------------------------- |
| `apps/frontend/app/(shop)/components/InfiniteProductGrid.tsx` | Infinite scroll grid with intersection observer |


### Files Modified


| File                                                  | What Changed                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/frontend/lib/api/products.ts`                   | Added `useInfiniteProducts` hook                                        |
| `apps/frontend/app/(shop)/products/page.tsx`          | Swapped `ProductGrid` + pagination for `InfiniteProductGrid`            |
| `apps/frontend/app/(shop)/components/ProductCard.tsx` | Added Quick Add overlay with Framer Motion animation + cart integration |


### Dependencies Added

- `react-intersection-observer` — viewport detection for infinite scroll
- `framer-motion` — expand/collapse animation for Quick Add

### Want to Test It?

1. Go to `/products` and scroll — products load automatically as you reach the bottom
2. Hover a product card → `+` button appears bottom-right of the image
3. Click `+` → size buttons expand
4. Click a size → spinner → checkmark → item added to cart
5. Click elsewhere on the card → navigates to product detail as before

### Something Not Working?

`**+` button shows colors instead of sizes** — Check that your variants have `option2_name` set to "Size" in the admin product edit page. The component auto-detects which option slot holds sizes.

`**npm install` fails** — Use `npm install --legacy-peer-deps` (react-paystack peer dep issue).

---

---

## Week 4 — Personalised Recommendations Integration (Mar 2025)

### What Got Done

**Wired the 1NRI hybrid recommender system into the website.** The recommender (FastAPI service) now serves two live UI features: a "Picked for you" strip on the products page and a "You May Also Like" section on every product detail page.

Everything is built with graceful degradation — if the recommender is offline, both features silently disappear and the rest of the shop keeps working normally.

### How It Works

```
Browser → Next.js frontend → NestJS backend proxy → FastAPI recommender
                                    ↓
                             Supabase (full product records)
```

1. The frontend calls `/api/recommendations/for-you` or `/api/recommendations/similar/:handle`
2. NestJS resolves the user's email from the JWT (or `null` for guests)
3. NestJS calls the FastAPI service, which returns integer product IDs
4. NestJS maps those IDs back to Supabase handles and fetches full Product records
5. Full Product arrays (same shape as `/api/products`) are returned to the frontend

**Fallback chain:**

- Logged-in user with known email → personalised hybrid recommendations
- Logged-in user with unknown email (not in training data) → popularity fallback (bestsellers)
- Guest user → popularity fallback
- Recommender offline → empty array, section disappears

### FastAPI Changes

Three new endpoints added to the recommender (`recommender/src/api/routes.py` + `main.py`):


| Endpoint                                 | Purpose                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `GET /product-map`                       | Returns full `handle → int_id` map (NestJS loads this at startup)      |
| `GET /recommend/user/by-email?email=...` | Personalised recs by email, falls back to popularity for unknown users |
| `GET /recommend/user/popular`            | Top bestsellers for guests                                             |


The `/product-map` and `/recommend/user/popular` and `/recommend/user/by-email` routes are declared **before** the `{user_id}` catch-all route to avoid path collisions.

`main.py` now loads `user_map.pkl` and `product_map.pkl` at startup and injects them into the router.

### NestJS: New Recommendations Module

Three new files at `apps/backend/src/recommendations/`:


| File                            | What                                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recommendations.service.ts`    | Loads product map from FastAPI, calls recommender, resolves int IDs → handles → full Products. Wraps everything in try/catch with 5-second timeout. |
| `recommendations.controller.ts` | Two `@Public()` endpoints: `GET /recommendations/for-you` and `GET /recommendations/similar/:handle`                                                |
| `recommendations.module.ts`     | Imports `ProductsModule` to reuse `ProductsService.findOnePublic()`                                                                                 |


`app.module.ts` updated to import `RecommendationsModule`. `apps/backend/.env` has a new line:

```
RECOMMENDER_URL=http://localhost:8000
```

Change this to the deployed URL when going to production.

### Frontend: New Hook + Components

`**apps/frontend/lib/api/recommendations.ts**` — Two React Query hooks:

- `usePersonalisedProducts(k?)` — calls `/recommendations/for-you`, returns `Product[]` or `[]` on error
- `useSimilarProducts(handle, k?)` — calls `/recommendations/similar/:handle`, disabled when handle is empty

Both hooks set `retry: false` — they never retry on failure, so a dead recommender doesn't cause noisy logs or loading spinners.

`**apps/frontend/app/(shop)/components/PersonalisedStrip.tsx**` — NEW component:

- Horizontally scrollable row of `ProductCard`s
- Shows a skeleton while loading, renders nothing when empty
- CSS hides the scrollbar for a clean look

`**products/page.tsx` updated:**

- Detects login via `hasToken()` (reads localStorage, client-side only via `useEffect`)
- Renders `<PersonalisedStrip />` above the main grid for logged-in users only
- Guests see no change

`**product/[id]/page.tsx` updated:**

- Calls `useSimilarProducts(product.handle)`
- Renders a "You May Also Like" horizontal scroll section below the product info
- Only shows if the recommender returns results

### Files Created


| File                                                             | What                      |
| ---------------------------------------------------------------- | ------------------------- |
| `apps/backend/src/recommendations/recommendations.service.ts`    | NestJS proxy service      |
| `apps/backend/src/recommendations/recommendations.controller.ts` | Two API endpoints         |
| `apps/backend/src/recommendations/recommendations.module.ts`     | Module wiring             |
| `apps/frontend/lib/api/recommendations.ts`                       | React Query hooks         |
| `apps/frontend/app/(shop)/components/PersonalisedStrip.tsx`      | "Picked for you" UI strip |
| `apps/frontend/lib/api/recommendations.test.ts`                  | Unit tests for both hooks |


### Files Modified


| File                                             | What Changed                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `recommender/src/api/routes.py`                  | Added `/product-map`, `/recommend/user/by-email`, `/recommend/user/popular` |
| `recommender/src/api/main.py`                    | Loads `user_map.pkl` + `product_map.pkl` on startup, calls `attach_maps()`  |
| `apps/backend/src/app.module.ts`                 | Registered `RecommendationsModule`                                          |
| `apps/backend/.env`                              | Added `RECOMMENDER_URL=http://localhost:8000`                               |
| `apps/frontend/app/(shop)/products/page.tsx`     | Added `PersonalisedStrip` for logged-in users                               |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | Added "You May Also Like" section                                           |


### Running It

```bash
# Terminal 1 — recommender (run retrain first if you haven't)
cd "Personalised Recommendations/recommender"
uvicorn src.api.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — NestJS backend
cd iris/apps/backend
npm run start:dev

# Terminal 3 — Next.js storefront
cd iris/apps/frontend
npm run dev
```

The recommender is **optional** — the shop works without it. The recommendation sections only appear when the recommender is live.

### Quick Verification

```bash
# Is the recommender responding?
curl http://localhost:8000/product-map

# Does the proxy return picks for a guest?
curl http://localhost:4000/api/recommendations/for-you

# Does similar work?
curl http://localhost:4000/api/recommendations/similar/some-product-handle
```

In the browser:

- `/products` while logged in → "Picked for you" strip appears above the product grid
- `/products` while logged out → no strip, grid appears as before
- Any `/product/:handle` → "You May Also Like" section below the product info (if recommender is running)

### Something Not Working?

`**/product-map` returns `{}**` — The recommender hasn't been retrained yet, or `product_map.pkl` is missing. Run `python scripts/retrain_all.py` from the `recommender/` directory.

**"Picked for you" strip not showing even when logged in** — Open DevTools → Application → Local Storage. Look for the `iris_token` key. If it's missing, log out and back in to get a fresh token.

**NestJS logs "Could not load product map"** — The recommender isn't running. Start it first, then restart NestJS (it loads the map on the first request, so a restart isn't strictly required, but it's cleaner).

---

## Setting Up the Recommender (New Team Members)

The recommender lives in its own repo: **[1NRI_personalised_recommendations](https://github.com/Kirk-kud/1NRI_personalised_recommendations)**.

### Prerequisites


| Tool             | Version    | Notes                  |
| ---------------- | ---------- | ---------------------- |
| Python           | **3.12.x** | Use pyenv — see below  |
| pyenv            | any        | `brew install pyenv`   |
| Homebrew OpenSSL | openssl@3  | `brew install openssl` |


> **Important — macOS blake2 fix:** If you install Python via pyenv on macOS, you need to compile it against Homebrew's OpenSSL, otherwise you'll see harmless but noisy `blake2b/blake2s not found` errors on every startup. Do this **before** `pyenv install`:
>
> ```bash
> CPPFLAGS="-I$(brew --prefix openssl)/include" \
> LDFLAGS="-L$(brew --prefix openssl)/lib" \
> PYTHON_CONFIGURE_OPTS="--with-openssl=$(brew --prefix openssl)" \
> pyenv install 3.12.6
> ```

### Step-by-Step Setup

```bash
# 1. Clone
git clone https://github.com/Kirk-kud/1NRI_personalised_recommendations.git
cd 1NRI_personalised_recommendations

# 2. Create & activate a virtual environment
cd recommender
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Train all models
#    This reads the CSVs in data/raw/, cleans them, builds embeddings,
#    trains the collaborative + hybrid models, and evaluates.
#    Takes ~2-5 minutes on first run (downloading BERT + CLIP weights).
python scripts/retrain_all.py

# 5. Start the API (keep this terminal open)
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload

# 6. (Optional) Open the admin dashboard in a second terminal
streamlit run dashboards/admin_app.py
```

### Verify It's Working

```bash
# Health check
curl http://localhost:8000/health

# Product map (should return a JSON object with product handles → IDs)
curl http://localhost:8000/product-map

# Popular items (what guests see)
curl http://localhost:8000/recommend/user/popular

# Personalised for a known user (by email)
curl "http://localhost:8000/recommend/user/by-email?email=someone@example.com&k=5"
```

### Connect to the Rest of the App

Add this to `iris/apps/backend/.env`:

```
RECOMMENDER_URL=http://localhost:8000
```

Then start NestJS and Next.js as normal. The recommender is **optional** — the shop works without it.

### Retraining with New Data

When new Shopify exports are available:

1. Replace the files in `recommender/data/raw/`:
  - `products_export_1.csv`
  - `orders_export_1.csv`
  - `customers_export.csv`
2. Run `python scripts/retrain_all.py`
3. Restart uvicorn

> The `rework_product_data.py` script at the repo root can be used to update product handles in `products_export_1.csv` after a database restructure. Run `python rework_product_data.py` from the `1NRI_personalised_recommendations/` root.

### Key Metrics (as of last retrain — March 2026)


| Metric      | Collaborative (CF) | Hybrid |
| ----------- | ------------------ | ------ |
| Precision@5 | 0.050              | 0.013  |
| Recall@5    | 0.219              | 0.052  |
| NDCG@5      | 0.194              | 0.039  |
| Coverage@20 | 51%                | 69%    |


The hybrid model covers more of the catalogue (69% vs 51%) because it blends text + image similarity. The CF model has higher precision — expected since it's trained purely on purchase history.

### FAQ

`**ModuleNotFoundError: No module named 'implicit'`** — Make sure your `.venv` is activated: `source .venv/bin/activate`.

`**FAISS index not found**` — You need to run `python scripts/retrain_all.py` first to generate the index files.

`**/product-map` returns `{}**` — `product_map.pkl` is missing from `data/processed/models/`. Retrain.

**Port 8000 already in use** — Something else is running on 8000. Kill it (`lsof -ti:8000 | xargs kill`) or start uvicorn on a different port and update `RECOMMENDER_URL` in the backend `.env`.

---

*Last updated: March 2026*

## Week 4 — Recommender Setup & Shop Login (March 2026)

### What Got Done

**Got the ML recommender fully running and added a login button to the storefront.**

### 1. Recommender Setup (Getting Kirk's Code Running)

The recommender was integrated structurally but the actual source code and data were missing. Here's everything that was done to get it live:

**Step 1 — Copy source code from Kirk's repo**

Clone the original recommender repo and copy its contents into `recommender/`:

```bash
git clone https://github.com/Kirk-kud/1NRI_personalised_recommendations /tmp/1NRI_personalised_recommendations

# Source code
cp -r /tmp/1NRI_personalised_recommendations/recommender/src/* recommender/src/
cp -r /tmp/1NRI_personalised_recommendations/recommender/scripts/* recommender/scripts/

# Raw data CSVs (from the repo root data/ folder)
cp /tmp/1NRI_personalised_recommendations/data/*.csv recommender/data/raw/
```

**Step 2 — Merge requirements**

Kirk's repo has significantly more dependencies (torch, faiss, sentence-transformers, implicit, etc.). The `recommender/requirements.txt` was updated to include all of them while keeping our extras (`supabase`, `python-dotenv`).

**Step 3 — Install and train**

```bash
cd recommender
source .venv/bin/activate
pip install -r requirements.txt        # takes a few minutes (torch is large)
python scripts/retrain_all.py          # trains CF + hybrid models, builds FAISS indexes
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**If port 8000 is already in use:**

```bash
lsof -ti :8000 | xargs kill -9
```

### 2. Login Button Added to Store Header

The storefront had no login button — customers had no way to log in from the shop. This meant the "Picked for you" strip was always showing the popularity fallback instead of personalised results.

**Fixed:** Added a `User` icon to the shop header (between theme toggle and cart):

- **Not logged in** → tapping the icon goes to `/login`
- **Logged in** → tapping the icon goes to `/profile`

Once a customer logs in, their JWT is sent with every recommendation request and the "Picked for you" section becomes genuinely personalised to them.

**File modified:** `apps/frontend/app/(shop)/layout.tsx`

### How "Picked for You" Works (Quick Summary)

The `PersonalisedStrip` component on the product pages calls `GET /recommendations/for-you` on the NestJS backend. NestJS forwards the request to the Python recommender at `http://localhost:8000`. The recommender blends three signals:

- **50% Collaborative Filtering** — what users with similar purchase history bought
- **30% Text similarity** — product description/title embeddings (MiniLM)
- **20% Image similarity** — product image embeddings (OpenCLIP ViT-B-32)

For guests (no JWT) it falls back to the most popular products.

### Something Not Working?

**"Picked for you" shows same products for everyone** — The recommender is likely running but nobody is logged in. Use the new User icon in the header to log in.

**Recommender not starting** — Make sure you've run `python scripts/retrain_all.py` first. Without the model artifacts in `data/processed/models/`, the API can't start.

`**FileNotFoundError` for CSV files** — Copy the raw data: `cp /tmp/1NRI_personalised_recommendations/data/*.csv recommender/data/raw/`

---

## Pop-up Sales Module (March 2026)

### What Got Done

**Built the full pop-up sales system — end to end.** This is the in-person point-of-sale section of the admin. When we do physical pop-up events (markets, mall activations, etc.), staff can now record sales directly in the dashboard instead of using a spreadsheet.

Here's everything that was built:

**1. Database (3 new tables)**

- `popup_events` — A pop-up event is a "session" (e.g. "Black Saturday Pop-up"). You can have multiple events. Each one has a name, location, date, and status (draft → active → closed).
- `popup_orders` — Orders taken at a pop-up event. Different from online orders — no shipping address, no user account needed. Order numbers follow the format `POP-YYYY-XXXX`.
- `popup_order_items` — The individual line items inside each order.

**2. Backend (new `/api/popup-sales` routes)**

| Endpoint | What it does |
|----------|-------------|
| `GET /popup-sales/events` | List all events (for the dropdown) |
| `POST /popup-sales/events` | Create a new event |
| `PATCH /popup-sales/events/:id` | Update or close an event |
| `GET /popup-sales/events/:id/stats` | Session revenue + order counts by status |
| `GET /popup-sales/events/:id/orders` | List orders, filtered by status tab |
| `POST /popup-sales/events/:id/orders` | Create a new order |
| `GET /popup-sales/orders/:id` | Single order detail |
| `PATCH /popup-sales/orders/:id` | Update order status / payment method |

**3. New RBAC permissions**

Four new permissions were added to the role matrix:

- `popup:read` — staff, manager, admin
- `popup:create` — staff, manager, admin
- `popup:update` — staff, manager, admin
- `popup:manage` — manager, admin only (create/close events, confirm payments)

**4. Admin UI (`/popup-sales`)**

The page matches the Figma design:

- **Event selector dropdown** in the top-right — switches between events. Auto-selects the first active event when you land on the page.
- **4 stats cards** — Session Revenue, Orders Completed, On Hold, Awaiting Payment. Refreshes every 15 seconds automatically (it's a live operational view).
- **Tabbed order table** — Active / On Hold / Completed / Confirmation Queue. The Confirmation Queue tab shows a badge with the count of orders awaiting payment.
- **Amber alert banner** — appears on the Active tab when there are orders awaiting payment confirmation: *"X order(s) awaiting payment confirmation. Serve next customer while you wait."*
- **Actions menu (⋮) per order** — context-aware. Shows only valid transitions for the current status (e.g. you can only "Confirm Payment" when the order is in `awaiting_payment` state).
- **"+ New Order" modal** — search products, add line items, set quantities, choose payment method. Creates the order and shows it in the Active tab immediately.
- **"New Event" modal** — create a new pop-up event without leaving the page.
- **"Pop-up Sales"** added to the sidebar between Orders and Payments.

### Status Flow

```
active → awaiting_payment → confirmed → completed
active → on_hold → active (reactivate)
any → cancelled
```

### How to Test It

1. Start the backend: `cd apps/backend && npm run start:dev`
2. Start the admin: `cd apps/admin && npm run dev`
3. Go to [http://localhost:3001/popup-sales](http://localhost:3001/popup-sales)

The database is already seeded with:
- **"Black Saturday Pop-up Event"** (active) with 5 sample orders covering every status
- **"Spring Launch Pop-up"** (draft) for testing the event selector

### Files Created / Modified

**New:**
- `supabase/migrations/20260315000000_create_popup_sales.sql`
- `apps/backend/src/popup-sales/popup-sales.module.ts`
- `apps/backend/src/popup-sales/popup-sales.service.ts`
- `apps/backend/src/popup-sales/popup-sales.controller.ts`
- `apps/backend/src/popup-sales/dto/` (5 DTOs)
- `apps/admin/lib/api/popup-sales.ts`
- `apps/admin/app/(dashboard)/popup-sales/page.tsx`

**Modified:**
- `apps/admin/lib/rbac/permissions.ts` — added popup permissions
- `apps/backend/src/common/rbac/permissions.ts` — mirrored popup permissions
- `apps/backend/src/app.module.ts` — registered PopupSalesModule
- `apps/admin/app/components/Sidebar.tsx` — added Pop-up Sales nav item

### Something Not Working?

**"permission denied for table popup_events"** — The migration ran but grants weren't applied. Run this in the Supabase SQL Editor:
```sql
GRANT ALL ON TABLE popup_events TO anon, authenticated, service_role;
GRANT ALL ON TABLE popup_orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE popup_order_items TO anon, authenticated, service_role;
```

**Stats show "—" instead of numbers** — The backend isn't running or the event has no orders. Check `cd apps/backend && npm run start:dev`.

**"Served by" column shows "—"** — Expected for seeded data (orders were inserted without a logged-in staff member). Once staff log in and create orders through the UI, their names will appear.

---

## 2026-03-15 — Pop-up Sales MoMo Payments & Bug Fixes

### What Got Done

**MTN MoMo cashier-initiated charge**

The pop-up sales order actions menu now has a **Charge via MoMo** option. The cashier enters the customer's MTN number, clicks Send Prompt, and the customer gets a USSD push on their phone to enter their MoMo PIN. No OTP sharing needed — the whole approval happens on the customer's phone.

Two new backend endpoints were added:
- `POST /popup-sales/orders/:id/charge` — fires the Paystack charge and moves the order to `awaiting_payment`
- `POST /popup-sales/orders/:id/submit-otp` — handles the OTP step for networks that require it (kept as a backend safety net)

Only MTN is exposed in the UI for now. Vodafone/AirtelTigo require OTP collection from the customer by the cashier, which is a bad idea in a face-to-face setting (OTPs are private). Those networks can be added later via a customer-facing payment link.

**Paystack webhook now actually works**

When a customer paid, the order was staying stuck on "Awaiting" and had to be manually confirmed. The webhook was arriving but the signature check was always failing — NestJS re-serializes the JSON body before your handler sees it, so the bytes don't match what Paystack signed.

Fixed by turning on `rawBody: true` in the NestJS bootstrap and using the raw buffer directly for the HMAC check. Now when a customer approves their payment, the order flips to `confirmed` on its own within 15 seconds (the UI polls automatically).

**Actions dropdown no longer hides below the table**

The ⋮ menu was getting clipped by the table's horizontal scroll container. Fixed by switching to `position: fixed` positioned relative to the button's screen coordinates, so it always pops up inside the viewport.

**Product search in New Order shows all products**

The product search inside the new order modal was only returning published products (it was hitting the public storefront endpoint). Changed it to use the admin endpoint so staff can add any product, including drafts.

### Infrastructure heads-up

- **Use ngrok instead of localhost.run for webhook testing.** `localhost.run` tunnels drop frequently and the URL changes each time, which silently breaks Paystack webhook delivery. `ngrok http 4000` gives a stable URL for the session.
- **Webhook URL needs the `/api` prefix** — `https://<tunnel>/api/webhooks/paystack`
- **SSL error on corporate/VPN networks** — if you see `TypeError: fetch failed — self-signed certificate` in the backend logs, start the server with `NODE_OPTIONS=--use-system-ca npm run start:dev`

### Files changed

- `apps/backend/src/main.ts`
- `apps/backend/src/payments/payments.controller.ts`
- `apps/backend/src/popup-sales/popup-sales.service.ts`
- `apps/backend/src/popup-sales/popup-sales.controller.ts`
- `apps/backend/src/popup-sales/dto/charge-popup-order.dto.ts` *(new)*
- `apps/admin/lib/api/popup-sales.ts`
- `apps/admin/app/(dashboard)/popup-sales/page.tsx`

---

## 2026-03-15 — Pop-up Sales Modal Redesign

### What Got Done

**Replaced the simple "New Order" form with a full two-column POS modal** matching the Figma design. The modal is now 1100px wide and splits into a product catalog on the left and order details on the right.

**Left column — Product Catalog**
- Live search with debounce (hits the admin products endpoint so draft products show up).
- Displays rich **thumbnail cards** for each product, keeping the interface highly visual.
- Clicking a product card slides open an **inline variant picker** showing all available options (e.g., Size, Color) with their specific prices.
- **Live stock badges**: shows exactly how many are left, and automatically disables variants that are out of stock.
- Add a product → qty controls appear inline right inside the variant chip; search again to keep adding.

**Right column — four scrollable sections**

① **Cart** — added items with +/− qty controls, remove button, and a running subtotal

② **Customer** — search for existing customers by name or phone (dropdown fills the form automatically and shows a "Returning customer" banner), or fill in the manual form (name, +233 phone prefix, email). "Save to database" checkbox for new walk-in customers.

③ **Discount** — segmented control for None / % / GH₵. Quick pills for 5%, 10%, 15%, 20%. Optional reason field. Discount is applied server-side so the saved total is always correct.

④ **Payment Method** — three cards: Cash, MoMo, Bank Transfer. Each reveals its own fields:
- **Cash** — amount received → live change-due display
- **MoMo** — MTN / Telecel / AirtelTigo buttons, phone, optional reference, "Sent to Paystack" checkbox
- **Bank Transfer** — bank name, reference, "Sent to Paystack" checkbox
- **Split Payment toggle** — add multiple payment rows, each with method + amount + method-specific fields. A live tally bar turns green when the allocated amounts equal the order total.

**Sticky footer** — "Put on Hold" button, total display, and a confirm button that changes label to "Save & Join Confirmation Queue" when any payment is marked "Sent to Paystack".

**Hold sub-modal** — duration picker (10 / 15 / 20 / 30 min) + optional note field.

### Database Changes

A new migration adds 6 columns to `popup_orders` and a new `popup_split_payments` table:

**New columns on `popup_orders`:**

| Column | Type | Purpose |
|---|---|---|
| `customer_email` | TEXT | Customer email for the order |
| `discount_type` | TEXT | `'none'`, `'percentage'`, or `'fixed'` |
| `discount_amount` | NUMERIC(10,2) | Computed discount in GH₵ |
| `discount_reason` | TEXT | Optional reason for the discount |
| `hold_duration_minutes` | INTEGER | How long to hold (10/15/20/30) |
| `hold_note` | TEXT | Staff note when putting on hold |

**New table `popup_split_payments`:** stores each split entry with method, amount, network, phone, reference, bank name, and Paystack flag.

### Automated Inventory Deduction

- When an order transitions to `completed`, the system **automatically deducts the sold quantity** from `product_variants.inventory_quantity`.
- Every deduction is securely logged in the `inventory_movements` table with `movement_type='sale'`, leaving a clear, auditable trail of stock changes.

### ⚠️ Applying the Migration (Manual Step Required)

`supabase db push` is blocked by a **pre-existing issue** with the older `20260214100000` migration (the remote DB already has `gender='all'` data but the migration was never tracked). Until that's resolved, apply the new migration directly:

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard/project/krnnifoypyilajatsmva/sql)
2. Copy and paste the contents of `supabase/migrations/20260315100000_popup_sales_extras.sql`
3. Click **Run**

That's it. The existing popup orders are unaffected — all new columns are nullable.

> **To fix `supabase db push` long-term:** In Supabase SQL Editor, run:
> ```sql
> INSERT INTO supabase_migrations.schema_migrations (version, name)
> VALUES ('20260214100000', 'replace_unisex_with_all_in_products')
> ON CONFLICT DO NOTHING;
> ```
> This tells the CLI that migration was already applied, so it skips it on the next push.

### Files Changed

**New file:**
- `supabase/migrations/20260315100000_popup_sales_extras.sql`

**Backend:**
- `apps/backend/src/popup-sales/dto/create-popup-order.dto.ts` — new fields + `split_payments[]`
- `apps/backend/src/popup-sales/dto/update-popup-order.dto.ts` — mirrors new optional fields
- `apps/backend/src/popup-sales/popup-sales.service.ts` — applies discount to total calculation, inserts split payment rows

**Admin frontend:**
- `apps/admin/lib/api/popup-sales.ts` — updated `PopupOrder` type + new `SplitPaymentInput` + updated `CreateOrderInput`/`UpdateOrderInput`
- `apps/admin/app/(dashboard)/popup-sales/page.tsx` — full `NewOrderModal` replacement (~1000 lines, all other page functionality untouched)

---

## 2026-03-16 — Automatic MoMo Payment Confirmation & Order Action Safeguards

### What Got Done

Two things shipped today: the MoMo payment flow is now fully automatic (no more manual "Confirm Payment" click), and destructive order actions now ask for confirmation before firing.

---

### 1. Automatic MoMo Payment Confirmation

**The problem:** After a customer paid via MoMo USSD, the order would sit at "Awaiting Payment" until a staff member manually opened the dropdown and clicked "Confirm Payment". This was because Paystack sends a webhook to confirm payment, but webhooks require a public URL — and we were running locally.

**The fix:** Instead of waiting for Paystack to push a webhook to us, the frontend now *polls* Paystack directly every 5 seconds after a charge is initiated. As soon as Paystack confirms the payment, the order is automatically confirmed in the database — no manual step, no ngrok needed.

**How the MoMo modal now works:**

| Step | What happens |
|---|---|
| Staff enters phone + network, clicks "Send USSD Prompt" | Charge request sent to Paystack |
| Modal transitions to **"Waiting…"** screen | Amber spinner: *"Waiting for customer to confirm on their phone…"* |
| Customer approves on their USSD / enters PIN | Paystack records the payment |
| Within 5 seconds, the modal detects it | Auto-transitions to **green success screen** |
| Staff clicks Done | Order is already confirmed — nothing else to do |

The "Close (confirm later)" button is still there if the staff member needs to step away — the order list auto-refreshes every 15 seconds anyway, so it will catch up.

**New backend endpoint:** `GET /popup-sales/orders/:id/verify-payment`
- Calls `GET https://api.paystack.co/charge/:reference` on Paystack
- If Paystack says `"success"`, calls `confirmByReference()` to update the order in the DB
- Returns `{ status, confirmed }` to the frontend

---

### 2. Confirmation Dialogs for Destructive Actions

**Cancel Order** and **Mark as Completed** now show a confirmation dialog before executing. These were the two actions that are hard or impossible to reverse:

- **Cancel Order** → red dialog: *"Order POP-XXXX will be cancelled. This cannot be undone."*
- **Mark as Completed** → neutral dialog: *"Order POP-XXXX will be marked as completed and inventory will be deducted."*

All other actions (Put on Hold, Reactivate, Mark as Awaiting Payment, Confirm Payment) still fire immediately.

A reusable `ConfirmDialog` component was added — it accepts a `danger` flag that switches the confirm button between red and dark.

---

### Files Changed

**Backend:**
- `apps/backend/src/popup-sales/popup-sales.service.ts` — added `verifyPayment()` method
- `apps/backend/src/popup-sales/popup-sales.controller.ts` — added `GET /orders/:id/verify-payment` route

**Admin frontend:**
- `apps/admin/lib/api/popup-sales.ts` — added `useVerifyPopupPayment` hook
- `apps/admin/app/(dashboard)/popup-sales/page.tsx` — updated `MoMoChargeModal` (waiting/confirmed steps + polling), added `ConfirmDialog` component, updated `OrderActionsMenu`

---

*Last updated: 2026-03-30*

---

## Allies Partner Dashboard + Admin Markets (Mar 2026)

### What Got Done

**Built a brand-new app** — `apps/allies` — a partner-facing dashboard for 1NRI's field partners ("allies"). Also added a **Markets** section to the admin panel, merged the Payments page into Orders, and set up three new Supabase tables.

---

### 1. The Allies App (`apps/allies/`)

A full Next.js 15 app that lives alongside `admin`, `backend`, and `frontend` in the `apps/` folder. It runs on **port 3002** (`http://localhost:3002` locally, `allies.1nri.store` in production).

**What allies can do:**

| Section | What they see |
|---|---|
| Dashboard | Today's sales, month earnings, leaderboard rank, recent orders |
| Record a Sale | Search customers, pick products + variants, choose payment method, auto-calculates commission |
| Customers | All customers from their own sales, click-to-expand order history |
| Inventory | Read-only product catalog with stock levels (no edit access) |
| Leaderboard | All allies ranked by sales, filterable by This Month / This Week / All Time, highlights your own row |

**Key technical decisions:**

- **Framework:** Next.js 15 (App Router) with Tailwind CSS v4 and TypeScript
- **Auth:** `@supabase/ssr` middleware — all routes behind `/login` redirect if no session
- **Ally context:** A `useAlly()` hook (via `AllyProvider`) gives every page access to the logged-in ally's profile, including their **per-ally commission rate**
- **Commission rate:** Stored as a decimal (e.g. `0.15` = 15%) in the `allies` table. Pre-calculated and stored in `ally_sales.commission_amount` at the time of each sale
- **Mobile-first:** `DashboardShell` uses a hamburger drawer instead of a sidebar on small screens. All tables switch to card lists on mobile

**Running the allies app:**

```bash
cd apps/allies
npm install
npm run dev
# → http://localhost:3002
```

**Environment variables** (`apps/allies/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://krnnifoypyilajatsmva.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

---

### 2. New Supabase Tables

Run `apps/allies/supabase-migrations.sql` in the [Supabase SQL Editor](https://supabase.com/dashboard/project/krnnifoypyilajatsmva/sql/new). It creates:

**`allies`** — Partner profiles:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `auth.users` |
| `full_name` | text | |
| `email` | text | Unique |
| `phone` | text | |
| `location` | text | e.g. "Ashesi University" |
| `location_type` | text | `'campus'` or `'city'` |
| `commission_rate` | numeric(5,4) | e.g. `0.15` = 15% |
| `is_active` | boolean | Inactive allies can't log in |

**`ally_sales`** — Every sale an ally records:

| Column | Notes |
|---|---|
| `order_number` | Auto-generated (e.g. `ALS-482910`) |
| `ally_id` | FK → allies |
| `customer_name/email/phone` | Optional — walk-in sales allowed |
| `total` | Sale total |
| `commission_amount` | Pre-calculated: `total × commission_rate` |
| `payment_method` | `'cash'`, `'momo'`, or `'bank_transfer'` |
| `status` | `'completed'`, `'pending'`, `'refunded'` |

**`ally_sale_items`** — Line items per sale (product, variant, qty, unit price).

**RLS policies:**
- Any authenticated user can read all three tables (needed for the leaderboard)
- An ally can only insert sales for themselves (enforced by comparing `ally_id` to their auth UID)
- Only the service role (admin) can insert/delete ally rows

**If you get "permission denied" errors** after running the migration, also run:

```sql
grant usage on schema public to anon, authenticated, service_role;
grant all on public.allies to service_role;
grant all on public.ally_sales to service_role;
grant all on public.ally_sale_items to service_role;
grant select, insert, update on public.allies to authenticated;
grant select, insert, update on public.ally_sales to authenticated;
grant select, insert on public.ally_sale_items to authenticated;
```

---

### 3. Admin Panel — Markets Section

The admin sidebar now has a **Markets** nav item (visible to `admin` and `manager` roles).

**What it shows:**
- Summary cards: total allies, active count, all-time total sales, total earnings paid out
- Table of all allies with their sales performance (total sales, order count, earnings)

**What admins can do:**

- **Invite Ally** — Opens a modal; fills in name, email, location, commission rate. This sends a Supabase invite email to the ally (they click the link to set their password) and simultaneously creates the `allies` row
- **Edit Ally** — Slide-in right drawer for updating commission rate, location, location type, and active status

**RBAC:** Two new permissions added to `lib/rbac/permissions.ts`:
- `markets:read` — view the Markets page (manager + admin)
- `markets:manage` — invite and edit allies (manager + admin)

**Admin env variable needed** (`apps/admin/.env.local`):
```
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_ALLIES_URL=https://allies.1nri.store
```

The service role key is required because inviting users uses `supabase.auth.admin.inviteUserByEmail()` which bypasses RLS.

**Files added/changed in admin:**

| File | What |
|---|---|
| `lib/rbac/permissions.ts` | Added `markets:read` + `markets:manage` |
| `app/components/Sidebar.tsx` | Added Markets nav item; removed Payments nav item |
| `app/(dashboard)/markets/page.tsx` | Markets page (table + stats) |
| `app/(dashboard)/markets/actions.ts` | Server actions: `inviteAlly`, `updateAlly` |
| `app/(dashboard)/markets/components/InviteAllyModal.tsx` | Invite form |
| `app/(dashboard)/markets/components/EditAllyDrawer.tsx` | Edit drawer |

---

### 4. Payments → merged into Orders

The **Payments** nav item was removed from the admin sidebar. Its four stat cards (Total Collected, Pending, Refunded, Transactions) now appear at the top of the **Orders** page, above the search filters. The `payments/page.tsx` file still exists but is no longer linked from the nav.

---

### Creating a Test Ally (Manual Steps)

Since the `allies` table requires migration to be run first, the fastest way to create a test ally is:

1. **Run the migration** in the [Supabase SQL Editor](https://supabase.com/dashboard/project/krnnifoypyilajatsmva/sql/new) — paste the full `supabase-migrations.sql` file

2. **Create an auth user** — Supabase Dashboard → Authentication → Users → Add user:
   - Email: `testally@1nri.store`
   - Password: `Ally1234!`
   - Copy the UUID shown

3. **Insert the ally row** via SQL editor:

```sql
insert into public.allies (
  user_id, full_name, email, phone,
  location, location_type, commission_rate, is_active
) values (
  'YOUR_USER_UUID',
  'Kwame Asante', 'testally@1nri.store', '+233 24 000 0001',
  'Ashesi University', 'campus', 0.15, true
);
```

4. **Log in** at `http://localhost:3002` with `testally@1nri.store` / `Ally1234!`

Alternatively, once the migration is run, you can use the Invite Ally button in the admin Markets section — it handles steps 2 and 3 automatically.

---

### Files Created (this session)

| Location | File(s) |
|---|---|
| `apps/allies/` | Full Next.js 15 app (31 files) |
| `apps/allies/supabase-migrations.sql` | 3 new tables + RLS + grants |
| `apps/allies/scripts/seed-test-ally.mjs` | Test ally seed script |
| `apps/admin/app/(dashboard)/markets/` | Markets page, server actions, 2 UI components |

### Files Modified (this session)

| File | Change |
|---|---|
| `apps/admin/lib/rbac/permissions.ts` | Added `markets:read`, `markets:manage`; added both to manager + admin roles |
| `apps/admin/app/components/Sidebar.tsx` | Added Markets; removed Payments |
| `apps/admin/app/(dashboard)/orders/page.tsx` | Added payment stat cards at top |
| `apps/admin/.env.local` | Added `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_ALLIES_URL` |

---

### Fixes Applied After Initial Setup

#### 1. Inventory & Sales pages: wrong product column name

The allies app was querying `products.is_published` — that column doesn't exist in this project's schema. The correct column is `published` (boolean). Both pages were updated:

- `apps/allies/app/(dashboard)/inventory/page.tsx`
- `apps/allies/app/(dashboard)/sales/page.tsx`

Changed `.eq('is_published', true)` → `.eq('published', true).is('deleted_at', null)`.

Also fixed: `category` and `sku` don't exist as top-level product columns. The category equivalent is `product_type`, and `sku` is on each `product_variants` row.

#### 2. Migration script: duplicate policy error

If you ran the migration and got:
```
ERROR: 42710: policy "allies_select_authenticated" for table "allies" already exists
```
...it means the tables were already partially created from an earlier attempt. The migration file has been updated to use `DROP POLICY IF EXISTS` before each `CREATE POLICY`, so it is now safe to run multiple times.

#### 3. Grants not applied (permission denied)

The migration script stops on error, so the `GRANT` statements at the bottom may not have run. If you see `permission denied for table allies`, run this in the Supabase SQL editor:

```sql
grant usage on schema public to anon, authenticated, service_role;
grant all on public.allies to service_role;
grant all on public.ally_sales to service_role;
grant all on public.ally_sale_items to service_role;
grant select, insert, update on public.allies to authenticated;
grant select, insert, update on public.ally_sales to authenticated;
grant select, insert on public.ally_sale_items to authenticated;
```

---

## Global Analytics & Revenue Targets Update (April 2026)

### What Got Done

**Upgraded the admin dashboard with dynamic brand analytics and centralized general settings.**

1. **Global Database Revenue Targets** — Previously, the yearly revenue target progress bar relied on local browser storage (`localStorage`), meaning each admin saw different target data unless they manually configured it themselves. We migrated this to a global, database-backed `revenue_targets` schema in Supabase. Now, the main dashboard provides a secure, read-only UI tracking global progress.
2. **New General Settings Hub** — To decouple configuration from the dashboard's display logic, we created a new dedicated **General Settings** page (`/settings/general`). This page features a clean, secure form for selecting any financial year and updating the global goal on behalf of all admins.
3. **Dynamic Brand Analytics** — We implemented a powerful brand-filtering engine inside the core dashboard UI. The top selector now toggles all primary KPIs across "All Brands", "1NRI", or "Unlikely Alliances", dynamically pivoting the Revenue, Orders, and AOV data in real-time. We also solved hook ordering issues across these dynamic toggles, implicitly ensuring robust rendering cycles.
4. **Historical Auto-Scrolling Revenue Charts** — The primary dashboard revenue chart was expanded to support horizontal scrolling for wide-reaching historic data, ensuring past metrics remain accessible while automatically anchoring visually to the present date on mount.
5. **Fixed AOV Calculations** — Identified and solved an issue with the "All-Channels" Average Order Value calculation mathematically deflating. Previously, the backend incorrectly logged canceled and refunded orders into the `totalOrders` divisor alongside valid ones, breaking accuracy. We updated the pipeline queries ensuring canceled and refunded orders never artificially compromise AOV accuracy. 

### Files Modified & Created

- `supabase/migrations/20260406000000_create_revenue_targets.sql` *(New table for tracking global targets)*
- `apps/backend/src/orders/orders.controller.ts` & `orders.service.ts` *(Endpoints & DB fetching algorithms added for Revenue Targets; AOV cancellation-stripping patched)*
- `apps/backend/src/orders/dto/set-revenue-target.dto.ts` *(Added DTO)*
- `apps/admin/app/(dashboard)/settings/general/page.tsx` *(New standalone UI form to set global brand configuration)*
- `apps/admin/app/(dashboard)/components/RevenueLineChart.tsx` *(Made graph side-scrollable; stabilized React hooks)*
- `apps/admin/app/(dashboard)/components/RevenueTarget.tsx` *(Gutted inline editing; implemented pure read-only loading logic)*
- `apps/admin/app/components/Sidebar.tsx` *(Added navigation node to General Settings panel)*

*Last updated: 2026-04-06*

---

## Allies App: Final Deployment Touches (April 8, 2026)

### What Got Done

After the initial Allies app launch, several rounds of polish landed before deployment.

**1. Inventory page — accordion layout**

The inventory page was reworked to show products in an accordion pattern. Each product row expands to reveal its variant breakdown (size/color, stock counts, SKU). This avoids a wall of flat rows and makes it easier to scan stock across a large catalog.

**2. Sales page — real customer data**

The sales page was previously using placeholder/mock data. It now pulls live Supabase records and joins ally sales with the full order/customer context. A separate `sales/actions.ts` server action was added to keep the data fetching clean and out of the component.

**3. Customers page — full customer list**

The customers page was rebuilt to show all customers associated with an ally's sales. Each row shows the customer name, last order date, total spent, and order count — all derived from the `ally_sales` and `ally_sale_items` tables.

**4. Commission Settings — admin-side control**

A new `CommissionSettingsCard` component was added to the admin Markets page. Admins can now set a default commission rate (%), default sales quota, and quota period (monthly or all-time) from the UI. This setting applies globally to all allies unless overridden per-ally.

**5. Per-ally overrides via Edit Drawer**

An `EditAllyDrawer` was added to the admin Markets page. Clicking "Edit" on any ally opens a slide-over panel where you can:
- Change the ally's location and location type (campus / city)
- Update their individual commission rate
- Set or remove a per-ally quota override
- Toggle the ally active/inactive

**6. Commission quota migration**

A migration (`20260408200000_add_commission_quota.sql`) was added to support the new quota fields on the `allies` table and a new `commission_settings` table for the global defaults.

**7. Allies login page — background image + fixes**

The login page got a background image (`login-bg.jpeg`) and a UI cleanup pass. Several layout and alignment issues were fixed alongside the visual update.

### Files Modified

| File | Change |
|---|---|
| `apps/allies/app/(dashboard)/inventory/page.tsx` | Rebuilt with accordion layout per product |
| `apps/allies/app/(dashboard)/sales/page.tsx` | Wired to live Supabase data; added filter/sort |
| `apps/allies/app/(dashboard)/sales/actions.ts` | New server actions file for sales data fetching |
| `apps/allies/app/(dashboard)/customers/page.tsx` | Full customer list with order stats |
| `apps/allies/app/(dashboard)/page.tsx` | Dashboard stat cards polished |
| `apps/allies/app/(dashboard)/DashboardShell.tsx` | Layout refinements |
| `apps/allies/app/(auth)/login/page.tsx` | Background image, UI fixes |
| `apps/allies/app/globals.css` | Minor global style tweaks |
| `apps/admin/app/(dashboard)/markets/page.tsx` | Added CommissionSettingsCard + EditAllyDrawer |
| `apps/admin/app/(dashboard)/markets/actions.ts` | Server actions for updating ally + commission settings |
| `apps/admin/app/(dashboard)/markets/components/CommissionSettingsCard.tsx` | New component |
| `apps/admin/app/(dashboard)/markets/components/EditAllyDrawer.tsx` | New component |
| `supabase/migrations/20260408200000_add_commission_quota.sql` | Adds `commission_quota` to allies + `commission_settings` table |

---

## Preorders System (April 16, 2026)

### What Got Done

A full preorders system was built across the backend, admin panel, and customer-facing storefront. This lets customers pay for items that are out of stock or not yet available, and lets admin staff manage fulfillment once stock arrives.

### How it works

**On the storefront (`apps/frontend`)**

When a product variant has `preorder_enabled = true` in the database, the product detail page shows a "Pre-order" button instead of "Add to cart". The customer pays via Paystack as normal — the payment goes through, and a preorder record is created. Customers can view their active preorders in their account dashboard.

**In the admin panel (`apps/admin`)**

A new **Preorders** page (`/preorders`) shows all open preorders with filtering by status. From here, admins can:
- View order details (customer, product, variant, payment method, reference)
- Cancel a preorder
- Initiate a refund (via Paystack API, with SMS notification to the customer)
- Mark stock as held when inventory arrives

**Popup sales source**

There's also a separate endpoint and UI for creating preorders from in-person popup sales (`source: 'popup'`). These don't require a Paystack reference — payment method can be cash, MoMo, bank transfer, or "pending". The admin popup sales page (`/popup-sales`) was updated to support this flow.

**Per-variant limits**

Each variant can have an optional `preorder_limit`. If the limit is set, the system rejects new preorders once the cap is hit. The admin can see how many slots remain.

**Preorder status flow**

```
pending → stock_held → fulfilled
       ↘ cancelled
       ↘ refunded
```

### Database

Two migrations were added:

- `supabase/migrations/20260409000000_create_preorders.sql` — Creates the `preorders` and `preorder_refunds` tables; adds `preorder_enabled` and `preorder_limit` columns to `product_variants`
- `supabase/migrations/20260409000001_fix_preorders_schema.sql` — Follow-up schema fixes

**Run both migrations** in the Supabase SQL Editor if they haven't been applied yet.

### API Endpoints (backend)

| Method | Endpoint | Permission | What it does |
|--------|----------|-----------|--------------|
| `POST` | `/preorders` | authenticated | Create a preorder (customer, online) |
| `GET` | `/preorders/my` | authenticated | List the logged-in user's preorders |
| `POST` | `/admin/preorders/popup` | `popup:create` | Create a popup (in-person) preorder |
| `GET` | `/admin/preorders` | `orders:read` | List all preorders (paginated, filterable) |
| `GET` | `/admin/preorders/stats` | `orders:read` | Aggregated preorder stats |
| `GET` | `/admin/preorders/:id` | `orders:read` | Get a single preorder |
| `PATCH` | `/admin/preorders/:id/cancel` | `orders:update` | Cancel a preorder |
| `POST` | `/admin/preorders/restock/:variantId` | `inventory:update` | Notify customers stock has arrived |
| `POST` | `/admin/preorders/:id/refund` | `orders:refund` | Refund via Paystack + send SMS |

### Files Created

| Location | What it is |
|----------|-----------|
| `apps/backend/src/preorders/preorders.service.ts` | Core business logic |
| `apps/backend/src/preorders/preorders.controller.ts` | Route handlers |
| `apps/backend/src/preorders/preorders.module.ts` | NestJS module wiring |
| `apps/backend/src/preorders/dto/*.ts` | Request validation DTOs (5 files) |
| `apps/admin/app/(dashboard)/preorders/page.tsx` | Admin preorders dashboard |
| `apps/admin/lib/api/preorders.ts` | Admin API client helpers |
| `apps/frontend/app/(dashboard)/preorders/page.tsx` | Customer "my preorders" page |
| `apps/frontend/lib/api/preorders.ts` | Frontend API client helpers |
| `supabase/migrations/20260409000000_create_preorders.sql` | DB schema |
| `supabase/migrations/20260409000001_fix_preorders_schema.sql` | DB schema fixes |

### Files Modified

| File | Change |
|------|--------|
| `apps/admin/app/components/Sidebar.tsx` | Added Preorders nav link |
| `apps/admin/app/components/products/VariantsEditor.tsx` | Added preorder toggle + limit field per variant |
| `apps/admin/app/components/products/ProductForm.tsx` | Minor field changes |
| `apps/admin/app/(dashboard)/popup-sales/page.tsx` | Added popup preorder creation flow |
| `apps/admin/lib/validation/product.ts` | Updated validation for new variant fields |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | Pre-order button + Paystack flow |
| `apps/frontend/app/(dashboard)/layout.tsx` | Added preorders link to customer dashboard |
| `apps/backend/src/app.module.ts` | Registered PreordersModule |

### Note

The commit message says "needs more changes" — the preorders system is functional but consider it in active development. Test thoroughly before treating it as production-ready.

---

## Bulk SMS & Communications Page (April 16–18, 2026)

### What Got Done

A full **Communications** settings page was built in the admin panel, giving admins the ability to send bulk SMS messages to customers via the LetsFish provider. This sits under Settings → Communications in the admin sidebar.

### What the page does

**Provider status** — Shows whether LetsFish credentials are configured and which base URL is in use.

**Phone counts** — Displays how many customer profiles have a phone number on file, and how many have opted into SMS notifications.

**Recipient preview** — Before sending, admins can preview exactly who will receive the message. The preview table is paginated and shows name, phone, and a personalized version of the message (with `[name]` replaced by the customer's first name). Filter options: "All customers with a phone" or "SMS opted-in only".

**Message composer** — A text area with real-time character and segment counting. Handles both standard GSM-7 (160 chars/segment) and Unicode messages (70 chars/segment) correctly.

**Send bulk SMS** — Once reviewed, the admin can send. The backend processes recipients in batches of 5 with 200ms gaps between batches to avoid hitting the provider rate limit. Results (succeeded / failed / error detail) are shown after sending.

**Test SMS & Test Call** — A test panel lets admins send a single SMS or trigger a voice OTP call to any phone number to verify the integration is working.

**Communication logs** — A paginated table of all past outbound messages (SMS and voice OTP), including status (sent / delivered / failed), recipient, message content, and timestamp.

### Message personalization

Use `[name]` anywhere in the message body. The backend replaces it with the customer's first name. If a customer has no first name on file, it falls back to "there" (e.g., "Hi there,").

### Backend changes

The `LetsfishService` was updated with:
- Proper base request headers (`Content-Type`, `Accept`, `Authorization`, `User-Agent`) — previously these were missing and caused API rejections
- Structured error logging so failures appear in the backend logs with full details
- Correct color coding of failed SMS status in the UI response (was showing success color on failure)

The `CommunicationsService` and `CommunicationsController` are the main additions. All endpoints require admin-level permissions.

### API Endpoints (backend)

| Method | Endpoint | Permission | What it does |
|--------|----------|-----------|--------------|
| `GET` | `/communications/status` | `settings:read` | Provider health check |
| `GET` | `/communications/logs` | `settings:read` | Paginated communication log |
| `GET` | `/communications/phone-counts` | `settings:read` | Total phones + opted-in count |
| `POST` | `/communications/recipient-preview` | `settings:read` | Paginated preview of who will receive the message |
| `POST` | `/communications/test-sms` | `settings:update` | Send a test SMS to a single number |
| `POST` | `/communications/test-call` | `settings:update` | Make a test voice OTP call |
| `POST` | `/communications/bulk-sms` | `settings:update` | Send bulk SMS to all matching recipients |

### Files Created

| Location | What it is |
|----------|-----------|
| `apps/backend/src/communications/communications.service.ts` | Bulk SMS logic, recipient querying, personalization |
| `apps/backend/src/communications/communications.controller.ts` | Route handlers |
| `apps/backend/src/communications/dto/bulk-sms.dto.ts` | Request DTO for bulk send |
| `apps/backend/src/communications/dto/recipient-preview.dto.ts` | Request DTO for preview |
| `apps/admin/app/(dashboard)/settings/communications/page.tsx` | Full admin communications UI |

### Files Modified

| File | Change |
|------|--------|
| `apps/backend/src/letsfish/letsfish.service.ts` | Added base headers; added structured error logging; fixed failed-send detection |

### Environment Variables Required

The LetsFish integration reads from these env vars in `apps/backend/.env`:

```
LETSFISH_APP_ID=your_app_id
LETSFISH_APP_SECRET=your_app_secret
LETSFISH_BASE_URL=https://api.letsfish.africa/v1   # optional, this is the default
LETSFISH_SENDER_ID=Iris                             # optional, defaults to "Iris"
```

Without `LETSFISH_APP_ID` and `LETSFISH_APP_SECRET` set, the provider shows as "not configured" and all send attempts will throw an error.

---

## Sonner Toast Notifications — All Three Apps (May 2026)

### What Got Done

Every app (frontend, admin, allies) now uses **Sonner** for in-app notifications. Before this, most errors either showed up as inline banners that required manual dismissal, used browser `alert()` calls, or gave no feedback at all. Now everything is consistent: green for success, red for errors, amber for warnings, and they all auto-dismiss from the bottom-right corner.

### How it's set up per app

**Frontend** (`apps/frontend`) — The frontend has a dark mode toggle, so a custom `ClientToaster` component was created at `apps/frontend/components/ClientToaster.tsx`. It uses a `MutationObserver` to watch for the `dark` class on `<html>` and syncs the toast theme accordingly. It's mounted in the root layout via `<ClientToaster />`.

**Admin** (`apps/admin`) — The admin panel is always light-mode (hardcoded `colorScheme: "light"` on `<html>`), so a static `<Toaster theme="light" />` lives in its root layout. No wrapper needed.

**Allies** (`apps/allies`) — The allies dashboard has no theme toggle and follows the OS. A static `<Toaster theme="system" />` is in its root layout.

All three use `position="bottom-right"`, `richColors`, and a default duration of 4500ms (errors get 6000ms).

### What now shows a toast

**Frontend**

| Where | What triggers it | Toast |
|-------|-----------------|-------|
| Login page | Successful sign-in | ✅ "Signed in. Welcome back!" |
| Login page | Auth failure | ❌ Error message from API |
| Login page | `?message=password-updated` in URL | ✅ "Your password has been updated." |
| Login page | `?error=auth-callback-failed` in URL | ❌ "Authentication failed. Please try again." |
| Signup page | Submit failure | ❌ Error message from API |
| Update password page | Validation / submit failure | ❌ Error message |
| Verify page | Code submit failure / resend failure | ❌ Error message |
| Reset password page | Submit failure | ❌ Error message |
| Profile page | Successful save | ✅ "Profile updated." |
| Profile page | Save failure | ❌ Error message |
| Product page (pre-order) | Paystack unavailable | ❌ "Payment unavailable..." |
| Product page (pre-order) | Payment recorded but order save failed | ❌ Long-duration error with reference |
| Checkout | Order creation failure | ❌ Error message |
| Checkout | Paystack modal closed without paying | ⚠️ "Payment was cancelled. You can try again." |
| Cart | Trash icon (remove item) | ✅ "{Product name} removed from cart." |

**Admin**

| Where | What triggers it | Toast |
|-------|-----------------|-------|
| Login page | Successful sign-in | ✅ "Signed in." |
| Login page | Auth failure | ❌ Error message |
| Login page | `?error=unauthorized` in URL | ⚠️ "You don't have permission..." (8 second duration) |
| Accept invite page | Password validation / submit failure | ❌ Error message |
| Header (avatar upload) | Upload failure | ❌ "Failed to upload photo. Please try again." |
| Product form | Product created | ✅ "Product created." |
| Product form | Product saved | ✅ "Product saved." |
| Product form | Submit failure | ❌ Error message |
| Product form | Variant mutation failure | ❌ Error message |
| Invite ally modal | Successful invite | ✅ "Ally invited successfully." |
| Invite ally modal | Invite failure | ❌ Error from API |
| Edit ally drawer | Successful update | ✅ "Ally updated." |
| Edit ally drawer | Update failure | ❌ Error from API |
| Commission settings card | Successful save | ✅ "Commission settings saved." |
| Commission settings card | Save failure | ❌ Error from API |
| General settings (shipping) | Saved | ✅ "Shipping options updated." |
| General settings (revenue target) | Saved | ✅ "Revenue target updated." |
| Orders page (status dropdown) | Status updated | ✅ "Order status updated to {status}." |
| Orders page (status dropdown) | Update failure | ❌ "Failed to update order status." |
| Pre-orders page (cancel) | Successful cancel | ✅ "Pre-order cancelled." |
| Pre-orders page (cancel) | Cancel failure | ❌ "Failed to cancel pre-order." |
| Pre-orders page (restock) | Restock API failure | ❌ "Restock failed. Please try again." |

**Allies**

| Where | What triggers it | Toast |
|-------|-----------------|-------|
| Login page | Auth failure | ❌ Error message from API |
| Sales page | Sale recording failure | ❌ "Error recording sale" with description |
| Onboarding (photo step) | Upload failure | ❌ Error message |

### What was intentionally left as-is

Some flows already have sufficient visual feedback and don't need a toast on top:

- **ProductCard "Add to cart"** — the card already shows a checkmark animation
- **Cart quantity +/− buttons** — tapping rapidly would fire a toast per click
- **Pre-order success** — full-screen success modal with confetti
- **Restock/Refund modal success** — inline green confirmation panel inside the modal
- **Ally sale success** — full-screen success state showing commission earned
- **Logout (all apps)** — redirect to login is clear enough
- **Signup** — redirects to the verify page which explains next steps

### Files Created

| File | What it is |
|------|-----------|
| `apps/frontend/components/ClientToaster.tsx` | Theme-aware Toaster wrapper for the frontend |

### Files Modified

| File | Change |
|------|--------|
| `apps/frontend/app/layout.tsx` | Mounted `<ClientToaster />` |
| `apps/admin/app/layout.tsx` | Mounted `<Toaster theme="light" />` |
| `apps/allies/app/layout.tsx` | Mounted `<Toaster theme="system" />` |
| `apps/frontend/app/(auth)/login/page.tsx` | URL-param toasts, error toast, sign-in success toast |
| `apps/frontend/app/(auth)/signup/page.tsx` | Error toast on failure |
| `apps/frontend/app/(auth)/update-password/page.tsx` | Error toast |
| `apps/frontend/app/(auth)/verify/page.tsx` | Error toasts for submit and resend |
| `apps/frontend/app/(auth)/reset-password/page.tsx` | Error toast (kept full-screen submitted state) |
| `apps/frontend/app/(dashboard)/profile/page.tsx` | Success + error toasts |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | Pre-order error toasts |
| `apps/frontend/app/(shop)/checkout/CheckoutClient.tsx` | Error + warning toasts |
| `apps/frontend/app/(shop)/cart/page.tsx` | Remove-item success toast |
| `apps/admin/app/(auth)/login/page.tsx` | Sign-in success, error, and unauthorized toasts |
| `apps/admin/app/(auth)/accept-invite/page.tsx` | Error toasts |
| `apps/admin/app/components/Header.tsx` | Photo upload error toast |
| `apps/admin/app/components/products/ProductForm.tsx` | Success + error toasts |
| `apps/admin/app/(dashboard)/markets/components/InviteAllyModal.tsx` | Success + error toasts |
| `apps/admin/app/(dashboard)/markets/components/EditAllyDrawer.tsx` | Success + error toasts |
| `apps/admin/app/(dashboard)/markets/components/CommissionSettingsCard.tsx` | Success + error toasts; removed old `saved` state and timeout |
| `apps/admin/app/(dashboard)/settings/general/page.tsx` | Success toasts; removed old success states and timeouts |
| `apps/admin/app/(dashboard)/orders/page.tsx` | Status update success + error toasts |
| `apps/admin/app/(dashboard)/preorders/page.tsx` | Cancel + restock error handling with toasts |
| `apps/allies/app/(auth)/login/page.tsx` | Error toast |
| `apps/allies/app/(dashboard)/sales/page.tsx` | Replaced `alert()` with error toast |
| `apps/allies/app/onboarding/StepPhoto.tsx` | Error toasts |

*Last updated: 2026-04-22*

---

## Storefront Navbar Redesign & UI Polish (May–June 2026)

### What Got Done

**Rebuilt the storefront header from scratch to match a cleaner editorial fashion aesthetic.**

1. **Transparent homepage header** — On the homepage, the navbar has no background (transparent). As soon as you scroll, it snaps to a solid white (light mode) or dark (`gray-950`) background with a bottom border. On all other pages it's always solid. This is powered by a `scrolled` state that listens to the window scroll event.

2. **Centered 1NRI logo** — The brand logo (`/homepage_img/no-bg-1NRI.png`) is absolutely centered in the navbar. It's white (CSS `brightness-0 invert`) when transparent on the homepage, and natural color otherwise. The logo renders at `h-8` (32px) with a minimum width so it never collapses.

3. **Left nav links (desktop only)** — Three links in `text-xs font-medium uppercase tracking-widest`: "Road to HQ", "Shop", "About". Active link is black/white; inactive links are muted gray with a hover transition. Hidden on mobile.

4. **Right icons** — In order: Locale/Currency selector (desktop only), Favourites (heart with count badge), User (avatar letter or icon), Cart (bag with count badge). Each has consistent `p-1 transition` styling and separate transparent/solid color states.

5. **Mobile hamburger** — A `Menu`/`X` icon toggles a dropdown below the header. The dropdown always has a solid background even when the header above is transparent, so links are readable on any page background.

6. **Dark/light toggle moved to footer** — The moon/sun theme toggle button is no longer in the header. It now sits in the footer's bottom bar, right-aligned next to the copyright line. The footer bottom bar became a `flex justify-between` layout instead of centered text.

### Files Modified

- `apps/frontend/app/(shop)/layout.tsx` — full `ShopHeader` rewrite, footer bottom bar updated

---

## ProductCard — Color Swatches & Color-Matched Navigation (May–June 2026)

### What Got Done

**Added color swatches to every product card, and wired the selected color through to the product detail page.**

### Color Swatches on Cards

Each product card now shows a row of small circular swatches (16×16px) below the product title. The swatches come from `color_tags` stored on product images — each distinct tag gets one swatch. Clicking a swatch:

- Changes the card's displayed image to the first image tagged with that color
- Highlights the swatch with a ring (`ring-1 ring-gray-900`)
- On mouse leave, the image returns to the selected color's image (not image 0)

The color name is converted to a hex value using `COLOR_HEX` — a lookup table with 150+ entries covering every fashion color you'd encounter: blacks, whites, grays, creams, tans, browns, blues (navy through powder), greens (forest through pistachio), reds, pinks, purples, yellows, oranges, and pattern labels like "camo". Colors not in the table get a consistent hue via `hashColor()` (deterministic hash → HSL), so swatches never appear blank.

### Color Passed to the Product Detail Page

The `Link` on the product card now appends `?color=<selectedColor>` to the URL when a color is selected:

```
/product/my-tee          ← no color selected (defaults to first in-stock)
/product/my-tee?color=Black  ← card was showing Black colorway
```

### PDP Pre-Selects the Correct Color

The product detail page reads the `color` URL param via `useSearchParams()`. In the initialization `useEffect`, before defaulting to the first in-stock variant, it checks if the color param matches any value in the color option group and pre-selects it. If the param doesn't match any option (e.g. a color name mismatch), it falls back to the default behavior gracefully.

Since `useSearchParams()` requires Suspense in the Next.js App Router, the PDP was refactored:
- `ProductDetailBody` — the main component, receives `id` and `initialColor` as props
- `ProductDetailPageWrapper` — reads `use(params)` and `useSearchParams()`, passes both down
- `ProductDetailPage` (exported default) — wraps everything in `<Suspense fallback={<ProductDetailSkeleton />}>`
- `ProductDetailSkeleton` — extracted into its own function, used by both Suspense fallback and the data-loading state

### Files Modified

- `apps/frontend/app/(shop)/components/ProductCard.tsx` — `COLOR_HEX` map, `hashColor()`, color swatches UI, `?color=` URL param in Link
- `apps/frontend/app/(shop)/product/[id]/page.tsx` — `useSearchParams`, Suspense wrapper, `initialColor` prop, pre-selection logic in `useEffect`

---

## Currency Selector, Region Indicator & Live Price Conversion (June 2026)

### What Got Done

**Added a region display and currency selector to the navbar (desktop/tablet only), plus live exchange rate conversion for all shop-facing prices.**

### The Navbar Button

On screens `md:` and wider, the right side of the navbar now has a new element before the other icons:

```
🇬🇭 GHANA (GH) · ₵ GHS ∨
```

Clicking it opens a dropdown with 7 currency options. The currently selected currency gets a light `bg-gray-100` highlight. Click outside or select a currency to close it.

On mobile (`< md`), the button is `hidden` — the mobile layout is unchanged.

### Region Detection (VPN-Resistant)

Region is detected from `Intl.DateTimeFormat().resolvedOptions().timeZone` — the operating system's timezone. This is configured at the OS level and is **not changed by VPN software**, making it considerably more stable than IP-based geolocation. No API call needed; it's instant and works offline.

A lookup table maps ~25 common timezones to `{ country, countryCode, flag }`:

```
Africa/Accra        → 🇬🇭 Ghana (GH)
Africa/Lagos        → 🇳🇬 Nigeria (NG)
Europe/London       → 🇬🇧 United Kingdom (GB)
America/New_York    → 🇺🇸 United States (US)
America/Toronto     → 🇨🇦 Canada (CA)
Australia/Sydney    → 🇦🇺 Australia (AU)
Asia/Dubai          → 🇦🇪 UAE (AE)
... and ~18 more
```

Unknown or unmapped timezones fall back to `🌐 Global`.

**Tradeoff:** A user who manually changed their system timezone (very rare) or who travels without updating their timezone gets a "wrong" region label. This is acceptable — the region display is informational only, and the user always controls the currency they see via the dropdown.

### Supported Currencies

| Code | Name              | Symbol |
|------|-------------------|--------|
| GHS  | Ghana Cedi        | ₵      |
| USD  | US Dollar         | $      |
| EUR  | Euro              | €      |
| GBP  | British Pound     | £      |
| NGN  | Nigerian Naira    | ₦      |
| AUD  | Australian Dollar | A$     |
| CAD  | Canadian Dollar   | C$     |

### Live Exchange Rates

Exchange rates are fetched from `https://open.er-api.com/v6/latest/GHS` (free tier, no API key needed). The response gives rates relative to GHS, e.g. `{ "USD": 0.067, "EUR": 0.062, ... }`.

To avoid hammering the API on every page load, rates are cached in `localStorage` under `iris_fx_rates` as `{ rates: {...}, ts: Date.now() }`. The cache is valid for 1 hour. If the API is offline, prices simply display in GHS (no error shown to the user).

### `formatPrice(ghsAmount)` — The Conversion Function

All product prices in the database are stored as raw GHS amounts (e.g. `450` = GH₵450.00). The `LocaleProvider` context exposes a `formatPrice(ghsAmount: number): string` function:

```
GHS selected:  ₵450.00
USD selected:  $30.15  (450 × 0.067)
EUR selected:  €27.90  (450 × 0.062)
```

Always formats to 2 decimal places with the currency symbol prepended.

### What Gets Converted

| Page | Converts? |
|------|-----------|
| Product listing cards (`/products`) | ✅ Yes |
| Product detail page (`/product/:id`) — display + compare price, button label | ✅ Yes |
| Cart page — item totals, subtotal | ✅ Yes |
| Checkout — prices, totals | ❌ No (Paystack charges in GHS) |
| Checkout — exchange rate note | ✅ Shown when non-GHS selected |
| Dashboard / order history | ❌ No (historical GHS amounts) |

The checkout note appears below the total line when a non-GHS currency is active:

> _Exchange rate: 1 USD = 14.95 GH₵ · You will be charged GH₵ 450_

### Persistence

The selected currency is saved to `localStorage` under `iris_currency` (defaults to `"GHS"`). It survives page refresh and browser restart.

### New File

- `apps/frontend/lib/locale/locale-provider.tsx` — exports `LocaleProvider`, `useLocale()`, `CURRENCIES`

### Provider Wrapping

`ShopLayout` now uses:

```tsx
<ThemeProvider>
  <LocaleProvider>       ← NEW
    <CartProvider>
      <ShopLayoutInner>…</ShopLayoutInner>
    </CartProvider>
  </LocaleProvider>
</ThemeProvider>
```

### Files Modified

- `apps/frontend/lib/locale/locale-provider.tsx` — **new file**
- `apps/frontend/app/(shop)/layout.tsx` — `LocaleProvider` wrap, `LocaleSelectorButton` component
- `apps/frontend/app/(shop)/components/ProductCard.tsx` — `useLocale().formatPrice()`
- `apps/frontend/app/(shop)/product/[id]/page.tsx` — replaced local `fmt()` with `useLocale().formatPrice()`
- `apps/frontend/app/(shop)/cart/page.tsx` — `useLocale().formatPrice()`
- `apps/frontend/app/(shop)/checkout/CheckoutClient.tsx` — exchange rate note

---

## Product Detail Page Upgrades (May–June 2026)

### What Got Done

**Several quality-of-life upgrades to the product detail page that ship together.**

### Gallery with Color-Based Image Filtering

The `PDPGallery` component now filters the image set based on the currently selected color option. Rules:

- Images with `color_tags` matching the selected color → shown
- Images with empty `color_tags` → always shown (lifestyle/shared shots)
- Images tagged for other colors → hidden

This means switching from "Black" to "Navy" immediately shows the Navy colorway images and hides the Black ones, while any untagged brand/lifestyle shots stay visible throughout.

If no images have any tags at all (product hasn't been tagged yet), the full image set is shown — so untagged products still work correctly.

The gallery has two layouts: a vertical thumbnail strip on desktop (`lg:grid-cols-[64px_1fr]`) and mobile dot indicators. Navigation arrows are shown when there's more than one image. An image counter (`01 / 05`) is overlaid in the bottom-left of the main image.

### Recently Viewed

When you open any product page, `addRecentlyViewed(product)` is called. This stores the product in `localStorage` under `iris_recently_viewed`, keeping a max of 8 most-recent products and deduplicating by ID.

At the bottom of the PDP, a "Recently Viewed" section shows up to 5 `ProductCard` components from the recently viewed list, excluding the current product. This section only renders if there are any recently viewed products.

### Favourites Toggle

The PDP has a "Save to Favourites" button below the add-to-cart CTA. It uses `useToggleFavourite(productId)`:

- Heart icon fills when the product is saved
- Button label switches between "Save to Favourites" and "Saved"
- If not logged in, clicking redirects to `/login`
- Optimistic update — heart fills immediately while the API call is in flight

### Preorder Modal with Paystack Inline

When a product variant has `preorder_enabled = true`, the add-to-cart button is replaced by "Pre-order Now". Clicking opens a full-screen modal overlay:

- Product title + variant name + unit price
- Quantity picker (±1 buttons, minimum 1)
- Running total
- "Pay GH₵{total}" button that triggers Paystack inline (not the hosted page)

The modal loads the Paystack script dynamically on mount so it doesn't slow down the initial page load. On successful payment, a preorder record is created via `POST /preorders` and the user is redirected to `/preorders/confirmation?order={orderNumber}`.

Note: the preorder modal always displays in GHS regardless of the selected currency — Paystack processes in GHS and we want no ambiguity about what the customer is actually being charged.

### You May Also Like

Uses `useSimilarProducts(product.handle, 6)`. If the recommender is running, shows 5 similar products in a grid. Falls back to the 5 most recently added products via `useProducts({ limit: 8, sort_by: "created_at", sort_order: "desc" })` when the recommender is offline or returns nothing.

### Files Modified

- `apps/frontend/app/(shop)/product/[id]/page.tsx` — gallery, recently viewed, favourites, preorder modal, similar products
- `apps/frontend/lib/recently-viewed.ts` — `addRecentlyViewed()`, `useRecentlyViewed()` hook
- `apps/frontend/lib/favourites.ts` — `useToggleFavourite()`, `useFavourites()`

---

## Image Loading Performance Improvements (May 2026)

### What Got Done

**Two targeted changes to make product images load faster and look better.**

1. **Lazy loading on product cards** — `ProductCard` images use `loading="lazy"`. The browser defers fetching off-screen images until the user scrolls toward them. On a typical products page with 16+ cards, only the images in the initial viewport load immediately. This significantly reduces the initial network load.

2. **`object-top` crop alignment** — All product images use `object-cover object-top`. Portrait product shots (models, flatlay) have the subject near the top. `object-top` makes sure the face or key product detail isn't cropped away when the image is fitted into the card's `3:4` aspect ratio.

3. **Hover prefetch on product cards** — When the user hovers a product card, `queryClient.prefetchQuery` fires for that product's detail API call (`/products/:handle`). By the time they click and the product detail page mounts, the data is already in the React Query cache — so the PDP often renders instantly with no loading spinner.

4. **Onboarding flow images** — The allies/admin onboarding flows also had their image loading tuned separately around the same time.

### Files Modified

- `apps/frontend/app/(shop)/components/ProductCard.tsx` — `loading="lazy"`, `object-top`, `prefetchQuery` on `mouseEnter`

---

*Last updated: 2026-06-02*

---

## Storefront Navbar — Icon Tweaks & Hover Animations (June 2026)

### What Got Done

**Three small but visible improvements to the right-side navbar icons.**

1. **Icon order** — Cart (shopping bag) now comes before User (person icon). Order is: Locale selector → Search → Favourites → Cart → User.

2. **Hover animations** — Each icon has its own micro-animation on hover so the navbar feels more responsive:
   - **Heart (Favourites)** — scales up 110% and tilts −6°
   - **Shopping Bag (Cart)** — scales up 110% and lifts slightly (`-translate-y-0.5`)
   - **User / Avatar** — scales up 110%
   - **Search** — scales up 110%
   - All use `transition-transform duration-200` so they're snappy, not sluggish

3. **Mobile icon sizing** — On small screens all four icons shrink from 18px to 16px and the gap between them tightens from `gap-4` to `gap-2`. At `md:` and above everything returns to the original 18px / `gap-4`. The `LocaleSelectorButton` was already `hidden md:flex` so it never affected mobile.

### Files Modified

- `apps/frontend/app/(shop)/layout.tsx` — icon order, hover classes, responsive sizing

---

## Spotlight-Style Search (June 2026)

### What Got Done

**Restored the search icon to the navbar and completely redesigned the search experience to match macOS Spotlight.**

### The Search Icon

A magnifying glass icon sits in the right icon group (between Locale selector and Favourites). Same hover scale animation as the other icons. Opens the search overlay on click, or via **⌘K** / **Ctrl+K** from anywhere on the page.

### The Overlay

Instead of a small modal pinned to the top of the page, search now opens a centred panel that appears ~18% from the top — the same vertical position macOS Spotlight uses. The rest of the screen dims with a `backdrop-blur-md` overlay.

**Design details:**

- `max-w-[600px]` rounded `2xl` container with a deep shadow (`0 32px 80px rgba(0,0,0,0.25)`)
- Large `17px` input with a prominent search icon — no internal borders, just one clean field
- When the query is empty, a **Quick Access** section lists 5 category shortcuts: Shop All, Tops, Bottoms, Accessories, Footwear. Each has a small icon chip and an `→` hint.
- When typing, the quick links are replaced by a single **"Search for '…'"** row with a description and `↵` hint
- A clear button (`×`) appears inside the input while there's text; an `ESC` pill shows when the field is empty
- Footer bar shows keyboard hints: `↑↓` navigate · `esc` close
- Full dark mode support (`dark:bg-[#1c1c1e]`)

### Keyboard shortcut

`⌘K` / `Ctrl+K` is wired as a global `keydown` listener inside `ShopHeader`. It fires `setSearchOpen(true)` from anywhere — doesn't interfere with browser defaults since `e.preventDefault()` is called only when both modifier + K are pressed.

### Files Modified

- `apps/frontend/app/(shop)/layout.tsx` — `SearchOverlay` full rewrite, `QUICK_LINKS` constant, ⌘K global listener, search icon in right icons

---

## Search & Filter Bug Fixes (June 2026)

### What Got Done

**Fixed three bugs that caused search and category filters to silently do nothing.**

### Bug 1 — Stale state when navigating to `/products` from within the same session

`ProductCatalogContent` initialises its `search`, `category`, and `productType` states from `useSearchParams()` via `useState(initialValue)`. `useState` only runs once on mount — if the user was already on `/products` and then navigated to `/products?search=hoodie` (via the search overlay), the URL updated but the component didn't remount, so the state stayed at the old value.

**Fix:** Added a `useEffect` that watches `searchParams` and syncs all three states when the URL changes:

```ts
useEffect(() => {
  setSearch(searchParams.get("search") || "");
  setCategory(searchParams.get("category") || "");
  setProductType(searchParams.get("product_type") || "");
}, [searchParams]);
```

### Bug 2 — Category case mismatch

The search overlay quick links were sending `?category=tops` (lowercase) but `ProductFilters` and the API both expect `"Tops"` (capitalised). The filter tabs would never highlight, and the API query would receive the wrong value.

**Fix:** All quick links now use properly capitalised values (`?category=Tops`, `?category=Bottoms`, etc.).

### Bug 3 — `?tag=new` was silently ignored

The "New Arrivals" quick link was using `?tag=new`. The products page never reads a `tag` URL param, so clicking it just loaded `/products` with no filter applied. Replaced with a working "Footwear" category link.

### Files Modified

- `apps/frontend/app/(shop)/products/page.tsx` — added `useEffect` URL sync, added `useRouter` import
- `apps/frontend/app/(shop)/layout.tsx` — fixed `QUICK_LINKS` (capitalised categories, replaced broken tag link)

---

## Clear All Filters (June 2026)

### What Got Done

**Added active filter chips and a "Clear all" button to the product catalogue.**

When any filter is active (search query, category, subcategory, gender, or a non-default sort), a new row of chips appears between the category tabs and the subcategory pills. Each chip shows what's currently filtered and has its own `×` to remove just that one filter. A "Clear all" underline link at the end resets everything at once.

**Chip types:**

| Filter | Example chip |
|---|---|
| Search query | 🔍 "hoodie" × |
| Category | Tops × |
| Subcategory / product type | T-Shirts × |
| Gender | Men's × |

**"Clear all"** resets all five filter states (`gender`, `sort`, `search`, `category`, `productType`) back to their defaults and calls `router.replace("/products")` to also clean the URL — so if the user refreshes the page after clearing, they still get the default view rather than a stale search URL.

The chip row only renders when `hasActiveFilters` is true, so on a fresh unfiltered browse it's completely invisible.

### Files Modified

- `apps/frontend/app/(shop)/components/ProductFilters.tsx` — added `onClearAll` prop, `hasActiveFilters` computed value, chip row UI
- `apps/frontend/app/(shop)/products/page.tsx` — added `handleClearAll` callback (`useCallback`), passes it as `onClearAll` to `ProductFilters`

---

## Product Image Loading — Performance Overhaul (June 2026)

### What Got Done

**Fixed the slow product images.** Some images on the `/products` grid were taking up to ~40 seconds to appear, especially ones lower down the page. We tracked down the real causes (which were not what they looked like), migrated the product grid and product detail page to Next.js's `<Image>` component, killed a background-loading "stampede", and made colour-variant swaps near-instant — on desktop *and* mobile.

### The Investigation (what we actually measured)

Rather than guess, we audited **all 99 images across the 28 products** by hitting the live Supabase storage and the backend API. The findings changed the whole plan:

- **The images that load are tiny — but the originals are huge.** A few products had small originals (~47KB), but across the catalogue the originals are **median 585KB, average 1.15MB, and up to 6.6MB** (olive-grove, genesis, the hoodie, flare-sweatpants, the wallpapers). The grid was downloading these full-size files into cells that are only ~360px wide.
- **Nothing was cacheable.** Every single one of the 99 images is served with `cache-control: no-cache`, so the browser (and the CDN) re-fetches it on every render, scroll, and revisit.
- **The CDN edge is literally in Accra** (`cf-ray …-ACC`) — right next to our users — but the `no-cache` header means it never caches anything, so every image makes a full round-trip to a distant origin.
- **A background "stampede" was choking the network.** The old `useImagePrefetch` hook ran inside *every* `ProductCard`, each firing up to **9** background image downloads (3 "priority" + 6 "deferred") of the *raw multi-MB originals* the moment the card mounted. With 16+ cards on screen that's 100+ simultaneous heavy downloads competing for bandwidth — which is exactly why the visible images lower down the page were starving and taking 40s.
- **Supabase's on-the-fly image transforms are not available** on our plan (the transform endpoint returns `403`).
- **The `optimized/` folder is a red herring for the grid.** There is an `optimized/` folder (800×800), but those files are a **square centre-crop** — they cut off the top of the head and the lower body, losing the portrait framing we designed. They're also not generated by our backend (a one-off batch), so future uploads wouldn't have them. We chose to keep the original framing.

### The Root Causes (in plain terms)

1. **Oversized originals** served straight into tiny grid cells.
2. **No caching** at the source — the Accra edge can't help.
3. **The prefetch stampede** — dozens of background multi-MB downloads per page.
4. **Plain `<img>` tags** with no resizing, no modern formats, and contradictory hints (`loading="lazy"` *and* `fetchPriority="high"` on the same tag).

### What Changed

We deploy on **Vercel**, whose built-in image optimisation is the perfect tool here: it fetches each original once (server-side), resizes it to the exact display size, converts it to **AVIF/WebP**, and edge-caches the result for a year — so the browser always gets a tiny image, and the `no-cache` origin stops mattering for anything rendered through `<Image>`.

1. **Migrated the grid + product page to `next/image`.** `ProductCard` is reused in five places (the catalogue grid, favourites, "you may also like" on the product page, the personalised strip, and the basic grid), so fixing it once fixed all of them. The product detail page's main image and thumbnail strip were converted too. Each `<Image>` now has a proper `sizes` hint matching the responsive grid (`25vw` desktop / `33vw` tablet / `50vw` mobile).
2. **Tuned `next.config.ts`** — enabled `avif` + `webp`, added `qualities: [70, 75, 80]` (required by Next 16 for non-default quality), and set **`minimumCacheTTL: 31536000`** (1 year). That last one is critical: because the origin says `no-cache`, this is what tells Vercel to cache the *optimised* output long-term anyway. Product filenames are immutable (timestamped), so a year is safe.
3. **Killed the stampede and rebuilt prefetching around user intent.** The grid no longer mass-downloads images on mount. The hook was rewritten to build the *same* `/_next/image` URL that `<Image>` renders (via `nextImageUrl` / `prefetchImage` helpers), so prefetches are real cache hits instead of wasted downloads of a different file.
4. **First-row priority.** The first ~4 cards (the visible row) load eagerly for a fast first paint; everything else lazy-loads as you scroll.
5. **Skeleton placeholder.** Each image shows a subtle `animate-pulse` block until it loads, then fades to the photo. No backend work, no extra requests.

### Colour-Variant Swaps Are Now Near-Instant

This was a specific pain point. Before, clicking a colour swatch swapped the `<img src>` to a fresh, uncached, possibly-multi-MB original — a visible delay. Now:

- **Render side:** the swapped-in image is a small AVIF (~15–20KB), so even a cold swap is fast.
- **Prefetch on intent:** hovering, focusing, *or* touching a swatch warms that colour's image *before* the click lands:

  ```tsx
  onMouseEnter={() => handleColorPrefetch(color)}
  onFocus={() => handleColorPrefetch(color)}
  onTouchStart={() => handleColorPrefetch(color)}
  ```
- **Exact-URL matching:** `gridPrefetchWidth()` works out the width Next will actually request for the current viewport (≈750 on desktop, ≈640 on a 2-column phone) so the warmed image matches the one the swap renders — a guaranteed cache hit, not a wasted fetch.

So: point at a colour → its optimised image is fetched and cached → click → it swaps from cache, near-instant.

### Mobile

The core wins help mobile *more* (responsive `sizes` gives phones an even smaller image; removing the stampede matters most on cellular). The one desktop-only mechanic — hover prefetch — was handled with **`onTouchStart`** (fires ~100–300ms before a tap completes) plus the viewport-aware width above, so tap-to-swap is fast on phones too. Worst case (a tap with no head-start) still loads a ~15KB AVIF, not a multi-MB original.

### Results (measured against the live optimiser)

| Source original | Browser now receives (AVIF) | Reduction |
|---|---|---|
| greatness-tee (864×1080, 47KB) | **14KB** | 3.4× |
| dusk button-up (2400×3600, **967KB**) | **21KB** | **46×** |
| any image in a 64px PDP thumbnail | **1.1KB** | ~900× |

### Files Modified

| File | What Changed |
|---|---|
| `apps/frontend/next.config.ts` | `formats: avif+webp`, `minimumCacheTTL: 31536000`, `qualities: [70,75,80]` |
| `apps/frontend/app/(shop)/components/ProductCard.tsx` | `<img>` → `next/image`; removed the mount-time prefetch stampede; intent-based swatch prefetch (hover/focus/touch) at a viewport-matched width; skeleton; new optional `priority` prop |
| `apps/frontend/app/(shop)/components/InfiniteProductGrid.tsx` | First row of cards gets `priority` for a fast LCP |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | PDP main image + thumbnail strip → `next/image`; PDP prefetch trimmed from "all originals" to a small set of optimised URLs |
| `apps/frontend/hooks/useImagePrefetch.ts` | Reworked: `nextImageUrl` + `prefetchImage` helpers (prefetch the optimised URL, not the raw original); PDP hook capped instead of unbounded |
| `apps/frontend/hooks/index.ts` | Exports the new helpers |

### Future Work — Pillar 4: Fix Caching at the Source (Supabase)

There's a fourth improvement we **investigated but intentionally did not ship**, documented here so someone can pick it up later.

**The idea:** the real root cause of repeat-load slowness is that Supabase serves every object with `cache-control: no-cache`. If we fixed that, the Accra CDN edge would cache images and serve repeat visits instantly — and Vercel's optimiser would re-fetch originals far less often.

**Why we didn't ship it now:** we tested it and **re-uploading the files does not change the served header.** The objects' stored metadata *already* says `max-age=31536000`, yet the public endpoint still returns `no-cache`, and a fresh upload via the Supabase SDK still came back `no-cache`. Combined with image transforms returning `403`, this is the classic **Supabase Free-tier** signature: the "Smart CDN" that honours `cacheControl` (and the image-transformation feature) are **paid features**. So a migration script would have been a no-op.

This is fine for now because **`next/image` on Vercel is already our caching layer** — it edge-caches the optimised AVIF for a year regardless of the origin header. Pillar 4 only matters for the *raw* Supabase object URLs.

**To actually implement it in the future, pick one:**

1. **Upgrade Supabase to Pro** — enables the Smart CDN (which will then honour the `max-age=31536000` already on the objects) *and* on-the-fly image transforms. Likely the cleanest path; little/no code needed.
2. **Front Supabase storage with our own CDN** (e.g., a Cloudflare cache rule) that overrides `cache-control` for the `product-images` bucket.
3. **Generate proper sized variants on upload** in the backend (we already have `sharp` installed) and store their URLs, so we serve small images even outside `next/image`.

**Bonus follow-up:** a few non-product images still use plain `<img>` and hit the `no-cache` origin every time — cart, checkout, and the account avatar. Migrating those to `next/image` would speed them up the same way, if their load time ever becomes noticeable.

### Something Not Working? / Things to Know

- **Local `next dev` shows `cache-control: max-age=0` on `/_next/image`** — that's a development-only artifact. In production / on Vercel, the `minimumCacheTTL` (1 year) is applied. Don't be alarmed by it locally.
- **`next build` currently fails on pre-existing type errors** in `lib/validation/zod-resolver.test.ts` (our `tsconfig` includes test files in the build type-check). This is **unrelated** to the image work — that file wasn't touched — but it's worth fixing separately so production builds are green.
- **AVIF support** is universal on modern browsers; `next/image` automatically falls back to WebP (and then the original) for anything older, via `Accept`-header negotiation.

### Want to Test It?

```bash
# Terminal 1 — backend
cd apps/backend && npm run start:dev
# Terminal 2 — frontend
cd apps/frontend && npm run dev
```

1. Open `/products`, open DevTools → Network → Img. Images should load via `/_next/image?...`, come back as `image/avif`, and be a few KB each — **not** dozens of background multi-MB requests on load.
2. Scroll quickly to the bottom — images should appear in ~1s, not 40s.
3. Hover (or tap) a colour swatch, then click it — the image should swap instantly.
4. On the product page, check the thumbnail strip — those should now be ~1KB images, not the full-size photo.

---

## PDP Image Switching — Reliability & Smoothness Fixes (June 2026)

### What Got Done

**Fixed the product page gallery's image switching.** This is the follow-up to the earlier "partially fixed image switching" work — the gallery had a crossfade mechanism in place, but three bugs were left in it. The headline one: the main image often **wouldn't change on the first click**, and would only start working after you left the page and came back. We tracked all three to their root causes and reworked the gallery's swap logic so switching is reliable and smooth — both between images of the same colour and when changing colour.

### The Three Bugs (in plain terms)

1. **The image didn't change on the first click.** The gallery revealed each new image only when the browser fired the image's `load` event. But that event **doesn't fire for an image that's already in the browser's cache** — it can fire before our code is even listening. And because the gallery *pre-loads the neighbouring images* (so the next click feels instant), the image you click to is usually already cached. Result: the `load` event never came, so the new image stayed invisible and the gallery looked stuck. Leaving and returning reshuffled what was cached, so a later click happened to work — which is exactly the flaky "works the second time" behaviour that was reported.

2. **Switching felt janky / did extra work.** The list of images was being rebuilt from scratch on every single re-render. That made the swap and pre-load logic re-run constantly — including in the middle of a fade, where it could reset a transition that was already in progress and stall it.

3. **Changing colour did a visible double-jump.** Picking a new colour first cut the gallery to the *first* image of that colour, and then a separate piece of logic jumped to the *variant's* image — so you saw a hard cut immediately followed by a stray fade to a different picture.

### What Changed

1. **Readiness is now detected on the real image, not a cache-unreliable event.** When a new image is shown, we check the actual `<Image>` element directly — "is it already painted?" (`img.complete && img.naturalWidth > 0`) — *and* still listen for the `load` event for images that genuinely have to download. Either path reveals the image, so a cached image can never leave the gallery stuck again.
2. **The image list is memoised.** It's only recomputed when the images or the selected colour actually change, so the swap/pre-load logic stops firing on unrelated re-renders and in-flight fades aren't interrupted.
3. **One clean path for colour changes.** Selecting a colour now hard-cuts straight to that colour variant's main image (falling back to the first image tagged for the colour) — no more cut-then-fade double jump. The swap effect is keyed on the image index alone so it can't fire mid-colour-switch with a stale index and crossfade to the wrong picture.

**Net behaviour now:** a cached image swaps instantly (hard cut); an image that genuinely has to load fades in over ~0.35s so you never see an empty frame; and changing colour lands on that colour's main image in a single clean cut.

### Files Modified

| File | What Changed |
|---|---|
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | Reworked the `PDPGallery` swap logic: ref-based readiness detection (replaces the cache-unreliable `onLoad`-only gate), memoised the image list, and unified colour-change handling to land on the variant's main image without a double-jump. Memoised the `images` list passed into the gallery. |

### Something Not Working? / Things to Know

- **Test it on a cold load.** Hard-refresh a product with several images, then immediately click the next/prev arrows, the thumbnails, and the mobile dots — the main image should change on the *first* tap every time. This is the regression that was fixed.
- **Throttle the network to see the fade.** In DevTools (Network → Slow 3G), switching images should hold the old photo and crossfade the new one in — no grey/empty frame, no stall.
- **Changing colour** should jump straight to that colour's main shot in one cut, with the counter and thumbnail strip updating to the new set.
- The pre-existing `next build` type errors in `lib/validation/zod-resolver.test.ts` still stand (unrelated to this work, noted in the previous entry). The gallery change itself is type-clean and lint-clean.

---

## Road to HQ — Mobile Responsive Fixes (June 2026)

### What Got Done

**Fixed the homepage (Road to HQ campaign page) on mobile viewports (≤ 639px).** The desktop layout was correct and is untouched. All fixes are base/mobile-first values that the existing `sm:` overrides restore to the original desktop appearance at ≥ 640px.

### Bugs Fixed

**1. Hero date "26.12.2026" overflowing the viewport**

The date was set to `text-8xl` (6rem / 96px) at the base (mobile) size — far too large. Changed to `text-[2.4375rem]` (30% larger than `text-3xl` baseline, fitting 375px screens).

**2. Hero title "Road to HQ" too large on mobile**

`text-5xl` (48px) was clipping in bold uppercase Helvetica on narrow screens. Reduced to `text-[2.25rem]` (36px) at base. Desktop `sm:text-7xl lg:text-[7.5rem]` unchanged.

**3. Counter grid (Sold / Progress / Target) clipping on the right**

The three-column counter had no width cap and its numbers were `text-2xl` (24px) at base. Reduced numbers to `text-xl` (20px), tightened gap from `gap-3` to `gap-2`, shortened the progress bar from `w-24` to `w-16`, and added `max-w-xs` to the grid so it stays centred and inside the viewport on small screens.

**4. CTA buttons ("Shop Now" / "Learn More") not full-width on mobile**

Both buttons had a fixed `w-56` — on mobile they either clipped or didn't centre properly. Changed to `w-full sm:w-56` with reduced horizontal padding (`px-6 sm:px-10`). Added `justify-center` to the flex container so the fixed-width buttons sit centred on desktop.

**5. Mobile hero background image not displaying**

There was only a single desktop hero image (`/homepage/1.jpeg`). Added the portrait mobile image (`hero-apoluo-mobile.png`, copied from the design handoff assets) as `/public/homepage/mobile.png`. The desktop image gets `hidden sm:block` and the new mobile image gets `block sm:hidden` with `object-[50%_25%]` to frame the model's upper body correctly.

**6. Gap between deadline block and hero title**

The deadline kicker (`top-[150px]` absolute) and the centered copy section (`translate-y-8`) left a large visual gap on mobile now that the date is smaller. Removed the `translate-y-8` downward push on mobile (`sm:translate-y-8`) and tightened the h1 top margin to `mt-1 sm:mt-4`.

### Files Modified

| File | What Changed |
|---|---|
| `apps/frontend/app/(shop)/page.tsx` | Mobile sizing for date, title, counter, CTA buttons; mobile/desktop image swap; gap reduction |
| `apps/frontend/public/homepage/mobile.png` | **New** — portrait hero image for mobile (<640px) |

---

## Google OAuth — PKCE Code Verifier Bug Fix (June 2026)

### What Got Done

**Fixed a recurring `pkce_code_verifier_not_found` error on Google OAuth login** — the one that made the first (or occasional) login attempt with Google fail with "The authentication link was invalid or has expired."

### Root Cause

The bug lives in the interaction between `@supabase/auth-js`'s `_removeSession()` and `signInWithOAuth()`.

When a user has stale or expired session cookies in their browser (the `sb-...-auth-token.0/.1` cookies from a previous login), opening the login page causes `createBrowserClient` to start its `initialize()` flow. During initialization, `_recoverAndRefresh()` detects the expired session, can't refresh the token, and calls `_removeSession()`. `_removeSession()` (line 2080 of `GoTrueClient.js`) explicitly deletes **`storageKey-code-verifier`** as part of its cleanup:

```js
await removeItemAsync(this.storage, this.storageKey + '-code-verifier');
```

The problem: **`signInWithOAuth()` does not await `initializePromise`** — it fires immediately without waiting for initialization to finish. So the race is:

1. `createClient()` starts initialization (reads session → detects expiry → calls `_removeSession()`)
2. User clicks "Continue with Google" → `signInWithOAuth()` stores the PKCE code verifier in a cookie
3. `_removeSession()` completes and **deletes the code verifier**
4. Browser navigates to Google → comes back to `/api/auth/callback?code=...`
5. The callback route can't find the code verifier → `pkce_code_verifier_not_found`

### Fix

Added `await supabase.auth.getSession()` before `signInWithOAuth()` in `GoogleAuthButton.tsx`. `getSession` does `await this.initializePromise` internally, so by the time it returns, any `_removeSession()` has already completed. The code verifier is then stored cleanly and stays in the cookie through the OAuth redirect.

```ts
// Ensure initialization (and any _removeSession cleanup) finishes before
// storing the PKCE code verifier — signInWithOAuth doesn't await initializePromise.
await supabase.auth.getSession();
const { error } = await supabase.auth.signInWithOAuth({ ... });
```

### Files Modified

| File | What Changed |
|---|---|
| `apps/frontend/app/(auth)/components/GoogleAuthButton.tsx` | Added `await supabase.auth.getSession()` before `signInWithOAuth` |

---

## Shopify-Grade Analytics Revamp (June 2026)

### What Got Done

**Rebuilt the admin analytics from the ground up, modeled on Shopify's admin.** This is the biggest single update to the admin so far. In plain terms, we now have:

1. **Visitor tracking on the storefront** — we finally know how many people visit the shop, what device they're on, where they came from, which page they landed on, and whether they added to cart, reached checkout, and bought. This powers real **conversion rate** metrics, just like Shopify's "Sessions → Added to cart → Reached checkout → Completed" funnel.
2. **Abandoned checkouts** — when someone reaches checkout, types their email/name/phone, and leaves without paying, we now capture their cart and contact details. There's a new admin page listing every abandoned checkout with the customer's details and exactly which items they left behind — so we can follow up and recover the sale. If they later come back and buy, the checkout is automatically marked **Recovered**.
3. **A Reports section** — like Shopify's Reports tab: ~20 reports organised by category (Sales, Orders, Customers, Behavior, Inventory, Finances). Each report opens with a big chart, a comparison against the previous period (dashed grey line), summary numbers with % change, a day-by-day data table with totals, and a CSV export button.
4. **A richer dashboard and analytics page** — sparklines on the KPI cards, a Shopify-style "Total sales breakdown" (gross sales → discounts → returns → net sales → shipping → taxes → total sales) with per-line deltas, sales-by-channel donut (online vs pop-up), conversion funnel, sell-through rates, and returning-customer rate.
5. **A premium monochrome look** — all the bright blues/purples/ambers are gone. Charts and accents now use shades of black and grey (ink for the current period, light grey dashed for the previous period, a restrained rose only for negative deltas). All charts were rebuilt on **Recharts** with proper tooltips and previous-period overlays.

### ⚠️ One Number Will Change — On Purpose

**Dashboard revenue may read slightly lower than before.** The old analytics counted *any* order that wasn't cancelled/refunded as revenue — including **pending orders that were never paid for**. It also compared "vs previous period" against a different population (previous-period order counts included cancelled orders; revenue didn't). Everything now uses one consistent rule: online revenue = `paid / processing / shipped / delivered`; pop-up revenue = `confirmed / completed`. The new numbers are the correct ones.

### How the Tracking Works (plain terms)

- The storefront quietly sends events (page view, product view, add to cart, checkout started, purchase) to our own backend — **no Google Analytics, no third parties, no cookies banner needed** (first-party, anonymous IDs only).
- A "session" is a visit: it gets a random ID that expires after 30 minutes of inactivity. A "visitor" is the browser (persistent random ID), so we can tell new vs returning visitors apart.
- Purchases are deduplicated, so refreshing the confirmation page doesn't double-count.
- On the checkout page, the cart and contact fields are snapshotted (debounced, every ~2s as you type) to a `checkout_sessions` table. Completing the order closes the snapshot; leaving it idle for **1 hour** makes it an "abandoned checkout".
- Everything fails silently — if the analytics backend is down, shopping is completely unaffected.
- **Important:** session metrics are forward-only. There's no historical session data — conversion rate, sessions, and abandonment all start counting from the day this deploys. The UI says "Tracking since {date}" so nobody mistakes empty history for zero traffic.

### What's Where in the Admin

| Page | What's New |
|---|---|
| **Dashboard** (`/`) | Kept everything (brand/time filters, all-time chart, revenue target, brand split, orders by status) and added: 5 KPI cards with sparklines (now incl. **Conversion Rate** and **Returning Customers**), Total sales breakdown card, Sales-by-channel donut, Conversion funnel card. All-time chart now has a drag-to-zoom brush. |
| **Analytics → Storefront** | Fully rebuilt: 6-KPI strip with sparklines, Total sales over time with previous-period overlay, sales breakdown + AOV-over-time side by side, Conversion funnel + Fulfillment funnel, abandoned-checkouts callout, Sales by product (with images), Products by sell-through rate, Sessions by device / referrer / landing page. |
| **Analytics → Pop-ups** | All existing metrics kept; restyled monochrome. Revenue-per-visitor and conversion now actually work once you set a visitor count on an event (see below). |
| **Analytics → Compare** | New channel overview: online vs pop-up donut + two-line channel sales chart, on top of the existing side-by-side comparisons. |
| **Reports** (`/analytics/reports`, also in sidebar) | Searchable index with category chips → each report opens at `/analytics/reports/{id}` with range (7D/30D/90D/1Y) + granularity (daily/weekly/monthly) controls, metric switcher, comparison chart, totals + "% change vs previous period" table, CSV export. |
| **Abandoned Checkouts** (`/orders/abandoned`, also in sidebar) | List with date, customer, item thumbnails, subtotal, status badge (Abandoned / Recovered); search by email/name/phone; click into a checkout for full cart lines, contact card (links to the customer profile if matched), and recovery status. |
| **Pop-up Sales → Edit Event** | New **"Estimated Visitors"** field. Enter the foot traffic for an event and the pop-up analytics will show conversion rate and revenue-per-visitor. |

### The Reports (full list)

- **Sales:** Total sales over time · Sales by product · Sales by channel · Average order value over time · Sales by brand · Units per order
- **Orders:** Orders over time · Orders fulfilled over time · Discounts over time
- **Customers:** New vs returning customers · Returning customer rate over time · Customer cohort retention *(Iris-era orders only — migrated Shopify history has no per-order dates)*
- **Behavior:** Sessions over time · **Conversion rate over time** (the flagship — Sessions / Added to cart / Reached checkout / Completed / Conversion rate) · Checkout abandonment over time · Sessions by device / referrer / landing page
- **Inventory:** Products by sell-through rate · Inventory levels
- **Finances:** Finances summary (monthly P&L-style) · Sales by payment method

### Backend Changes

- **New public endpoints** (rate-limited with `@nestjs/throttler`, validated with class-validator): `POST /analytics/track` (event batches from the beacon) and `POST /analytics/checkout` (checkout snapshots).
- **New admin endpoints** (all require `analytics:read`): `GET /analytics/sessions`, `GET /analytics/sales-breakdown`, `GET /analytics/returning-customer-rate`, `GET /analytics/abandoned-checkouts(/:id)`, and the unified reports engine `GET /analytics/report` (list) + `GET /analytics/report/:reportId`. *(Note: singular `report` — the old static `reports/...` routes would have shadowed report ids like `payment-methods`.)*
- **Returning customer rate** matches customers across channels (online `user_id`/email, pop-up email/phone) and counts migrated Shopify history (`shopify_total_orders > 0`) as "returning".
- **Status-whitelist fix** in `orders.service.ts getAnalytics()` (the revenue change explained above).
- Reports engine reads share cached loaders per request and paginate past Supabase's 1,000-row response cap (`fetchAll` in `report-context.ts`) — important once `analytics_events` grows.

### Database Migrations (already applied to the remote DB)

| Migration | What It Does |
|---|---|
| `20260612000000_create_analytics_events.sql` | `analytics_events` table — one row per tracked event. RLS on, no public policies (backend service-role only). |
| `20260612000001_add_popup_event_visitor_count.sql` | Adds `visitor_count` to `popup_events` — the column the pop-up analytics code always read defensively but never existed. |
| `20260612000002_create_checkout_sessions.sql` | `checkout_sessions` table — live checkout snapshots; one open checkout per browsing session (partial unique index). |

### Files Created/Modified (highlights)

**Backend (`apps/backend`):**
- `src/analytics/analytics.constants.ts` — **new**, the revenue status whitelist + date-bucketing helpers (single source of truth)
- `src/analytics/reports/` — **new**: `report-types.ts`, `report-context.ts` (shared cached loaders), `report-registry.ts` (~20 report builders)
- `src/analytics/dto/track-events.dto.ts`, `dto/checkout-snapshot.dto.ts` — **new** validated ingest DTOs
- `src/analytics/analytics.controller.ts` / `analytics.service.ts` — all the new endpoints
- `src/orders/orders.service.ts` — status-whitelist fix
- `src/app.module.ts` — registered `ThrottlerModule`
- `src/popup-sales/dto/update-event.dto.ts` — accepts `visitor_count`

**Storefront (`apps/frontend`):**
- `lib/analytics/tracker.ts` — **new**, the beacon (session/visitor IDs, event queue, `fetch keepalive`, checkout snapshots)
- `components/AnalyticsBeacon.tsx` — **new**, fires page/product views on route change; mounted in `app/(shop)/layout.tsx`
- `lib/cart/cart-context.tsx` — `add_to_cart` event in `addItem`
- `app/(shop)/checkout/CheckoutClient.tsx` — `checkout_started` event + debounced checkout snapshots + completion snapshot after order creation
- `app/(shop)/checkout/confirmation/page.tsx` — deduplicated `purchase` event

**Admin (`apps/admin`):**
- `lib/charts/theme.ts` — **new**, the monochrome design tokens + number/date formatters (use these for any new charts)
- `app/components/charts/` — **new** shared chart kit: `ChartCard`, `Sparkline`, `ComparisonLineChart` (+ `DualLineChart`), `DonutChart`, `HBarChart`, `MetricDataTable`
- `app/components/DeltaBadge.tsx` — **new**, replaces the three duplicated delta implementations
- `lib/api/analytics.ts` — **new**, all the hooks (`useSessionsAnalytics`, `useSalesBreakdown`, `useReturningCustomerRate`, `useAbandonedCheckouts`, `useReportsList`, `useReport`, `useDateRange`)
- `app/(dashboard)/page.tsx` — dashboard revamp
- `app/(dashboard)/analytics/` — `page.tsx` (Reports link), `components/StorefrontView.tsx` (rewrite), `BothView.tsx` (channel overview), `PopupsView.tsx` + `OrderFunnel.tsx` (monochrome), **new** `reports/page.tsx` + `reports/[reportId]/page.tsx`
- `app/(dashboard)/orders/abandoned/` — **new** list + detail pages
- `app/components/Sidebar.tsx` — added **Abandoned Checkouts** and **Reports** entries
- `app/(dashboard)/popup-sales/page.tsx` + `lib/api/popup-sales.ts` — visitor-count field
- New dependency: `recharts` (admin); `@nestjs/throttler` (backend)

### Want to Test It?

```bash
# Terminal 1 — backend
cd apps/backend && npm run start:dev
# Terminal 2 — storefront
cd apps/frontend && npm run dev
# Terminal 3 — admin
cd apps/admin && npm run dev
```

1. **Tracking:** browse the storefront (home → a product → add to cart → checkout). In Supabase, `analytics_events` should show one session with `page_view`, `product_view`, `add_to_cart`, `checkout_started` rows. Buy something and a `purchase` row appears; refresh the confirmation page — no duplicate.
2. **Abandoned checkout:** at checkout, type a name/email, then close the tab. A row appears in `checkout_sessions`; after 1 hour idle it shows under **Orders → Abandoned Checkouts** with your cart and contact details. (Impatient? Temporarily set `updated_at` back an hour in SQL.) Buy with the same email afterwards and the status flips to **Recovered**.
3. **Reports:** open **Reports** in the admin sidebar → "Conversion rate over time" → switch ranges/granularity, hover the chart (both periods in the tooltip), check the table's "vs previous period" row, click CSV.
4. **Pop-up conversion:** Pop-up Sales → edit an event → set Estimated Visitors → the Pop-ups analytics tab now shows revenue-per-visitor.

### Something Not Working? / Things to Know

- **Conversion/sessions cards show "—" or zeros at first** — expected. Tracking is forward-only; there is no historical session data. The cards/funnels say "Tracking since {date}" once the first event lands.
- **Revenue looks slightly lower than before** — intentional; pending unpaid orders no longer count (see the ⚠️ section above).
- **Cohort report covers Iris-era orders only** — migrated Shopify customers have lifetime totals but no per-order dates, so they can't be placed in monthly cohorts. The report says so in its description.
- **The ingest endpoints are public by design** (the storefront isn't authenticated) but are rate-limited (60 events/min, 30 snapshots/min per IP), schema-validated, and string-capped. Junk from a determined abuser is possible but low-stakes — it can only pollute analytics, never touch orders.
- All three apps typecheck and build clean; the backend was smoke-tested (invalid events → 400, unauthenticated analytics reads → 401, valid track → 204).

---

## Guest Order Tracking (June 2026)

### What was the problem?

We had a gap: guest customers who completed an order could see their confirmation page right after checkout, but that was it. Once they navigated away (or opened the link on a different device), they had no way to check their order status unless they created an account. The old "Track Order" link in the footer pointed to `/orders`, which requires a login — useless for a guest.

### What we built

A public, no-login-required order tracking system. Customers enter their order number + the email they used at checkout, and they get a full status view: payment status, a step-by-step progress tracker (Order Placed → Payment Confirmed → Processing → Shipped → Delivered), carrier/tracking number if available, the item list, and their shipping address.

The flow is deliberately simple: the confirmation email and SMS both include a direct link like `storefront.1nri.store/track?order=IRD-XXXXXX`. Clicking it lands you on the `/track` page with the order number pre-filled — you just type your email and go.

**Why email + order number, not the `guest_token`?**
The guest token only lives in `sessionStorage` for the duration of the browser session. It's gone the moment the tab closes. Email + order number can be typed on any device, shared with someone else who needs to check, and bookmarked — it works like every other major e-commerce tracker.

### Backend

A new public endpoint was added to the orders controller:

```
GET /orders/track?orderNumber=IRD-XXXXXX&email=customer@email.com
```

No JWT required (`@Public()` decorator). The service method does a case-insensitive email match (`.ilike()`) against the order number. It only returns safe fields — no `guest_token`, no `payment_reference`, no internal notes. If nothing matches, it returns a generic 404 with no information about whether the order number or the email was wrong (avoids enumeration).

`ConfigService` was injected into `OrdersService` to read `FRONTEND_URL` from the environment — this is what gets inserted into the tracking URLs in emails and SMS.

### Email templates

Both order-facing email templates now have a "Track your order" button:

- **Order confirmation** — added below the order summary table, before the footer
- **Shipping notification** — added as the primary CTA above the tracking number section

The button is plain black on white (`background:#111; color:#fff`) with rounded corners, consistent with the rest of the email styling.

### SMS templates

The `SMS_TEMPLATES.orderConfirmation` function now accepts an optional `trackUrl` parameter. When passed (as it is from `confirmPayment`), the message becomes:

> Order #IRD-XXXXXX confirmed! Track your order: https://storefront.1nri.store/track?order=IRD-XXXXXX We'll update you on shipping soon.

Callers that don't pass a URL still get the original message — backwards compatible.

Preorder SMS was intentionally left unchanged. Preorders require an account to place, so those customers can always check `/account`.

### Storefront

The footer "Track Order" link (in the Help section) was updated from `/orders` → `/track`. The new page:

- Reads `?order=` from the URL on load and pre-fills the order number field
- Submits via a clean form (no polling — it's a one-shot lookup)
- Shows a step-by-step progress bar that highlights the current step based on order status
- Shows carrier + tracking number when available, shipping address, and itemised order list with prices
- Wrapped in `<Suspense>` as required for `useSearchParams()` in Next.js App Router

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/app/(shop)/track/page.tsx` | **New file** — public order tracking page |
| `apps/frontend/lib/api/orders.ts` | Added `TrackingOrder` interface + `trackOrderByEmail()` function |
| `apps/frontend/app/(shop)/layout.tsx` | Footer "Track Order" link: `/orders` → `/track` |
| `apps/backend/src/orders/orders.controller.ts` | New `@Public() GET /orders/track` endpoint |
| `apps/backend/src/orders/orders.service.ts` | `trackOrderByEmail()` method + `ConfigService` injection + tracking URL passed to SMS |
| `apps/backend/src/sms/sms.service.ts` | `orderConfirmation` template accepts optional `trackUrl` |
| `apps/backend/src/email/email.service.ts` | "Track your order" button added to order confirmation + shipping emails |

### How to test

1. Complete a guest checkout — note the order number from the confirmation page
2. Open the confirmation email — there should be a "Track your order" button linking to `/track?order=IRD-XXXXXX`
3. Click it, enter your email, and confirm the status view loads correctly
4. Test the footer link: scroll to the bottom of any storefront page → Help → "Track Order" — should land on `/track` (not `/orders`)
5. Try a wrong email or a made-up order number — should show "Order not found", nothing more specific
6. On the backend, `GET /orders/track?orderNumber=IRD-XXXXXX&email=test@test.com` with no Authorization header should return 200 (or 404 if not found) — not 401

---

## Allies App — Session Tracking & Inactivity Timeout (June 2026)

### What was the problem?

The allies app recorded logins (a row in `ally_logins` on every sign-in) but had no concept of logout. That meant the admin's activity drawer showed a list of login timestamps with no information about how long each session lasted, whether the ally was still active, or why they left. It also meant a forgotten open browser tab stayed signed in indefinitely — not great for a sales app used in-field.

### What we built

**Full session lifecycle tracking** — every login creates a row, every logout closes it (with a reason). Combined with a 60-minute inactivity auto-logout on the dashboard, we now have clean session records: when they signed in, when they left, and why.

### Inactivity timeout

`DashboardShell` now runs a 60-minute idle timer. It listens to `mousemove`, `keydown`, `click`, `scroll`, and `touchstart` events and resets on any interaction. If 60 minutes pass with nothing, the ally is signed out automatically and redirected to `/login?reason=inactivity`. On the login page, that query param shows a toast: *"You were signed out after 60 minutes of inactivity."*

The timer is set up with a `useCallback`-wrapped `handleLogout` (to avoid stale closures) and cleaned up properly on unmount.

### Login ID in sessionStorage

When an ally signs in, `recordAllyLogin` now returns the `id` of the newly created `ally_logins` row (not just `{ allowed: true }`). That ID is stashed in `sessionStorage` under `ally_login_id`. On logout — whether manual, inactivity, or admin force-logout — it's read back, used to close the record, then cleared.

### Logout reasons

Four reasons are tracked (enforced by a DB check constraint):

| Reason | When |
|---|---|
| `manual` | Ally clicks "Sign out" |
| `inactivity` | 60-minute idle timeout |
| `force_logout` | Admin forces logout from the Markets page |
| `session_expired` | Reserved for future use |

When the admin force-logout action runs, it now also closes any open `ally_logins` rows for that ally (previously it only revoked the Supabase token via `force_logout_user` RPC but left the login record open).

### Database migration

New columns were added to `ally_logins`:

```sql
logged_out_at  timestamptz   -- null means session is still active
logout_reason  text check (logout_reason in ('manual', 'inactivity', 'force_logout', 'session_expired'))
```

Three indexes: by `ally_id`, by `logged_in_at` (desc), and a partial index on open sessions only (`where logged_out_at is null`) for fast "is this ally currently active?" checks.

The migration lives in both `apps/allies/supabase-migrations.sql` (the canonical file) and `supabase/migrations/20260617000000_ally_logins_logout_tracking.sql` (the versioned migration applied to the project Supabase instance).

### Admin — Activity Drawer upgrades

The login history section in the ally activity drawer now shows much richer info per session:

- **Status dot** — green for an open/active session, grey for closed
- **Session badge** — "Active", "Signed out", "Idle timeout", "Force logout", or "Expired" — colour-coded (green / slate / amber / red / orange)
- **Session duration** — how long the session lasted (e.g. "2h 15m", "45m"); hidden if the session is still open

This required fetching `logged_out_at` and `logout_reason` alongside `logged_in_at` in `fetchAllyActivity`, and updating the `AllyActivityData` type to include the new fields.

### Files changed

| File | What changed |
|---|---|
| `apps/allies/app/(auth)/login/actions.ts` | `recordAllyLogin` now returns `loginId`; new `recordAllyLogout` function |
| `apps/allies/app/(auth)/login/page.tsx` | Stores `loginId` in sessionStorage after login; shows inactivity toast |
| `apps/allies/app/(dashboard)/DashboardShell.tsx` | 60-minute inactivity timer; `handleLogout` with reason + sessionStorage cleanup |
| `apps/allies/supabase-migrations.sql` | `logged_out_at` + `logout_reason` columns + indexes on `ally_logins` |
| `supabase/migrations/20260617000000_ally_logins_logout_tracking.sql` | Versioned migration for the same schema change |
| `apps/admin/app/(dashboard)/markets/actions.ts` | Force-logout closes open login rows; `fetchAllyActivity` fetches logout fields; `AllyActivityData` type updated |
| `apps/admin/app/(dashboard)/markets/components/AllyActivityDrawer.tsx` | Session badges, duration display, status dot per login row |

### How to test

1. Sign into the allies app — check Supabase: a new `ally_logins` row should appear with `logged_out_at = null`
2. Click "Sign out" — the row should get `logged_out_at` stamped and `logout_reason = 'manual'`
3. Sign in again, leave the tab idle for 60 minutes (or temporarily set `TIMEOUT_MS` to something short like `10000`) — should auto-sign out and show the inactivity toast on the login page
4. In the admin Markets page, open an ally's activity drawer → force-logout → their open `ally_logins` row should close with `logout_reason = 'force_logout'`
5. The activity drawer's login history should show status badges and session durations for closed sessions

---

## Order Status Auto-Advance: Paid → Processing (June 2026)

### What was the problem?

When a customer completed payment, their order sat at `paid` status indefinitely until someone on the team manually moved it. The `/track` page showed "Payment Confirmed" and just stayed there. There was no signal to the fulfilment side that the order was ready to work on, and the status history gave no indication of when picking/packing should start.

### What changed

In `confirmPayment()`, immediately after flipping the order to `paid`, the order is now advanced to `processing` in the same request. Both transitions are written to `order_status_history` so the audit trail is complete:

| From | To | Notes |
|---|---|---|
| `pending` | `paid` | Payment confirmed |
| `paid` | `processing` | Auto-advanced after payment confirmation |

The customer's tracking page now shows "Processing" as the active step as soon as payment goes through, rather than stalling at "Payment Confirmed".

### Files changed

| File | What changed |
|---|---|
| `apps/backend/src/orders/orders.service.ts` | `confirmPayment()` inserts both history rows then updates status to `processing` |

### How to test

Complete a checkout and confirm payment. In Supabase, the order's `status` column should read `processing` (not `paid`). The `order_status_history` table should have two new rows for that order: `pending → paid` and `paid → processing`. On the `/track` page, the "Processing" step should be highlighted.

---

## Newsletter Subscription — Road to HQ & About Pages (June 2026)

### What was added

A newsletter subscription section now appears just before the footer on two pages:

- **Road to HQ** (`/`) — sits after the "One unit at a time." closing CTA
- **About** (`/about`) — sits after the "Find us" social links section

The backend already had a `POST /newsletter/subscribe` endpoint and a `newsletter_subscribers` table from earlier work, but the service just did a blind upsert and always returned `{ ok: true }`. It now checks first and returns `{ ok, alreadySubscribed }` so the UI can show the right message.

### How the form works

Three states:
1. **Idle** — email input + "Subscribe" button
2. **Loading** — button shows "..." and is disabled
3. **Done** — form is replaced by a single line:
   - New subscriber → *"You're in. Expect drops, studio updates, and early access."*
   - Already on the list → *"You're already on the list."*

Errors (network failures, etc.) show briefly below the input then clear after 3 seconds.

### Bug fixed during implementation

The initial `subscribeToNewsletter()` call was passing `body: JSON.stringify({ email })` to `apiClient`. The `apiClient` wrapper already calls `JSON.stringify(body)` internally, so the body was being double-stringified — the server received a JSON-encoded string instead of an object, which caused `@IsEmail()` DTO validation to reject it with a 400. Fixed by passing the raw object: `body: { email }`.

### Files changed

| File | What changed |
|---|---|
| `apps/backend/src/newsletter/newsletter.service.ts` | `subscribe()` now checks before inserting, returns `{ ok, alreadySubscribed }` |
| `apps/frontend/lib/api/newsletter.ts` | **New file** — `subscribeToNewsletter(email)` wrapper |
| `apps/frontend/components/shop/NewsletterSection.tsx` | **New file** — shared newsletter form component |
| `apps/frontend/app/(shop)/page.tsx` | Imports and renders `<NewsletterSection />` before closing tag |
| `apps/frontend/app/(shop)/about/page.tsx` | Imports and renders `<NewsletterSection />` before closing tag |

### How to test

1. Go to `/` or `/about` — the "Stay on the road." newsletter section should appear just above the footer
2. Enter a fresh email → confirmation line appears; check `newsletter_subscribers` in Supabase for a new row
3. Submit the same email again → "You're already on the list." (no duplicate row in the table)
4. Submit with the backend offline → error message appears briefly, form resets to idle

---

## Abandoned Checkout Recovery (June 2026)

### What this is

When a shopper adds items, reaches checkout, types in their details, and then leaves without paying, that's an "abandoned checkout." We already *captured* these (they showed up in the admin under Orders → Abandoned), but we never did anything with them. This work adds the **recovery loop**: we now automatically email the customer a reminder with a link that rebuilds their cart, and we track how many of those reminders actually bring people back to buy.

It's modelled on how Shopify does it.

### How it behaves

- **A checkout counts as "abandoned" after 10 minutes** of inactivity (Shopify's standard). That's the threshold the admin Abandoned page uses.
- **One reminder email goes out once the cart has been idle for an hour.** We deliberately wait the full hour rather than emailing at 10 minutes — it avoids pestering someone who's just slow to finish paying. Each cart is only ever emailed once.
- **The email has a "Complete your order" button.** Clicking it opens a recovery link that rebuilds their cart exactly as they left it and drops them back on the checkout page. If anything in the cart sold out in the meantime, it's quietly removed and the shopper is told.
- **No discount** is included — it's a plain reminder.
- **Recovery rate is tracked.** The admin Abandoned page now shows three numbers at the top: how many reminders went out, how many of those carts were recovered, and the recovery rate as a percentage. Each row also shows whether a reminder was sent.

It works for guests too, not just signed-in users — the only requirement is that the shopper typed their email before leaving (otherwise there's no address to send to).

### How it works under the hood

- A background job (`@nestjs/schedule` cron) runs every 5 minutes. Each run does two things: (1) marks any reminded carts that have since been bought as "recovered," and (2) sends reminder emails for carts that just crossed the one-hour idle mark.
- The reminder email is a new 1NRI-styled template sent through Resend, and it's logged to `communication_logs` like all our other emails.
- The recovery link uses a secure random token (not the cart's database id), looked up through a public endpoint that re-checks current stock and pricing before handing the cart back to the storefront.

### Important bug found & fixed along the way

While testing, abandoned checkouts weren't registering **at all** — no rows, no errors. Root cause: the `checkout_sessions` and `analytics_events` tables (from the earlier analytics work) had **Row Level Security turned on but were never granted access to the backend's service role.** The service role skips RLS rules, but Postgres still needs an explicit table `GRANT` — without it, every write was rejected with "permission denied," and the code was throwing that error away silently.

This means our **storefront analytics tracking (page views, add-to-cart, etc.) had also been silently failing** for the same reason, since it writes to `analytics_events`.

The fix is a migration that grants the service role access to both tables. We also made the checkout-save and cron code **log database errors** instead of swallowing them, so a problem like this surfaces in the backend logs next time instead of hiding.

> **Action required:** this needs a migration applied to the database — run `npx supabase db push` from the repo root. Until that's run, nothing will register.

### Files changed

| File | What changed |
|---|---|
| `supabase/migrations/20260626000000_abandoned_checkout_recovery.sql` | **New** — adds `reminder_sent_at`, `recovery_token`, `recovered_at` to `checkout_sessions` (+ indexes) |
| `supabase/migrations/20260628000000_grant_service_role_analytics_tables.sql` | **New** — grants the service role access to `checkout_sessions` and `analytics_events` (the bug fix) |
| `apps/backend/src/email/email.service.ts` | New `sendAbandonedCheckoutReminder()` + the 1NRI-styled email template |
| `apps/backend/src/analytics/abandoned-checkout.cron.ts` | **New** — the every-5-minutes scheduled job |
| `apps/backend/src/analytics/analytics.service.ts` | 10-min threshold, reconcile + send-reminder logic, recovery-by-token lookup, recovery-rate summary, plus error logging on the previously-silent writes |
| `apps/backend/src/analytics/analytics.controller.ts` | New public `GET /analytics/checkout/recover/:token` endpoint |
| `apps/backend/src/analytics/analytics.module.ts` | Registers the cron provider |
| `apps/backend/src/app.module.ts` | Enables the scheduler (`ScheduleModule.forRoot()`) |
| `apps/frontend/app/(shop)/checkout/recover/page.tsx` | **New** — the recovery landing page that rebuilds the cart |
| `apps/frontend/lib/cart/cart-context.tsx` | New `restoreItems()` to replace the whole cart from a recovery link |
| `apps/admin/app/(dashboard)/orders/abandoned/page.tsx` | Recovery-rate stat cards + "reminder sent" indicator |
| `apps/admin/lib/api/analytics.ts` | New response fields for recovery data |

### How to test

The real timers are slow (10 min / 1 hour), so the trick is to **backdate a checkout in the database** and let the 5-minute cron pick it up.

1. **Capture** — add items, go to `/checkout`, type an email. A row should appear in `checkout_sessions` with `status='open'` and a `recovery_token`. (If nothing appears, the grant migration above hasn't been applied.)
2. **Reminder** — in Supabase, set that row's `updated_at` to 90 minutes ago and `reminder_sent_at` to null. Within ~5 minutes the cron sends the email; check your inbox and the `communication_logs` table, and confirm `reminder_sent_at` is now filled in.
3. **Recovery link** — click "Complete your order" in the email → your cart is rebuilt and you land on `/checkout`.
4. **Recovery rate** — complete the order with that same email. On the next cron run the row flips to `recovered`, and the stat cards on the admin Abandoned page update.

---

## Markets / Allies Redesign — Stock Allocation (June 2026)

### What this is

Allies (our campus/city resellers) can now be **given stock to sell**, and we track it centrally. Before, the admin could see an ally's sales and commission but there was no concept of "this ally is holding 5 of this hoodie." Now there is: you allocate stock to an ally, it moves out of central inventory into their hands, and as they sell, their on-hand count goes down automatically. The whole thing is built around a **consignment model** — total stock = central inventory + everything sitting with allies.

It also replaces the old slide-out "activity" panel with a proper, full **ally page**.

### The new ally page

In the admin, **Markets → click any ally** (the whole row is clickable now) opens a dedicated page with everything in one place:

- Header with status/brand, **Force logout**, and Edit.
- Stats: total sales, orders, earnings, last login, and **units on hand**.
- **Stock allocations** table — what they're holding per product/variant (allocated / sold / returned / on-hand), with a **Return** action per row and an **Allocate stock** button.
- **Sales history** — paginated (7 per page).
- Their details (email, phone, location, commission rate/quota).
- **Activity** — login history and the 8-week login/sales charts that used to live in the sidebar drawer.

The old "Activity" sidebar drawer is gone; everything moved onto this page.

### Allocating stock

Click **Allocate stock**, search for a product/variant, enter a quantity (capped at what's available centrally), and confirm. Behind the scenes this:
- deducts the units from central `product_variants.inventory_quantity` (so the online store won't sell stock that's physically with an ally),
- logs an `inventory_movements` row of type `transfer`,
- and records the holding in the new `ally_stock_allocations` table.

**Return** does the reverse — moves units back into central stock.

### Auto-decrement when an ally sells

When an ally completes a sale, the sold variants are automatically deducted from their on-hand. This works via database triggers so it's reliable across every sale path (cash, MoMo, bank transfer). To make it possible we added a `variant_id` to ally sale line items (they previously only stored the product, not the exact variant). Selling stock that was never allocated is allowed — it just isn't tracked against an allocation.

### The allies app now shows real stock

Previously the allies app's **Inventory** page and **New Sale** product picker showed the *central* warehouse stock, which is misleading — an ally doesn't have all of that. Both now show **only what's been allocated to that ally**, using their on-hand figure:
- Inventory page lists only products they're holding, with on-hand as the stock number.
- New Sale only lets them add variants they actually have, shows "X in stock", and **caps quantities at their on-hand** (the `+` button stops at the limit).

### Files changed

| File | What changed |
|---|---|
| `supabase/migrations/20260701000000_ally_stock_allocations.sql` | **New** — `ally_stock_allocations` table (with generated `on_hand`), grants + RLS, a `variant_id` column on `ally_sale_items`, and the auto-decrement triggers |
| `apps/backend/src/allies/` | **New module** — allocate / return / list allocations + paginated sales history endpoints (reuses the inventory adjust logic for the `transfer`) |
| `apps/backend/src/app.module.ts` | Registers the new allies module |
| `apps/admin/app/(dashboard)/markets/[id]/page.tsx` | **New** — the dedicated ally page |
| `apps/admin/app/(dashboard)/markets/page.tsx` | Rows are clickable → open the ally page |
| `apps/admin/app/(dashboard)/markets/components/AllocateStockModal.tsx`, `AllyActivityPanel.tsx` | **New** — allocate modal + the activity section (extracted from the old drawer, which was deleted) |
| `apps/admin/lib/api/allies.ts` | **New** — React Query hooks for allocations and sales history |
| `apps/allies/app/(dashboard)/inventory/page.tsx`, `sales/page.tsx`, `sales/actions.ts` | Show the ally's allocated on-hand instead of central inventory; cap sale quantities at on-hand |

### Heads-up / action required

> This needs the migration applied — run `npx supabase db push` from the repo root. Until then, no ally will have any allocations, so the allies app will show no stock and the admin allocation tables will be empty.

Also note: only sales made **after** this ships are attributed to allocations (older sale line items don't have the `variant_id`).

### How to test

1. Apply the migration (`npx supabase db push`).
2. In the admin, open an ally → **Allocate stock** → pick a variant, allocate 5. Confirm: their on-hand shows 5, the variant's central inventory dropped by 5, and an `inventory_movements` `transfer` row was logged.
3. Log into the allies app as that ally → the Inventory page shows that product with 5 on hand; on the New Sale page you can add it and the quantity won't go past 5.
4. Complete a sale of 2 → back in the admin, the ally's on-hand for that variant is now 3.
5. Use **Return** on the ally page to send stock back → on-hand drops and central inventory goes back up.

---

## Storefront Navigation Sidebar — Redesign + Theme Toggle (June 2026)

**The storefront's menu is now a proper slide-out sidebar.** Tapping **Shop** (desktop) or the hamburger (mobile) slides a panel in from the left with a dimmed backdrop. It replaces the old plain mobile dropdown, and it's the same panel on phone and desktop now — one consistent menu instead of two different ones.

What's inside the panel:

- **A search box** at the top — type and hit enter to jump straight to results.
- **Shop categories** (Shop All, New Arrivals, Tops, Bottoms, Accessories, Footwear). Categories with sub-types expand in place (an accordion) so you can drill into, say, Tops → T-Shirts without leaving the menu. Every link points at the real product pages with the right filters applied.
- **Explore and Info** shortcuts (Road to HQ, About, Track Your Order, My Account, Saved Items).
- **A footer** that shows your account (your name and avatar if you're signed in, or a "Sign In" prompt if not), your **currency/region** picker, and a brand-new **Light / Dark mode toggle**.

We also gave it a second pass to match the rest of the site's look — the clean black-and-white, sharp-edged, small-caps style used on the account pages — instead of the rounded, oversized first draft. The 1NRI logo sits centred at the top of the panel.

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/app/(shop)/components/NavDrawer.tsx` | **New** — the whole sidebar: slide-in panel + backdrop, search, expandable categories, Explore/Info links, and the footer (account block, currency switcher, light/dark toggle). Reuses the existing currency, profile, and theme systems so nothing is duplicated. |
| `apps/frontend/app/(shop)/layout.tsx` | Wired the sidebar into the header — **Shop** and the mobile hamburger now open it; removed the old inline mobile dropdown. |

### How to test

1. Run the storefront (`npm run dev` in `apps/frontend`) and open the home page.
2. Click **Shop** in the top nav (or the ☰ menu on a narrow window) — the sidebar should slide in with a dark backdrop. Press **Esc** or click the backdrop to close it.
3. Expand **Tops** (or any category with an arrow) — the sub-types drop down. Click one and confirm it lands on the matching filtered product page.
4. In the footer, switch the **currency** and toggle **Light / Dark** — the whole site theme should flip, and both should stick after you reload.
5. Try it signed-out (footer shows "Sign In") and signed-in (footer greets you by name and links to your account).

---

## Footer Polish & Newsletter Card Flip (June 2026)

A small visual cleanup pass on the storefront's footer and newsletter sign-up.

**The footer now matches the rest of the site.** It was using slightly off-brand greys; we swapped everything over to the same clean black-and-white, small-caps styling used on the account pages, so it sits naturally with everything around it. The height and layout are unchanged.

**We also fixed the footer links so they all actually go somewhere real:**
- "My Account" pointed at a page that doesn't exist (`/profile`) — now goes to the real account page.
- The dead "Collections" link was replaced, and the old greyed-out "Lookbook" was tidied up (it's currently hidden/commented out, easy to switch back on later).
- The **social icons** now point to the real 1NRI accounts (Instagram `_1nriworldwide`, TikTok `@1nriworldwide`) instead of placeholder links. **Note:** the X/Twitter icon is a best-guess handle (`x.com/1nriworldwide`) — the About page only lists Instagram, TikTok, and YouTube, so this one needs confirming, or we can swap the X icon for YouTube.

**The newsletter card is now inverted.** Its colours are flipped — the sign-up band that was light is now dark (and vice-versa in dark mode), with the text, input field, and Subscribe button all swapped to match. Purely a look change; it still works exactly the same.

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/app/(shop)/layout.tsx` | Footer restyled to the site's black/white tokens; fixed the My Account link, replaced the dead Collections link, commented out Lookbook, and pointed the social icons at the real 1NRI accounts |
| `apps/frontend/components/shop/NewsletterSection.tsx` | Inverted the card's colours (background, text, input, and button) in both light and dark mode |

### Heads-up

> The footer's **X/Twitter** link is an unverified guess. If 1NRI isn't on X, say the word and we'll swap that icon for YouTube (which has a confirmed handle).

### How to test

1. Scroll to the bottom of any storefront page and check the footer reads cleanly in both light and dark mode.
2. Click each footer link — they should all land on a real page (no 404s). Hover the social icons and confirm they open the right 1NRI profiles.
3. Look at the newsletter sign-up section — it should now be the opposite shade from before, with the Subscribe button flipped to match.

---

## Slide-in Cart Drawer + Add-to-Cart Animation (June 2026)

**Adding something to your bag now pops open a cart panel from the right** — no more jumping to a separate cart page just to see what you added. It's the quick "mini-cart" pattern you see on most big stores (think Everlane, Represent).

What happens now when you add an item:

- The little number on the **bag icon** in the header gives a quick bounce, and the bag nudges — a small bit of feedback so it's obvious something landed in your cart.
- A **panel slides in from the right** showing your bag. It opens automatically on every add, and you can also open it any time by clicking the bag icon (it used to send you to the full `/cart` page).

Inside the drawer:

- **Your items** — photo, name, size/colour, price, a quantity stepper (+ / −), and a Remove button.
- **"You might also like"** — a small row of recommended products (pulled from our existing recommender, the same engine behind "Picked for you"). Each has a one-tap **quick-add (＋)** button that drops it straight into the bag and shows a ✓; anything already in your bag is filtered out so it won't suggest duplicates.
- A **sticky checkout footer** with the subtotal and a "Checkout" button, plus an empty-bag state if there's nothing in it yet.

The full `/cart` page is untouched and still works — the drawer is just a faster way in. (We briefly had a "free shipping progress" bar at the top of the drawer but removed it per request, so the header just reads "Your Bag".)

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/app/(shop)/components/CartDrawer.tsx` | **New** — the whole right-side cart panel: backdrop, item list with quantity/remove controls, the "You might also like" recommendation row with quick-add, and the sticky subtotal/checkout footer. |
| `apps/frontend/lib/cart/cart-context.tsx` | Added open/close state for the drawer so it can pop open from anywhere, and made every "add to cart" open it automatically. Also exposes a `hydrated` flag so the bag animation doesn't falsely fire on page load. |
| `apps/frontend/app/(shop)/layout.tsx` | Mounted the drawer site-wide; the header bag icon now opens it instead of navigating to `/cart`. Added the bag-bump/nudge animation on the count. |
| `apps/frontend/app/globals.css` | Added the small bounce/nudge keyframe animations (and respects "reduce motion" accessibility settings). |

### How to test

1. Run the storefront (`npm run dev` in `apps/frontend`) and open any product.
2. Add it to the cart (or use a product card's Quick Add) — the bag count should bounce and the cart panel should slide in from the right.
3. In the drawer: change quantities, remove an item, and confirm the subtotal updates.
4. Scroll to **"You might also like"** and tap a ＋ — that product should drop into the bag (showing a ✓) and disappear from the suggestions.
5. Click the **bag icon** in the header — it should open the same drawer. Press **Esc** or click the dark backdrop to close.

---

## Saved Items Drawer (June 2026)

**Your wishlist now slides in from the right too**, just like the cart drawer — tapping the **heart icon** in the header pops open a panel instead of sending you off to a separate page. It's the same quick, stay-where-you-are pattern, so checking what you've saved no longer interrupts your browsing.

What's in the panel:

- **A header** reading "Saved Items (n)" with a close button.
- **Your saved products** — photo, name, price, a **View product** link, and a **Remove** button. Removing is instant (the item disappears right away, even before the server confirms).
- **Smart empty states**: if you're not signed in it shows a "Sign in to view saved items" prompt; if you're signed in but haven't saved anything yet it nudges you to tap the heart on a product; and it shows loading placeholders while your list is fetching.

The full `/favourites` page is untouched and still works — links like "Saved Items" in the main menu still open it — so the drawer is just the faster way in, mirroring how the cart icon and `/cart` page coexist.

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/app/(shop)/components/FavouritesDrawer.tsx` | **New** — the right-side saved-items panel: backdrop, item list with View/Remove, plus signed-out / empty / loading states. Reuses the existing favourites data and the same save/remove logic the heart buttons already use. |
| `apps/frontend/lib/favourites-drawer.tsx` | **New** — a tiny shared on/off switch so the header heart and the drawer stay in sync (open it from anywhere). |
| `apps/frontend/app/(shop)/layout.tsx` | Mounted the drawer site-wide and made the header **heart** open it instead of navigating to `/favourites`. |

### How to test

1. Run the storefront (`npm run dev` in `apps/frontend`) and sign in.
2. Save a few products (tap the heart on product cards or product pages).
3. Click the **heart icon** in the header — the Saved Items panel should slide in from the right. Press **Esc** or click the dark backdrop to close.
4. Hit **Remove** on an item and confirm it vanishes immediately; click **View product** and confirm it lands on the right page.
5. Sign out and open it again — you should see the "Sign in to view saved items" prompt.

---

## "Others Also Bought" — Quick-Add With Size Picker (June 2026)

**The cart drawer now suggests extra items you can add without leaving your bag** — and adding them works exactly like it does on the main shop page, where you pick a size first.

When you open your bag, there's an **"Others Also Bought"** row of suggested products under your items. Tapping the **＋** on one of them now:

- **For products with sizes** — pops up a little size strip (XS, S, M, L…) right on the card. Pick a size and it drops *that specific size* into your bag with a quick loading tick, then a ✓. Sold-out sizes are crossed out and can't be picked. This is the same behaviour as the "Quick Add" on product cards everywhere else, so it feels consistent.
- **For one-size / single-option products** — the ＋ just adds it straight away.

Two smaller things worth noting:

- **It always shows something now.** Before, if our recommendation engine was offline or had nothing for you, the whole row vanished. It now falls back to showing a few products from the catalogue so the row still appears. (When the recommender is up, those smarter picks take over automatically.)
- **No more guessing the size.** Previously a quick-add from this row silently grabbed whatever the "first available" size was — which could be the wrong one. Now you choose.

Under the hood we moved the shared size logic into one place so the shop page and the cart drawer can't drift apart.

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/lib/products/variants.ts` | **New** — one shared home for the "which option is the size / list the sizes / find the variant for a size" logic, so the product grid and the cart drawer use the exact same rules. |
| `apps/frontend/app/(shop)/components/ProductCard.tsx` | Now uses the shared size helpers instead of its own private copies (no behaviour change here). |
| `apps/frontend/app/(shop)/components/CartDrawer.tsx` | "Others Also Bought" quick-add rewritten to use the size-picker flow; added the catalogue fallback so the row shows even when the recommender is down. |

### How to test

1. Run the storefront (`npm run dev` in `apps/frontend`) and add something to your bag so the drawer opens.
2. Scroll to **Others Also Bought**. On a product that has sizes, tap **＋** — a size strip should appear on the card.
3. Pick a size — it should show a brief spinner, then a ✓, and that size should appear in your bag above. Confirm a crossed-out (sold-out) size can't be selected.
4. On a single-size product, tap **＋** and confirm it adds immediately.
5. If you can, take the recommender service offline — the row should still show a few catalogue products instead of disappearing.

---

## Colour Swatches on Cart Suggestions (+ faster image loads) (July 2026)

**The "Others Also Bought" suggestions in the cart drawer now have colour swatches**, the same little colour dots you see under products on the main shop pages. Tap a swatch and the suggestion's photo switches to that colour — so a shopper can eyeball the colour they want right there in their bag, without opening the product.

Two nice touches:

- **Colour carries into the bag.** When you quick-add a suggestion after picking a colour, the item lands in your bag labelled with that colour (and size, if it has sizes) — e.g. "Navy · M" — and shows the matching photo.
- **The colour photos load faster.** As soon as you hover over (or, on a phone, touch) a colour dot, we quietly start loading that colour's picture in the background. So by the time you actually tap it, the image is usually already there — no waiting for it to pop in. This mirrors the same trick the main shop pages already use.

Behind the scenes we also moved the shared colour logic (the colour-name-to-swatch table and the "which photo goes with which colour" lookup) into one common file, so the shop pages and the cart drawer stay perfectly in sync and we're not maintaining two copies.

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/lib/products/colors.ts` | **New** — one shared home for the colour swatch palette and the colour→photo lookup, pulled out of the product card so the cart drawer can reuse the exact same logic. |
| `apps/frontend/app/(shop)/components/ProductCard.tsx` | Now uses the shared colour helpers instead of its own private copies (no behaviour change). |
| `apps/frontend/app/(shop)/components/CartDrawer.tsx` | Added colour swatches to the "Others Also Bought" suggestions, made the chosen colour flow into the bag, and wired up the hover/touch image pre-loading. |
| `apps/frontend/hooks/useImagePrefetch.ts` | Added a small helper to pre-load a plain image URL (the suggestion cards use regular `<img>`s, so the existing optimised-image pre-loader didn't apply to them). |

### How to test

1. Run the storefront (`npm run dev` in `apps/frontend`) and add something to your bag so the drawer opens.
2. In **Others Also Bought**, find a product with more than one colour — you should see colour dots under it. Tap one and confirm the photo swaps to that colour.
3. Quick-add that product (via **＋** / size picker) and confirm the bag entry shows the colour you picked and the right photo.
4. Hover over a colour dot for a beat before clicking — the colour's image should appear instantly (it was pre-loaded), rather than flashing in after a delay.

---

## Turning On Pre-orders for Existing Products (July 2026)

**You can now switch pre-orders on for a product you've already created.** Before this, the "Allow Pre-orders" toggle only showed up when you were adding a *brand-new* variant. If you opened an existing product and clicked **Edit** on one of its variants, there was no pre-order control anywhere — so there was simply no way to enable pre-orders after the fact. That's why it looked like certain products "couldn't" have pre-orders.

To be clear: this was never about stock levels. Setting a product's stock to 0 didn't make a hidden toggle appear — the toggle just wasn't in the edit screen at all. Now it is.

The edit view for each variant has a new row with the same **Allow pre-orders** switch (and optional limit) that the add-new-variant form already had. Flip it on, save, and that variant will offer "Pre-order Now" on the storefront as soon as it sells out.

### Files changed

| File | What changed |
|---|---|
| `apps/admin/app/components/products/VariantsEditor.tsx` | Added the pre-order toggle (and optional order limit) to the **Edit** view of an existing variant — previously it only appeared when adding a new one. The save/load wiring was already in place, so it now sticks correctly. |

### Heads-up / action required

> Any product you tried to enable pre-orders on *before* this fix almost certainly didn't save — the toggle was unreachable, so it's still off in the database. Just re-open that product, **Edit** the variant, turn **Allow pre-orders** on, and save again.

### How to test

1. In the admin, open an existing product and scroll to **Variants**.
2. Click **Edit** on a variant — you should now see an **Allow pre-orders** switch below the edit fields.
3. Turn it on (optionally set a limit), then **Save**.
4. Set that variant's stock to 0 and check the storefront — the product page should show **Pre-order Now** instead of **Sold Out**.

---

## Search Engine Optimization (SEO) Overhaul (July 2026)

**The storefront can now actually be found on Google.** An SEO audit found that basically zero pages were getting indexed — Google either couldn't discover our pages, or when it did visit a product page it hit a server error and saw nothing. This pass fixes the whole chain: telling Google what pages exist, giving every page a proper title/description, feeding the rich "product cards" that show up in search results, and — the big one — making product pages actually load for Google's crawler instead of crashing.

In plain terms: before, if you searched "1NRI streetwear" we were invisible. This lays the groundwork to change that. (SEO still takes weeks for Google to catch up after a site deploys — this is the foundation, not an instant switch.)

### What changed, plainly

- **A sitemap** (`/sitemap.xml`) — an auto-updating list of every page and every published product, handed straight to Google so nothing gets missed. New products show up in it automatically within the hour.
- **A robots file** (`/robots.txt`) — tells search engines "index the shop, but skip the cart, checkout, login and account pages" (those have no business in search results).
- **Real titles & descriptions on every page** — the homepage, About, the product grid, and each individual product now have their own tailored title and blurb (what shows up as the clickable headline + grey text in Google results), instead of every tab just saying "1NRI".
- **Share previews** — links pasted into WhatsApp, Instagram, X, etc. now show a proper image, title and description.
- **"Rich results" data** — behind-the-scenes structured data so Google can show our product name, price, and in-stock status right in the results, plus the Home › Products › [item] breadcrumb trail and our brand/social profiles.
- **The critical fix: product pages no longer crash for Google.** The pre-order payment widget was loading in a way that errored out whenever a non-browser (like Google's crawler) tried to open a product page. We isolated it so the page loads cleanly server-side; the pre-order popup still works exactly the same for shoppers.
- **Faster, correctly-sized hero image** and descriptive alt text on all the main images (also helps accessibility and image search).

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/app/sitemap.ts` | **New** — auto-generated sitemap of static pages + every published product. |
| `apps/frontend/app/robots.ts` | **New** — allows search engines on the shop, blocks cart/checkout/account/auth pages. |
| `apps/frontend/app/layout.tsx` | Full site-wide title/description/share-preview defaults, plus brand + website structured data. |
| `apps/frontend/app/(shop)/page.tsx` | **New** thin wrapper that gives the homepage its own title/description (the homepage design moved untouched into `RoadToHQClient.tsx`). |
| `apps/frontend/app/(shop)/RoadToHQClient.tsx` | The existing homepage, unchanged except image alt text + hero image quality. |
| `apps/frontend/app/(shop)/about/layout.tsx` | **New** — About page title/description/share preview. |
| `apps/frontend/app/(shop)/products/layout.tsx` | **New** — products page title/description + a server-rendered product list Google can read. |
| `apps/frontend/app/(shop)/product/[id]/layout.tsx` | **New** — per-product title/description/share preview + product & breadcrumb rich-results data. |
| `apps/frontend/app/(shop)/product/[id]/PreorderModal.tsx` | **New** — the pre-order popup, split out so the payment library only loads in the browser (this is the crawler-crash fix). |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | Loads the pre-order popup lazily (browser-only); image alt tweak. No visible change. |
| `apps/frontend/app/(shop)/about/page.tsx` | Descriptive alt text on editorial images. |
| `apps/frontend/app/(shop)/layout.tsx` | Logo alt text ("1NRI Worldwide logo"). |
| `apps/frontend/lib/seo/site.ts` | **New** — one shared source of truth for the public site URL. |
| `apps/frontend/lib/api/products.server.ts` | **New** — safe server-side product fetching used by the sitemap and product pages. |
| `apps/frontend/next.config.ts` | Allow the hero image's higher quality setting. |

### Heads-up / action required

> **One manual step left:** Google Search Console verification. Once someone sets up the storefront in Google Search Console, they'll get a verification code — paste it into the `verification.google` slot in `apps/frontend/app/layout.tsx` (there's a commented placeholder waiting) and submit `https://1nri.store/sitemap.xml` there. That's what actually kicks off Google indexing.
>
> Note the footer social links were already correct, so those didn't need changing.

### How to test

1. Build and run the storefront (`npm run build && npm run start` in `apps/frontend`) with the backend running.
2. Visit `/sitemap.xml` and `/robots.txt` — both should load; the sitemap should list your products.
3. Open a few pages and check the browser tab titles differ (Home vs About vs a product).
4. Open a product page — it should load normally (no error), and viewing page source should show the product name, price and description in the HTML.

---

## Go-Live Migration Prep (July 2026)

We're moving off the old Shopify site and running live operations here. This round cleared out all the leftover test data and hardened four things so the store is ready for real customers.

**What changed, in plain language:**

- **Cleared the test data.** Deleted the four `@iris.test` staff/test logins, all the seeded test orders, all 30 of the test ally's sales, and two throwaway pop-up events (Black Saturday, Spring Launch) with their orders. Kept everything real: all 873 customer accounts, the Last Dance pop-up and its 78 orders, and the test ally *account* (still handy for demos — just its fake sales are gone).
- **Order numbers now start at a clean, professional number.** The first real order will be **IRD-001001** instead of "order #1" — so it doesn't look like we just opened, and it doesn't leak how many orders we've done. Numbers still count up in order, so they're easy to sort.
- **Pre-orders can now be tracked publicly.** Before, the "Track your order" page only knew about normal orders. Now a customer can punch in a `PRE-…` number + their email and see their pre-order status (Reserved → Stock Held → Fulfilled). Staff also got a **"Mark Fulfilled"** button so a pre-order can be closed out once it's handed over.
- **The "Road to HQ" units counter is now real.** It used to be a hardcoded 475. Now it adds up actual units sold across the website, pop-up sales, **and ally sales** (only counting real, paid/completed sales — not cancelled or unpaid ones), plus an adjustable "baseline" number for history. We set the baseline to **402**, so the counter currently reads **475** — same as before, but now it moves on its own as real sales come in.

**Why:** so nothing fake is mixed into real sales, revenue and reporting, and the storefront looks established from day one.

### Files changed

| File | What changed |
|---|---|
| `apps/backend/src/settings/settings.service.ts` + `settings.controller.ts` | New saved settings: order-number start, pre-order-number start, Road-to-HQ baseline & target. |
| `apps/backend/src/orders/orders.service.ts` | Order numbers now start at the configured number (IRD-001001); "Track order" now also finds pre-orders. |
| `apps/backend/src/preorders/preorders.service.ts` + `preorders.controller.ts` | Pre-order numbers start clean too; new "mark fulfilled" action. |
| `apps/backend/src/analytics/analytics.service.ts` + `analytics.constants.ts` + `analytics.controller.ts` + `analytics.module.ts` | New public "Road to HQ" figure = website + pop-up + ally units + baseline. |
| `apps/frontend/app/(shop)/track/page.tsx` + `lib/api/orders.ts` | Track page shows pre-order progress as well as normal orders. |
| `apps/frontend/app/(shop)/page.tsx` + `RoadToHQClient.tsx` + `lib/api/road-to-hq.server.ts` | Homepage counter now pulls the live number instead of the hardcoded 475. |
| `apps/admin/app/(dashboard)/preorders/page.tsx` + `apps/admin/lib/api/preorders.ts` | "Mark Fulfilled" button for pre-orders. |
| `apps/frontend/scripts/cleanup-test-accounts.ts` | **New** — safely delete listed test accounts (dry-run first, skips real/Shopify customers). |
| `apps/frontend/scripts/cleanup-test-orders.ts` | **New** — safely delete listed test orders/pre-orders (dry-run first, never touches pop-up data). |
| `apps/frontend/scripts/cleanup-test-ally-sales.ts` | **New** — safely delete a test ally's sales (dry-run first). |

### Heads-up / action required

> **The data cleanup above was run on the staging database only.** When we cut over to production, the same steps need repeating there: (1) set the Road-to-HQ **baseline to 402** on production, (2) run the three cleanup scripts against production (dry-run → confirm), and (3) deploy this code. Take a database backup first.
>
> The cleanup scripts only ever delete the exact accounts/orders you list them (no wildcards), and always show you the list before deleting.

### How to test

1. Place a test checkout → the new order should be **IRD-001001**.
2. Create a pre-order, then go to `/track`, enter the `PRE-…` number + email → you should see its progress.
3. Load the homepage → the Road to HQ counter should read **475** and tick up as real orders come in.

## Customer Contact Import (July 2026)

We had a phone-contact list of ~610 people (names, a few emails, phone numbers in every format imaginable) and pulled them into the real customer database — cleaning up the numbers and avoiding duplicates along the way.

**What changed, in plain language:**

- **Everyone's phone number is now stored properly** in the standard international format with the right country code (e.g. `+233…` for Ghana, `+1…`, `+44…`, `+254…`, etc.). Not everyone was Ghanaian, so the tool figured out the correct country per number instead of assuming Ghana.
- **We matched to existing customers first** so we didn't create duplicate accounts. 586 contacts were already in the system (matched by phone or email) — for those we only *filled in blanks* (a missing name, email, or phone), never overwriting anything already there.
- **530 brand-new customer accounts were created** from the list, each tagged as an imported contact so we can always find or undo them later. No texts or emails were sent to anyone.
- **8 contacts were skipped** and need a human eye: 1 had a broken phone number (Muzzu) and 5 had no phone *and* no email, plus 2 with typo'd numbers whose good entries came through anyway (Deborah, Barima Jones). (VALERIE ACKON was also skipped but is the *same person* as "valerie a.", who's already in — so she's covered.)

**Why:** a cleaner, richer customer database — consistent phone numbers we can actually use for order lookups and outreach, without junk duplicates.

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/scripts/import-contacts.ts` | **New** — the import tool. Normalizes phone numbers (country-aware), matches to existing customers (phone → email → safe name), backfills without overwriting, and creates new accounts for the rest. Safe to re-run. |
| `apps/frontend/scripts/contact-import-report.json` | **New** — the full record of what happened: every create, backfill, and skip (with reasons). Handy for the manual follow-ups. |
| `apps/frontend/package.json` | Added the `libphonenumber-js` library for phone parsing/validation. |

### Heads-up / action required

> **This was run on the staging database.** If we want these contacts in production too, the same script needs running there (dry-run first, then commit).
>
> **9 contacts still need manual fixing** — see the "skipped" list in `contact-import-report.json`. Correct their numbers in a CSV and re-run the script; it only adds what's missing, so it won't duplicate anyone.

### How to test

1. Search the customer list for a known imported name/number (e.g. **ADOTEY** / `+233243144367`) → they should be there with a clean `+…` number.
2. Filter/query profiles tagged `migrated_from = 'contact-import-2026-07'` → should be **530** rows.
3. Re-run `node --no-warnings scripts/import-contacts.ts` (dry-run) → it should report almost everyone as "already exists" and create nothing new.

---

## Product Image Upload — Loading Modals & Instant Updates (July 2026)

Fixed a cluster of annoying bugs on the admin **product page** around adding, removing, and tagging product photos — and added the clear "please wait" popup we were missing.

**What changed, in plain language:**

- **You now get a loading popup while a photo uploads or is deleted.** It says "Uploading image…" / "Deleting image…" and closes on its own the moment the photo finishes — no more wondering whether anything is happening.
- **Uploaded photos show up immediately.** Before, a new photo would seem to vanish until you manually refreshed the page — now it appears right away.
- **Colour tagging works instantly.** Assigning a colour variant to a photo (so the right image shows for the right colour on the store) used to need a manual refresh to take effect. Fixed.
- **The half-white-screen glitch is gone.** After uploading, part of the screen used to turn white until you refreshed — that was a browser rendering quirk in the old upload overlay, now removed.
- **Deleting a photo updates the grid right away** instead of leaving the deleted photo sitting there until refresh.
- **Behind the scenes:** the background job that tracks abandoned checkouts now quietly retries when it hits a brief network hiccup to the database, instead of logging a scary "fetch failed" error each time. No behaviour change for customers — just less noise and a self-healing job.

**Why:** uploading and organising product photos was confusing and looked broken (things not appearing, needing constant refreshes). It now behaves the way you'd expect, with clear feedback.

### Files changed

| File | What changed |
|---|---|
| `apps/admin/app/components/products/ImagesEditor.tsx` | Added the centered "Uploading / Deleting image…" loading modal (auto-closes when done); removed the overlay effect that caused the half-white screen. |
| `apps/admin/app/components/products/ProductForm.tsx` | Made the page refresh itself after a photo is added, deleted, colour-tagged, or reordered — so changes show instantly instead of after a manual refresh. |
| `apps/backend/src/analytics/analytics.service.ts` | Added automatic retry-on-network-hiccup for the abandoned-checkout background job; errors now include the underlying cause for easier debugging. |

### How to test

1. Open a product in the admin at **Products → (any product)**. Add a photo → a "Uploading image…" popup appears, then closes on its own and the photo shows up **without refreshing**.
2. On a photo, open **▼ colours** and toggle a colour → the colour badge updates **immediately**.
3. Delete a photo → a "Deleting image…" popup shows, then closes and the photo disappears. No white screen anywhere in the process.

---

## Product Variants — Fixed the "can't add more variants" cap (July 2026)

Fixed a bug on the admin **product page** where adding variants (a colour/size combo like "Black / M") would sometimes just stop working — it looked like there was a hidden limit on how many variants a product could have. There was no real limit; two separate things were quietly failing and both showed the same unhelpful "something went wrong" error.

**What changed, in plain language:**

- **The real "cap" was a duplicate-code clash.** Every variant gets an auto-generated product code (SKU) built from the product's initials + colour + size — e.g. a Mustard variant on a product might become `SP-MUS`. That code had to be unique across the **entire** store, so two differently-named products that happened to produce the same code would block each other. The second one would refuse to save, which felt like hitting a limit. Now codes only need to be unique **within a single product**, so those clashes are gone. (This matches how Shopify works.)
- **Adding a variant with no price used to fail silently.** The system requires a price on every variant, but the form let you try to add one without typing a price (when there was no base price to fall back on). It would error out with a generic message. Now the **"Add variant" button stays disabled until you enter a price**, with a small "Price required" note so it's obvious.
- **Errors now actually tell you what's wrong.** If a variant ever genuinely can't be saved, you'll see a clear message ("A variant with SKU X already exists…" or "Variant price is required") instead of a mysterious failure.

**Why:** merchants were hitting an invisible wall when building out product options and had no idea why. This removes the wall and, where a real problem exists, explains it plainly.

### Files changed

| File | What changed |
|---|---|
| `supabase/migrations/20260705000000_scope_variant_sku_per_product.sql` | **New** — database change: product codes (SKUs) now only need to be unique *within a product* instead of across the whole store. |
| `apps/admin/app/components/products/VariantsEditor.tsx` | "Add variant" is now blocked until a price is entered, with a "Price required" hint. |
| `apps/backend/src/products/products.service.ts` | Turned the two silent database errors (duplicate code, missing price) into clear, readable messages instead of a generic failure. |

### Heads-up / action required

> **The database migration has been applied.** No further action needed for existing environments where it's already run; just make sure it runs anywhere the database gets rebuilt from scratch.

### How to test

1. Open a product in the admin at **Products → (any product)** and add several colour/size variants in a row → no cap, they all save.
2. On a product with **no base price**, open **+ Add variant**, pick a colour but leave price blank → the **Add variant** button is disabled and shows "Price required". Type a price → it saves.
3. Try adding the **same colour + size twice** to one product → you get a clear "SKU already exists" message instead of a silent error.

---

## Storefront — "Sold Out on the grid, in stock on the page" fix (July 2026)

Fixed a confusing mismatch on the **customer-facing store**: an item that had been switched off (marked unavailable/"cancelled") could show as **Sold Out** on the product grid, but then look **in stock** — sometimes even "Only 2 left" with an active **Add to Cart** — once you clicked into the product page.

**What changed, in plain language:**

- Every variant (a colour/size combo) has an on/off switch separate from its stock count. The store's rule for "can you buy this right now?" is: **it has stock AND it's switched on.** Most of the site already followed that rule — but the **product page's main buy button and stock badge** were only checking the stock count and ignoring the on/off switch. So a switched-off item with leftover stock looked buyable there.
- Now the product page follows the same rule as everywhere else: a switched-off variant shows **Sold Out** and its Add to Cart is disabled (or shows the **Pre-order** button instead, if pre-orders are enabled for it).
- We also moved this "can you buy it?" rule into **one shared place** so the product page, the product grid, and the quick-add popup can't drift apart again in future.

**Why:** customers (and us) were seeing an item as sold out in one place and available in another. Now it's consistent across the whole store.

**Note:** this only fixes what the store *displays*. It doesn't change how an item gets switched off in the first place — that's still a manual/data setting. If we later want things like "auto-switch-off when stock hits zero," that's a separate follow-up.

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/lib/products/variants.ts` | Added one shared "can this variant be sold right now?" check (has stock **and** switched on), so every part of the store uses the same rule. |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | The product page's stock badge, "Only N left" note, buy button, and default colour/size pick now respect the on/off switch — not just the stock count. |
| `apps/frontend/app/(shop)/components/ProductCard.tsx` | Swapped its (already-correct) inline checks for the shared rule so it can't drift. |
| `apps/frontend/app/(shop)/components/VariantSelector.tsx` | Fixed the same blind spot in an unused selector component, in case it's ever put to use. |

### How to test

1. Pick any product variant and switch it **off** (set it unavailable) while it still has stock.
2. On the shop grid, that variant shows **Sold Out** (unchanged).
3. Click into the product and select that colour/size → it now shows **Sold Out** with **Add to Cart disabled** (previously it wrongly showed in stock). If that variant has pre-orders enabled, you'll see the **Pre-order** button instead.
4. A normal in-stock, switched-on variant still works exactly as before (buyable, with the "Only N left" note under 3).

---

## Pre-orders now go through the normal checkout (July 2026)

We merged **pre-orders into the regular cart-and-checkout flow.** Before, pre-ordering was a totally separate path: a sold-out-but-preorderable item showed a **"Pre-order Now"** button that popped open its own little window and ran its own separate payment. That also meant you had to be **logged in** to pre-order at all.

Now it's one unified experience:

- A sold-out item that's enabled for pre-order shows **"Pre-order – Add to Cart"** and drops straight into your bag like anything else. You can mix in-stock and pre-order items in the **same** cart and pay for everything in **one** checkout.
- Pre-order items are **clearly labelled** the whole way through — a **"Pre-order · ships when restocked"** badge in the cart, on the checkout summary, and a short banner at checkout explaining they're charged today and ship separately once back in stock. The order confirmation page lists them in their own **"Pre-order items"** section.
- **The checkout is now smart about stock.** If something in your cart sells out between adding it and paying, the system checks whether it's pre-orderable and, if so, **quietly records it as a pre-order instead of telling you "out of stock."** Genuinely unavailable items (not enabled for pre-order) are still blocked, same as before.
- **You no longer need an account to pre-order.** Guests can pre-order through the normal guest checkout with just an email + shipping details, and still get their confirmation and email/SMS updates.

Behind the scenes, nothing about our existing **pre-orders tooling changed** — the admin Pre-orders page, the "restock & allocate → text the customer" flow, refunds, and pre-order tracking all keep working exactly as they did. Each checkout now creates one regular order (the payment + shipping record) and the pre-ordered lines still land in the pre-orders list, linked back to that order.

**One thing to know:** if a customer's cart is *entirely* pre-order items, the resulting order will have **no in-stock line items on it** — it's acting purely as the payment/shipping record, and the actual items live in the Pre-orders list. So an "empty-looking" order with pre-orders attached is expected, not a bug.

### Files changed

| File | What changed |
|---|---|
| `supabase/migrations/20260706000000_link_preorders_to_orders.sql` | **New migration** — links each pre-order back to the order it was paid through. |
| `apps/backend/src/orders/orders.service.ts` | Checkout now splits a cart into in-stock lines (kept on the order) and sold-out-but-preorderable lines (recorded as pre-orders); confirming payment also marks those pre-orders paid and sends their confirmations. |
| `apps/backend/src/preorders/preorders.service.ts` | Added guest-friendly pre-order creation/validation used by the checkout, and made the "one active pre-order per item" rule work by email for guests. |
| `apps/backend/src/orders/orders.module.ts`, `apps/backend/src/preorders/preorders.module.ts` | Wired the two areas together so the order flow can create pre-orders. |
| `apps/frontend/app/(shop)/product/[id]/page.tsx` | "Pre-order Now" button replaced with "Pre-order – Add to Cart"; removed the old pop-up window (and its login requirement). |
| `apps/frontend/app/(shop)/product/[id]/PreorderModal.tsx` | **Deleted** — the separate pre-order pop-up/payment is gone. |
| `apps/frontend/lib/cart/cart-context.tsx` | Cart items can now remember they're a pre-order. |
| `apps/frontend/app/(shop)/components/CartDrawer.tsx`, `apps/frontend/app/(shop)/components/ProductCard.tsx`, `apps/frontend/app/(shop)/cart/page.tsx` | Show the "Pre-order" badge and mark quick-added sold-out items as pre-orders. |
| `apps/frontend/app/(shop)/checkout/CheckoutClient.tsx` | Pre-order badge on the summary + an explainer banner when the cart has pre-order items. |
| `apps/frontend/app/(shop)/checkout/confirmation/page.tsx` | New "Pre-order items" section on the confirmation page. |
| `apps/frontend/lib/api/orders.ts` | Order data now carries its linked pre-order lines. |

> **Heads-up / action required:** the new database migration (`20260706000000_link_preorders_to_orders.sql`) **has not been applied yet** — it needs to run against the database before this works in any environment (and anywhere the database is rebuilt from scratch).

### How to test

1. Find (or set up) a product variant that's **sold out but has pre-orders enabled**. On its product page you'll see **"Pre-order – Add to Cart"** → add it.
2. Also add a **normal in-stock** item, so the cart is mixed. Notice the **"Pre-order"** badge on the pre-order line in the bag and at checkout, plus the banner.
3. Check out and pay **once**. On the confirmation page you'll see your normal items *and* a separate **"Pre-order items"** section.
4. In the admin **Pre-orders** page, the pre-ordered line shows up (source: online) and can be restocked/allocated exactly as before.
5. **Guest test:** repeat while **logged out** — you should never be asked to log in; enter an email + shipping and it goes through, with the pre-order recorded against that email.
6. **Out-of-stock, not preorderable:** a sold-out item that's *not* enabled for pre-order is still blocked at checkout with an out-of-stock message.

---

## Abandoned-cart emails — fixed duplicate sends & the localhost link (July 2026)

Two problems with the **abandoned-cart recovery email** (the "you left something in your bag" reminder we automatically send ~30 min after someone abandons checkout):

1. **The link pointed to `localhost`.** A customer got a reminder whose "return to your cart" button went to `http://localhost:3000` — a developer address that only works on our own machines, not something a real customer can open. It now points to the live store, **`https://1nri.store`**. (This came from a backend setting, `FRONTEND_URL`, that was still set to the local dev address; that setting is also what a bunch of other customer links use — order tracking, password reset — so this fixes all of them at once.)

2. **Some customers got the reminder twice.** One shopper received two copies of the same email — one with the localhost link, one with the live link. The cause: more than one copy of the backend was running at the same time, and the "have we already emailed this cart?" check wasn't airtight — both copies looked, both saw "not yet," and both sent. We reworked it so a cart is **claimed** the instant before sending (a single database flip that only one sender can win), so even if several backends run at once, each cart gets **at most one** reminder. If a send genuinely fails, the claim is released so it can be retried later.

**Why it matters:** customers were getting broken links and, worse, duplicate emails — both make us look sloppy and hurt the recovery flow that's meant to win back sales.

### Files changed

| File | What changed |
|---|---|
| `apps/backend/src/analytics/analytics.service.ts` | Reminder now **claims each cart atomically** before emailing, so duplicate/parallel backends can't double-send; releases the claim if the send fails. |
| `apps/backend/src/main.ts` | Kept the local dev address in the allow-list so pointing the main setting at the live store doesn't break local development. |
| `apps/backend/.env` *(not in git)* | `FRONTEND_URL` changed from `http://localhost:3000` → `https://1nri.store` so customer email/SMS links point at the live store. |

> **Heads-up / action required:**
> - The production backend should have `FRONTEND_URL=https://1nri.store` in its environment (it likely already does — the localhost value was only on a local machine that had been sending real emails).
> - Only run **one** backend instance. The duplicate-send fix makes extra copies harmless, but running several at once is still wasteful and was the original trigger here.

### How to test

1. Start a checkout (enter your email), then abandon it and wait for the reminder cycle.
2. The email's "return to cart" button should open **`https://1nri.store/checkout/recover?...`**, not localhost.
3. You should receive **exactly one** reminder for that cart, even if the recovery job runs several times.

---

## Simpler variant setup — pick a colour, then its sizes (July 2026)

Adding variants to a product used to mean building **one colour-and-size combo at a time**: for every single row you'd re-pick the colour, re-pick the size, and retype the price, SKU and stock. A product in 3 colours × 6 sizes was 18 near-identical passes through the same little form, and footwear (sizes 38–45) turned into a very long list.

The **Add/Edit product → Variants** section now works the way you actually think about stock:

1. **Add a colour** (from the swatch list or type your own).
2. Open that colour and **tick the sizes it comes in**, typing the number of **units in stock** for each right there.
3. Set **price, "compare-at" price and pre-orders once on the colour** — they apply to every size under it. Need an exception? You can still override any single size.

**Sizes are smart about the product type.** Clothing shows `XXS → 3XL` (plus `One Size`); if the product's **Category is Footwear**, it switches to **numbered sizes 38–45**, with a **"+ Add 46"** button at the end so you can extend the range as far as you need without a giant pre-made list.

**Pre-orders got clearer too.** Each colour has a pre-order switch; flipping it on turns pre-orders on for *all* its sizes at once. Under the hood each size still has its own switch, so you can turn one specific size back off (e.g. allow pre-orders on every size except the one you'll never restock). When a colour's sizes disagree, its switch shows a neutral "mixed" state so you can tell at a glance.

**A quiet bug got fixed:** when setting up a **brand-new product**, any pre-order settings or "compare-at" prices you entered on a variant *before* hitting "Create product" were being silently thrown away. They now save correctly the first time.

Nothing changed about how variants are stored or how the storefront shows them — this is purely a nicer way to enter the same information.

### Files changed

| File | What changed |
|---|---|
| `apps/admin/app/components/products/VariantsEditor.tsx` | Rebuilt the variants section as a **colour-first** editor: colour cards you expand to tick sizes + type stock, colour-level price/compare/pre-order that cascade to every size (with per-size overrides), category-aware size sets (apparel vs footwear 38–45), and a "+ Add next size" button for footwear. |
| `apps/admin/app/components/products/ProductForm.tsx` | Feeds the product's Category into the editor (so it knows to show footwear sizes), lets you edit variants while still creating a product, and **fixes the create-mode bug** that dropped pre-order/compare-at settings on brand-new products. |

### How to test

1. **New clothing product:** set a base price and Category = *Tops*. Under Variants, **Add colour → Black**, open it, tick **S / M / L**, and type stock for each. Notice the price auto-fills from the base price.
2. Flip the colour's **Pre-order** switch on → all its sizes turn on. Turn **L** back off individually → only L is off, and the colour switch now reads "mixed".
3. **Add a second colour** (e.g. Cream), tick a couple of sizes, then **Create product**. Reopen the saved product and confirm every colour/size, its stock, and the pre-order flags all persisted (this is the bug that used to lose settings).
4. **Footwear:** on a product with Category = *Footwear*, the sizes become **38–45**; use **"+ Add 46"** to go higher, tick the sizes you stock, and save.
5. **Existing products:** open one you already have — its variants show grouped by colour, and editing a colour's price updates all its sizes at once.

---

## One clear product status: Active / Draft / Archived (July 2026)

Products used to have **two overlapping switches** that both sort-of controlled whether a product was live: a "Published" checkbox **and** a separate Status field (Active/Draft/Archived). Only the checkbox actually did anything — the Status was mostly decoration — so it was easy to be confused about what a customer could actually see. We collapsed this into **one honest setting: Status.**

- **Active** = live on the site and buyable. (This is what "Published" used to mean.)
- **Draft** = a work-in-progress. Hidden from the site, can't be bought. **New products now start as Draft**, so nothing goes live by accident — you flip it to Active when it's ready.
- **Archived** = discontinued. Hidden from the site, can't be bought, but kept in your records.

We also closed a real hole: previously a Draft or Archived product could **still be purchased** if someone had it sitting in an old cart or hit the store's behind-the-scenes address directly — the checkout never actually re-checked whether the product was allowed to be sold. Now the checkout (and pre-orders) **refuse to sell anything that isn't Active**, so hidden products are genuinely un-buyable, not just hard to find.

In the **admin**, the confusing "Published" checkbox is gone. Every product row now has a quick **status menu** (the "⋯" on the right) to move it between Active / Draft / Archived without opening it, and the product page has a matching dropdown. The product list's filter tabs are now **All / Active / Draft / Archived** (the old "Unpublished" tab is gone).

**Why it matters:** one obvious control instead of two contradictory ones; new products can't leak onto the site before they're ready; and discontinued/draft items truly can't be sold.

### Files changed

| File | What changed |
|---|---|
| `supabase/migrations/20260707000000_product_status_visibility.sql` | **New migration.** Sets each existing product's Status from its old Published value (so nothing visible disappears and nothing hidden appears), makes new products default to **Draft**, switches the store's visibility rules to key off Status, and removes the old Published column. |
| `remote_schema.sql`, `apps/backend/db/iris_new_schema.sql` | Database reference snapshots updated to match the migration. |
| `apps/backend/src/products/products.service.ts` | Storefront now shows only **Active** products; removed the old publish toggle. |
| `apps/backend/src/products/products.controller.ts`, `dto/create-product.dto.ts`, `dto/query-products.dto.ts` | Removed the publish endpoint and the leftover "published" fields. |
| `apps/backend/src/orders/orders.service.ts` | **Checkout now rejects any item whose product isn't Active** (draft/archived/deleted) — the gap that let hidden products be bought via stale carts or direct calls. |
| `apps/backend/src/preorders/preorders.service.ts` | Pre-orders apply the same "must be Active" check. |
| `apps/admin/app/(dashboard)/products/page.tsx` | New per-row status menu; filter tabs are now All / Active / Draft / Archived. |
| `apps/admin/app/(dashboard)/products/[id]/page.tsx` | "Publish" button replaced with an Active/Draft/Archived status selector. |
| `apps/admin/app/components/products/ProductForm.tsx` | Removed the Published checkbox; Status is the single control, with a note explaining what each state does. |
| `apps/admin/lib/api/products.ts`, `apps/admin/lib/validation/product.ts`, `apps/admin/types/database.types.ts` | Dropped "published"; added a set-status action. |
| `apps/frontend/lib/api/products.server.ts`, `lib/api/products.ts`, `lib/validation/product.ts`, `types/database.types.ts`, `app/(shop)/product/[id]/page.tsx`, `app/(shop)/favourites/page.tsx` | Storefront no longer references the old "published" field. |
| `apps/allies/app/(dashboard)/inventory/page.tsx`, `app/(dashboard)/sales/page.tsx` | Ally screens now list only **Active** products. |

> **Heads-up / action required:**
> - **The database migration must be run** (`supabase/migrations/20260707000000_...`) before this goes out — it converts existing products and removes the old column. It's written to preserve exactly what's visible today: currently-live products become Active, currently-hidden ones become Draft.
> - After it runs, **new products start as Draft** — remember to set them to **Active** when they're ready to sell. (Anyone used to new products being live immediately should know this changed.)
> - Not yet done: the migration hasn't been applied to any database, and the flows haven't been driven end-to-end on a live server — that verification still needs doing.

### How to test

1. In admin, **create a new product** → it starts as **Draft** and does **not** appear on the store.
2. Set it to **Active** (via the product page dropdown or the row "⋯" menu) → it now shows on the site and can be added to cart and bought.
3. Set it to **Archived** (or back to Draft) → it disappears from the store, and trying to check out with it still in an old cart is **refused**.
4. Confirm the product list tabs **All / Active / Draft / Archived** filter correctly, and there's no "Published" checkbox anywhere.

---

## Pre-orders live inside the Orders page now (July 2026)

Pre-orders used to sit on their **own separate page**, and it caused two real headaches:

- An online order that was *actually a pre-order* showed up in Orders with **no products** — because the pre-ordered items were stored in a different place than normal order items, so the order looked empty.
- **Pop-up pre-orders** (taken in person, paid by cash/MoMo) never appeared in Orders at all — they only lived on the separate pre-orders page.

We've folded everything into **one unified Orders page**. The standalone Pre-orders page (and its sidebar link) is **gone** — you manage everything from Orders now.

**What you'll see:**

- Orders that contain pre-ordered items get a **"Pre-order" badge**, and pop-up pre-orders show a **"Pop-up" badge**. Pop-up pre-orders now appear in the orders list as their own orders, with all their items grouped together (even though behind the scenes each item was recorded separately).
- A new **"Pre-orders" filter button** shows only orders that contain pre-orders.
- Opening an order now shows the pre-ordered items **right in the items list**, each with its own status (Pending / Stock Held / Fulfilled) — so an order that used to look empty now shows what was actually bought.
- Every pre-order action lives on the order page: **Restock & Allocate, Mark Fulfilled, Refund, Cancel, and Resend Confirmation** — no more jumping to a separate screen.
- The cards at the top of Orders got a new **"Pre-orders Pending"** figure — the total value of pre-orders still waiting to be fulfilled, including pop-up money that was previously invisible on this page.

**On the customer side:** when a shopper tracks an order that includes pre-ordered items, those items now show up neatly in a **"Pre-order Items"** section with a note explaining they ship separately once restocked. Tracking a pop-up pre-order number that had several items now correctly shows **all** of them (before, it could error or show just one).

**Why it matters:** one place to see and manage every order, pre-orders included; no more "empty" orders; pop-up sales are finally visible alongside online ones; and the money-pending numbers actually account for pre-orders.

### Files changed

| File | What changed |
|---|---|
| `apps/backend/src/orders/orders.service.ts` | Orders list now merges real orders with **pop-up pre-order groups**; order detail can open a pop-up group by its PRE- number; the public order-tracking lookup now returns pre-order items (and handles multi-item pop-up numbers). |
| `apps/backend/src/orders/dto/query-orders.dto.ts` | Added the "only orders with pre-orders" filter option. |
| `apps/backend/src/payments/payments.service.ts` | The stats behind the top cards now include a **Pre-orders Pending** total (online + pop-up). |
| `apps/admin/app/(dashboard)/orders/page.tsx` | Pre-order / Pop-up badges, the new Pre-orders filter button, and the Pre-orders Pending card. |
| `apps/admin/app/(dashboard)/orders/[id]/page.tsx` | Pre-ordered items now show in the order's item list with per-item status and a full actions menu. |
| `apps/admin/app/components/preorders/PreorderControls.tsx` | **New** shared pieces (badges, action menu, and the Restock / Refund / Resend modals) reused on the order page. |
| `apps/admin/app/(dashboard)/preorders/page.tsx` | **Deleted** — the standalone pre-orders page is gone. |
| `apps/admin/app/components/Sidebar.tsx` | Removed the Preorders sidebar link. |
| `apps/admin/lib/api/preorders.ts`, `lib/api/orders.ts`, `lib/api/payments.ts` | Pre-order actions now refresh the Orders views and cards; supporting type updates. |
| `apps/frontend/app/(shop)/track/page.tsx`, `lib/api/orders.ts` | Customer track page shows a "Pre-order Items" section for orders that include pre-orders. |

> **Heads-up:**
> - The **Pop-up Sales** page is unchanged — you still record pop-up pre-orders there; they now *also* show up in Orders automatically.
> - The **CSV export** of orders doesn't yet include the pop-up pre-order groups — separate change if we want that.
> - Not yet done: this hasn't been driven end-to-end on a live server with real data — that click-through check still needs doing.

### How to test

1. In admin, open **Orders** — confirm the new **Pre-orders Pending** card shows a value, and click the **Pre-orders** filter to see only orders containing pre-orders.
2. Open an **online order that was a pre-order** (used to look empty) → its pre-ordered items now appear with status badges.
3. Open a **pop-up pre-order** (order number starts with `PRE-`) → all its items are grouped in one view, with the pre-order actions available.
4. From an order, try **Restock & Allocate**, **Mark Fulfilled**, **Refund**, **Cancel**, and **Resend Confirmation** — and confirm the order and the top cards update afterward.
5. On the storefront **/track** page, look up an order that includes pre-ordered items (and a `PRE-` pop-up number with several items) → confirm the pre-order items all show up neatly.

---

## Checkout now adds a 1.95% fee (and records it properly) (July 2026)

Checkout now charges a small **1.95% fee** on top of each order (this covers the payment-processing cost). Shoppers already saw a **"Fees (1.95%)"** line at checkout, but there was a gap: the customer was *charged* the fee, yet the order we saved in our system recorded the total **without** it. That meant our order records and revenue numbers were coming out about 1.95% lower than what actually landed in the Paystack account.

We've closed that gap. The saved order total now matches exactly what the customer pays, and the fee amount is stored on its own so we can always separate it back out later (e.g. if we want to see "net" revenue without the fee).

**What you'll see:**

- The **"Fees (1.95%)"** line now shows up everywhere an order breakdown appears — the checkout summary, the order confirmation page, the confirmation email to the customer, the staff notification email, and the admin order detail page.
- **Revenue reporting now reflects gross** — i.e. the full amount collected including the fee. Because the fee is stored separately, we can still calculate revenue without it whenever we want.

**Why it matters:** what we charge, what we record, and what Paystack collects are finally the same number — no more silent ~2% mismatch between the till and the books.

### Files changed

| File | What changed |
|---|---|
| `supabase/migrations/20260709000000_add_order_processing_fee.sql` | **New** — adds a `processing_fee` column to the orders table so the fee is stored per order. |
| `apps/backend/src/orders/orders.service.ts` | Order total is now calculated **including** the 1.95% fee, and the fee is saved on the order (both online and pending-order paths). |
| `apps/backend/src/email/email.service.ts` | Confirmation and staff emails now show a "Fees (1.95%)" line in the totals. |
| `apps/frontend/app/(shop)/checkout/CheckoutClient.tsx` | Tidied the fee logic to use a shared rate, and fixed a totals figure that wasn't showing decimals. |
| `apps/frontend/app/(shop)/checkout/confirmation/page.tsx` | Order confirmation page now shows the fee line. |
| `apps/frontend/lib/api/orders.ts`, `apps/admin/lib/api/orders.ts` | Order data now carries the `processing_fee` amount. |
| `apps/admin/app/(dashboard)/orders/[id]/page.tsx` | Admin order detail shows the fee line in the breakdown. |

> **Heads-up / action required:**
> - The **database migration must be run before this goes live.** Until the new `processing_fee` column exists, saving a new order will fail. It hasn't been applied to any database yet.
> - **Revenue figures will tick up ~1.95%** once this is live, because totals now include the fee. That's expected — it's gross revenue. The fee is stored separately if we ever want the "without fee" view.
> - Not yet driven end-to-end on a live server with a real payment — that click-through check still needs doing.

### How to test

1. Add something to cart and go to **checkout** → confirm the **Fees (1.95%)** line and that the **Total** equals subtotal + shipping − any discount + the fee.
2. Complete a test order → on the **confirmation page** and in the **confirmation email**, confirm the fee line appears and the total matches what was charged.
3. In **admin → Orders → open the order** → confirm the breakdown shows the **Fees (1.95%)** line and the total matches.
4. Sanity-check that the amount charged in **Paystack** equals the order **Total** we recorded (they should now be identical).

---

## Road to HQ counts pre-orders the moment they're placed (July 2026)

The **Road to HQ** unit counter on the homepage adds up every unit sold toward the goal — website orders, pop-up sales, and ally sales — plus a baseline for historical units. But **pre-orders weren't being counted at all**: a pre-ordered item lives in its own place (not as a normal order line), so it never made it into the tally, and it wouldn't have shown up until much later — if ever.

Now **a pre-order counts as soon as it's placed and paid**, not when it's eventually fulfilled and shipped. So the moment a customer pays for a pre-order, the homepage counter moves.

**What counts, exactly:** any **paid** pre-order that hasn't been **cancelled or refunded** — whether it's still waiting, has stock held for it, or is already fulfilled. Unpaid pre-orders (e.g. a pop-up pre-order recorded with payment still pending) don't count until they're paid, and cancelled/refunded ones drop back out. This matches how the rest of the counter already works — only real, paid sales count.

**Why it matters:** the counter now reflects genuine committed demand in real time. Pre-orders are money in and a firm sale; waiting until fulfillment to count them undercounted the road to HQ.

No double-counting: in-stock items and pre-order items are stored separately, so an order that mixes both has each part counted once.

### Files changed

| File | What changed |
|---|---|
| `apps/backend/src/analytics/analytics.service.ts` | The Road to HQ figure now also adds up **paid pre-order** quantities, alongside website / pop-up / ally units and the baseline. |
| `apps/backend/src/analytics/analytics.constants.ts` | Added the list of pre-order statuses that count (pending, stock-held, fulfilled) as the single source of truth. |
| `apps/frontend/lib/api/road-to-hq.server.ts` | The homepage data now includes a `preorders` breakdown number for consistency. |

> **Heads-up:**
> - The homepage counter refreshes a few times an hour (not instantly), so expect a short delay before a new pre-order shows up in the number.
> - No database change needed — this only changes how the number is *calculated*.

### How to test

1. Note the current **Road to HQ** number on the homepage.
2. Place (and pay for) a **pre-order** on the storefront.
3. After the homepage refreshes (within a few minutes), the counter should go **up by the quantity ordered** — without needing to fulfil the pre-order first.
4. **Cancel or refund** that pre-order → after the next refresh, the counter drops back down.

---

## Shipping to the US + prices shown in the customer's currency (July 2026)

Two connected checkout upgrades.

**1. We now ship to the United States.** US is selectable at checkout with a flat **GH₵ 900** shipping fee. Because a US address needs more than a Ghana one, checkout now asks for a **State / Province** and makes the street address and **ZIP code required** for any non-Ghana order. Phone numbers already worked internationally (pick the country flag, e.g. 🇺🇸 +1). International orders show a single flat-rate delivery line — the local Express / Pickup options only apply within Ghana.

The **shipping rates live in the database like the other fees**, and there's a new **"International Shipping Rates"** panel in **Settings → General** where staff can edit each country's name, delivery estimate, and price. Today it's just the US at GH₵ 900, but more countries can be added there later. The rate is also **enforced on the server** — the fee a customer is charged for a country is the one saved in settings, so it can't be fiddled with from the browser.

**2. Checkout prices now show in the shopper's chosen currency.** If a customer switches the site currency (say to USD or GBP), the entire checkout summary — item prices, subtotal, **shipping**, discount, fees, and total — now displays in that currency instead of always in cedis. Everything is still **stored and charged in Ghana Cedis** behind the scenes; only the on-screen numbers are converted. The small note that says **"You will be charged GH₵ …"** stays in cedis on purpose, so a shopper paying in another currency always sees the exact amount that will hit their card.

The customer's saved State now also appears on the order confirmation email to staff, the admin order detail page, and the customer's order-tracking page.

### Files changed

| File | What changed |
|---|---|
| `apps/backend/src/settings/settings.service.ts` | Stores/reads per-country shipping rates in settings (default: US = GH₵ 900); helper to look up a country's rate. |
| `apps/backend/src/settings/settings.controller.ts` | Public endpoint to read country rates + admin endpoint to update them. |
| `apps/backend/src/orders/orders.service.ts` | Shipping fee for international orders is now taken from the saved rate (server-enforced), not the browser. |
| `apps/backend/src/orders/dto/create-order.dto.ts` | Accepts the new optional **State** field on the shipping address. |
| `apps/backend/src/email/email.service.ts` | Staff order email now includes the State line in the address. |
| `apps/frontend/app/(shop)/checkout/CheckoutClient.tsx` | US enabled; State field + international address rules; flat international delivery line; all prices shown in the selected currency (charge note stays in cedis). |
| `apps/frontend/lib/api/settings.ts` | Fetches the country shipping rates for checkout. |
| `apps/frontend/lib/api/orders.ts`, `apps/frontend/app/(shop)/track/page.tsx` | Order data carries State; tracking page shows it. |
| `apps/admin/app/(dashboard)/settings/general/page.tsx` | New **International Shipping Rates** editor panel. |
| `apps/admin/lib/api/settings.ts` | Hooks to read/update country shipping rates. |
| `apps/admin/lib/api/orders.ts`, `apps/admin/app/(dashboard)/orders/[id]/page.tsx` | Order carries State; admin order detail shows it. |

> **Heads-up:**
> - **No database migration needed** — the rates are stored in the existing settings store and default to US = GH₵ 900 automatically, and the State is saved alongside the rest of the address.
> - **Only the US is switched on** right now. Canada / UK / Netherlands are still off until we set their rates and enable them.
> - Not yet driven end-to-end on a live server with a real US payment — that click-through check still needs doing.
> - Small cosmetic note: for cedi shoppers, prices now render as `₵1,234.00` (with the shared currency formatter) rather than the old `GH₵ 1,234` style.

### How to test

1. At checkout, change **Country / Region** to **United States** → the delivery line becomes the flat **GH₵ 900** international rate, and **State / Province** + **ZIP** appear and are required.
2. Try to continue with a US address missing the State or ZIP → it should block you with an error.
3. Switch the **site currency** (top bar) to USD/GBP → every price in the summary updates to that currency, but the **"You will be charged GH₵ …"** note still shows cedis.
4. Complete a US order and check the **admin order detail**, the **staff email**, and the customer **/track** page all show the State in the address.
5. In **admin → Settings → General → International Shipping Rates**, change the US price, save, and confirm checkout picks up the new amount.

---

## Auto currency detection + a "Select currency" welcome modal (July 2026)

When someone opens the site, we now **guess their best currency from their location** (using their device's timezone, which is hard to fake with a VPN) and switch prices to it automatically — Cedis for Ghana, Naira for Nigeria, USD for the US, CAD for Canada, AUD for Australia, GBP for the UK, and Euro for the rest of Europe. Anywhere we can't confidently place falls back to Cedis.

On a first visit **from outside Ghana**, a **"Select Currency" modal** pops up (once) with their detected currency already selected, so they can confirm or pick another. **Ghana visitors never see it** — they just get Cedis. It's a one-time prompt: once confirmed or dismissed it won't nag them again, and anyone who already picked a currency before is left alone.

The modal and the currency picker in the top bar were **redesigned to match the site's look** — the black-and-white, sharp-edged, spec-sheet style with wide-spaced type, instead of the rounded generic version. The modal shows all seven currencies (the six international ones in a grid, with Cedis as a full-width option at the bottom), and the selected one flips to a solid black tile. Per request, the top-bar currency selector and the modal use **Helvetica** for their text.

### Files changed

| File | What changed |
|---|---|
| `apps/frontend/lib/locale/locale-provider.tsx` | Added location→currency detection, first-visit auto-switch, and the once-only prompt logic (only for visitors outside Ghana). |
| `apps/frontend/lib/locale/CurrencyModal.tsx` | **New** "Select Currency" modal, styled to the site's black/white spec-sheet aesthetic, with the detected currency preselected and Cedis included. |
| `apps/frontend/app/(shop)/layout.tsx` | Redesigned the top-bar currency selector (sharp, hairline, Helvetica) to match. |
| `apps/frontend/app/(shop)/components/NavDrawer.tsx` | Mobile menu currency selector restyled to match the new look. |

> **Heads-up:**
> - **No backend or database changes** — this is all front-end, using the exchange rates the site already fetches.
> - The prompt is remembered per browser (via local storage), so clearing site data will make it appear again on the next visit from outside Ghana.
> - The mobile-menu selector was left on the site's mono (typewriter-style) font rather than Helvetica — easy to switch if we want it to match the top bar exactly.
> - Not yet eyeballed on a live server from a non-Ghana location — that visual check still needs doing (the modal only triggers outside Ghana).

### How to test

1. Open the site normally from Ghana → prices are in Cedis and **no modal** appears.
2. Simulate being abroad (change your computer's timezone to, e.g., America/Toronto, or use a browser profile set to another region) and open the site fresh → prices switch to that currency and the **Select Currency** modal appears with it preselected.
3. Pick a different currency and **Confirm** → prices update; reopen the site → the modal doesn't come back.
4. Try **Dismiss** / the ✕ / clicking outside → modal closes, currency stays as detected, and it won't reappear.
5. Check the **top-bar** and **mobile-menu** currency pickers → both show the new black/white styling and switch currency correctly.

---

## Customisable announcement banner (July 2026)

There's now a **banner strip at the very top of the storefront** — the kind big brands use for "Sale now on" or "Free shipping this week." It's fully controlled from admin, so no code changes are needed to put up a notice.

In **admin → Settings → General**, there's an **Announcement Banner** panel: a show/hide switch, the **text** to display, an optional **link** (makes the whole bar clickable, e.g. to the sale page), and a **live preview** of how it'll look. It's **off by default** — nothing shows until someone turns it on.

On the storefront the bar sits **above the navigation**, in the site's black-and-white style (black bar in light mode, white in dark), with a **✕ to dismiss**. If a shopper closes it, it stays closed for them — until the text is changed, at which point it shows again to everyone (so a new message isn't missed).

**A note on the fixes along the way:** getting the bar to sit cleanly above the nav on every page took a couple of passes. The header and the page content used to assume a fixed height, which pushed page content up underneath the bar on the products page and others. That's now handled by **measuring the header's real height** and spacing the page down by exactly that much, so it stays correct whether the banner is on or off, on any screen size.

### Files changed

| File | What changed |
|---|---|
| `apps/backend/src/settings/settings.service.ts` | Stores/reads the banner (on/off, text, link) in settings; validates that an enabled banner has text. |
| `apps/backend/src/settings/settings.controller.ts` | Public endpoint to read the banner + admin endpoint to update it. |
| `apps/frontend/lib/api/settings.ts` | Storefront fetches the banner. |
| `apps/frontend/app/(shop)/layout.tsx` | The banner bar itself (above the nav, dismissible, theme-aware) plus the header-height measurement that keeps page content clear of it. |
| `apps/admin/lib/api/settings.ts` | Admin hooks to read/update the banner. |
| `apps/admin/app/(dashboard)/settings/general/page.tsx` | New **Announcement Banner** editor panel with live preview. |

> **Heads-up:**
> - **No backend or database changes** to run — it's stored in the existing settings, off by default.
> - Dismissal is remembered per browser (via local storage); it re-appears if the text is edited or the visitor clears their site data.
> - **Known minor issue:** on desktop, two "sticky" side panels (the product detail page's thumbnail rail and the Road to HQ progress card) are pinned to a fixed position and will sit ~36px too high while a banner is showing. Cosmetic, and only when a banner is active — can be fixed on request.
> - Not yet clicked through on a live server with a banner enabled — that visual check still needs doing.

### How to test

1. In **admin → Settings → General → Announcement Banner**, tick **Show the banner**, type a message (and optionally a link), watch the **preview**, and **Save**.
2. Open the storefront → the bar appears at the very top, above the nav, on the home page **and** inner pages (products, etc.), with content sitting neatly below it.
3. Click the **✕** → the bar closes and stays closed on refresh.
4. Change the banner **text** in admin and save → it reappears for everyone (even those who dismissed the old one).
5. If you set a **link**, click the bar → it navigates there.
6. Turn the banner **off** in admin → it disappears and page spacing returns to normal.

---

## Homepage Navbar — Fixed the White Bar on First Load (July 2026)

We chased down a bug where, on the **live site**, the homepage navbar showed a solid white (or dark) bar the moment the page loaded — even when you were sitting right at the top over the hero image, where it's meant to be see-through. The odd tell: if you clicked away to another page and came back, it fixed itself and rendered correctly. It also never showed up when running the site on a developer's own machine, only on the real deployed site — which is exactly why it slipped through.

The cause was a timing quirk. The navbar decides "am I scrolled down far enough to turn solid?" by comparing your scroll position against the height of the screen. On the very first render of the live site, the browser sometimes hadn't finished measuring the screen height yet, so that measurement came back as effectively zero. That made the math think you'd already scrolled past the hero, so it painted the solid bar. Coming back to the page later re-ran the check once the screen height was known, which is why it "healed" itself.

The fix hardens that check so it can't be fooled by a not-yet-measured screen: it now falls back to a second way of reading the screen height, refuses to ever treat "top of page" as "scrolled," and re-checks itself one beat after the page paints so a bad first reading corrects on the same load — no click-away-and-back needed. The see-through-over-hero look and the snap-to-solid-on-scroll behaviour are unchanged.

### Files changed

| File | What changed |
| --- | --- |
| `apps/frontend/app/(shop)/layout.tsx` | Hardened the navbar's scroll check: safe screen-height reading with a fallback, a floor so the top of the page never counts as "scrolled," plus a re-measure after first paint and on window resize. |

> **Heads-up:** This one only reproduces on a **production build**, not `npm run dev`. To see it for yourself, run a real build (`npm run build` then `npm run start`) or check a deploy preview — the dev server hides the bug.

### How to test

1. Run a production build of the storefront (`cd apps/frontend && npm run build && npm run start`) or open a deploy preview.
2. Hard-refresh the homepage while at the very top → the navbar should be **transparent** over the hero (white logo/text), with no solid bar flashing in. Try it in both light and dark mode, and on a narrow phone-width window.
3. Scroll down past the hero → the navbar snaps to solid white/dark with a bottom border, as before.
4. Click to another page and back to home → still transparent at the top, same as the first load.

## Homepage Navbar — Fixed the Invisible Dark Text When Returning to Road to HQ (July 2026)

A follow-on to the fix above. On the **live site**, coming *back* to the Road to HQ (home) page — by clicking a link or using the browser's Back button — the navbar background correctly went see-through over the dark hero, but the menu text, logo and icons stayed **dark**, so they nearly vanished against the dark image. It looked broken until you scrolled down and back up, which snapped them back to white. It happened in both light and dark mode and only on the real deployed site, not on a developer's machine.

The root cause was that the navbar made two *separate* decisions from two different signals: one for "should the background be see-through?" and another for "should the text be white?". On the way back to the homepage those two could briefly disagree — see-through background, but dark text — and get stuck that way until the next scroll nudged them back in sync.

The fix makes both decisions come from **one** signal: the navbar now simply watches the actual hero image on the page and asks "am I sitting over it right now?". Background colour and text colour both follow that single answer, so they can no longer drift apart — no more invisible text, and no need to scroll to fix it. As a side effect the guesswork around screen height (the thing behind the earlier bug too) is gone entirely.

One intentional change to note: on non-homepage pages (About, product pages, etc.) the navbar now shows a solid bar right from the top instead of a see-through one over the page content. That's the cleaner, more readable default; flag it if you preferred the old see-through look on those pages.

### Files changed

| File | What changed |
| --- | --- |
| `apps/frontend/app/(shop)/layout.tsx` | Navbar now derives both its background and its text/logo/icon colour from a single "am I over the hero?" flag, driven by watching the real hero element (an IntersectionObserver) instead of guessing from the page URL + screen height. |
| `apps/frontend/app/(shop)/RoadToHQClient.tsx` | Tagged the hero section with an id so the navbar can watch it. |

> **Heads-up:** Like the previous navbar fix, this only reproduces on a **production build**, not `npm run dev`. Use a real build (`npm run build` then `npm run start`) or a deploy preview to see it.

### How to test

1. Run a production build of the storefront (`cd apps/frontend && npm run build && npm run start`) or open a deploy preview.
2. From the homepage, go to another page (About, or a product), then return to Road to HQ — via the logo/"Road to HQ" link **and** via the browser Back button. The navbar should be transparent with **white** text/logo/icons over the hero *immediately*, with no dark/invisible text and no need to scroll. Check both light and dark mode.
3. Scroll down past the hero → navbar snaps to solid with dark text; scroll back up → transparent + white again.
4. Visit a non-homepage page (About, Products) → navbar is a solid, readable bar from the top.

---

## Order & Pre-order Emails/SMS — Fulfilment Copies, On-Brand Design, and Reliable Pre-order Texts (July 2026)

We tightened up all the automatic messages that go out when someone buys or pre-orders, so nothing slips through the cracks and every email looks like it actually came from 1NRI.

Three things were off:

- **Pre-orders weren't telling the fulfilment team.** When a customer placed a pre-order on the site, they got their confirmation email, but nobody at `orders@1nri.store` got a heads-up. Normal orders already sent that staff copy; pre-orders now do too.
- **Pre-order confirmation texts often never sent.** The SMS only went out if the shopper had a phone number saved on their account. Anyone who just typed their number in at checkout got no text. Now it uses the number from checkout first, and falls back to the account number — so the text actually sends.
- **The staff "New Order" email looked off-brand.** It had a big "IRIS" wordmark and an orange badge that didn't match the site at all. It now uses the 1NRI logo and the same clean black-and-white look as the customer emails.

While in there we also **centered the 1NRI logo** at the top of every email (it was hugging the left edge), added a matching on-brand **"New Pre-order" email** for the fulfilment team, and did a pass to make sure there are **no stray em dashes** in any email or text message.

### Files changed

| File | What changed |
| --- | --- |
| `apps/backend/src/email/email.service.ts` | Redesigned the staff "New Order" email to use the 1NRI logo + monochrome style; added a new on-brand "New Pre-order" fulfilment email; centered the logo in all email headers; made `orders@1nri.store` the default fulfilment address; cleaned up a stray dash character. |
| `apps/backend/src/preorders/preorders.service.ts` | Pre-orders now also email the fulfilment team; pre-order confirmation texts now use the checkout phone number (falling back to the account number) so they reliably send. |

> **Heads-up:** Fulfilment emails go to `orders@1nri.store` (set via the `STAFF_FULFILLMENT_EMAIL` setting, which now defaults to that address). No new setup needed if that inbox already exists.

### How to test

1. Place a **pre-order** through the site checkout. You should see three messages: the customer confirmation email, a "New Pre-order" email at `orders@1nri.store`, and a confirmation **text** to the phone number entered at checkout.
2. Place a **normal order**. The `orders@1nri.store` "New Order" email should now show the **1NRI logo** (centered, no "IRIS" or orange badge) and match the customer email's look.
3. Open any of these emails and confirm the logo sits **centered** at the top.

---

## Bundle Products Count Extra Toward Road to HQ (July 2026)

Some products are bundles (like a 2-piece set), and selling one should move the Road to HQ counter by more than one. Until now every item sold counted as exactly 1, so bundles were quietly under-counting our progress.

Now each product has a "counts as N units" setting. Mark a product as a bundle in the admin and choose how many units each sale should add to the goal (2 for a two-piece, 3 for a three-pack, and so on). Regular products stay at 1 and behave exactly as before.

Two things worth knowing:

- This multiplier **only** affects the public Road to HQ counter on the homepage. It does **not** touch stock levels, sales revenue, or any other report, so the numbers the team relies on for money and inventory stay accurate.
- It applies across every sales channel: online orders, pop-up sales, ally sales, and pre-orders.

To set it: open a product in the admin, find the **Merchandising** section, tick **"Bundle (counts as multiple units)"**, and enter the number.

### Files changed

| File | What changed |
| --- | --- |
| `supabase/migrations/20260710193914_add_products_hq_unit_count.sql` | New database column `hq_unit_count` on products (defaults to 1) that stores how many units a product counts for. |
| `apps/backend/src/analytics/analytics.service.ts` | The Road to HQ counter now multiplies each sale by that product's unit count. No other report was changed. |
| `apps/backend/src/products/dto/create-product.dto.ts` | Lets the admin save the new bundle count when creating/editing a product. |
| `apps/admin/app/components/products/ProductForm.tsx` | Added the "Bundle" checkbox + number input in the Merchandising section. |
| `apps/admin/lib/validation/product.ts`, `apps/admin/lib/api/products.ts`, `apps/frontend/types/database.types.ts` | Wiring/validation/type updates so the new field flows through cleanly. |

> **Heads-up / action required:** The database migration must be run before this goes live (it adds the new column the counter reads). If the migration hasn't been applied yet, the Road to HQ figure will error, so deploy the migration and the backend together.

### How to test

1. Apply the migration, then in the admin edit a product, tick **Bundle**, set it to **2**, and save.
2. Place (or seed) a paid order of quantity 1 for that product.
3. Check the homepage Road to HQ counter (or `GET /api/analytics/road-to-hq`) - it should go up by **2**, not 1. The counter refreshes a few times an hour, so allow a short delay.
4. Confirm other reports (e.g. top products) still show the real quantity of 1 for that product - only Road to HQ is weighted.
