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

**Built the customer authentication API.** Here's what we added:

1. **User signup** (`/api/auth/signup`) — New users can create accounts with email and password. Also stores their name and optional phone number.

2. **User login** (`/api/auth/login`) — Returns the user's info including their role. Sets the session cookie so they stay logged in.

3. **User logout** (`/api/auth/logout`) — Signs out the current user. Works for both regular users and admins.

4. **Password reset** (`/api/auth/reset-password`) — Sends a password reset email. Security feature: always returns success (doesn't reveal if email exists).

5. **Auth callback** (`/api/auth/callback`) — Handles redirects from Supabase after email confirmation or password reset.

6. **Profile management** (`/api/profile`) — GET to read your profile, PUT to update it. Protected route — only works when logged in.

### Files Created

- `apps/frontend/app/api/auth/signup/route.ts` — User registration
- `apps/frontend/app/api/auth/login/route.ts` — User login
- `apps/frontend/app/api/auth/logout/route.ts` — User logout
- `apps/frontend/app/api/auth/reset-password/route.ts` — Password reset request
- `apps/frontend/app/api/auth/callback/route.ts` — Auth redirect handler
- `apps/frontend/app/api/profile/route.ts` — Profile GET/PUT
- `apps/frontend/scripts/test-auth-api.sh` — Test script

### Want to Verify It Works?

**Prerequisites:** You need `.env.local` set up from Day 1-2. If you don't have that yet, go back and do that first.

**Run the tests:**
```bash
# Terminal 1: Start the dev server
cd apps/frontend
npm run dev

# Terminal 2: Run the test script
cd apps/frontend
bash scripts/test-auth-api.sh
```

You should see **16 tests pass**. That's it — the auth API is working.

### What the Tests Cover

- Signup with valid/invalid data
- Login with correct/wrong credentials
- Profile access with/without authentication
- Profile updates (and verifies you can't escalate your own role)
- Password reset flow
- Logout and session invalidation

### API Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create new user |
| `/api/auth/login` | POST | Log in existing user |
| `/api/auth/logout` | POST | Sign out current user |
| `/api/auth/reset-password` | POST | Request password reset email |
| `/api/auth/callback` | GET | Handle Supabase redirects |
| `/api/profile` | GET | Get current user's profile |
| `/api/profile` | PUT | Update current user's profile |

### Something Not Working?

**Tests failing with connection errors** — Make sure the dev server is running in another terminal.

**"Authentication required" on profile route** — The login step failed. Check the test output to see what went wrong with login.

### Next Up

- Week 1, Day 5: Test the full auth flow end-to-end
- Week 2: Start building Products & Inventory API

---

*Last updated: February 2025*
