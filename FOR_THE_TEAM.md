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

*Last updated: February 2025*
