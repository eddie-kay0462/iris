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

*Last updated: 2026-03-16*