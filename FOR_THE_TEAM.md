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
- `supabase/migrations/` — Database migrations (managed via CLI)

### Want to Test It Yourself?

**Step 1: Make sure you have the basics from Day 1-2.**

You need `.env.local` in `apps/frontend/` with your Supabase credentials. If you don't have this yet, go back to Day 1-2's setup instructions.

**Step 2: Install the Supabase CLI.**

We switched from pasting SQL in the web editor to using proper migrations. You'll need the Supabase CLI:

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm (works everywhere)
npm install -g supabase
```

Verify it's installed:
```bash
supabase --version
```

**Step 3: Get an access token and link the project.**

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token", give it a name like "iris-dev"
3. Copy the token and add it to your `.env.local`:
   ```
   SUPABASE_ACCESS_TOKEN=your_token_here
   ```

4. Link to the project:
   ```bash
   cd apps/frontend
   set -a && source .env.local && set +a
   npm run db:link
   ```

**Step 4: Apply migrations.**

The migration for the profile INSERT policy needs to be applied:
```bash
npm run db:push
```

**Step 5: Start the server and run the tests.**

```bash
# Terminal 1: Start the dev server
cd apps/frontend
npm run dev

# Terminal 2: Run the auth API tests
cd apps/frontend
bash scripts/test-auth-api.sh
```

You should see 16 tests pass.

### Supabase CLI Commands Reference

For future reference, here are the migration commands:
```bash
npm run db:push:dry   # Preview what would be applied
npm run db:push       # Apply migrations to remote database
npm run db:new xyz    # Create a new migration file called xyz
```

### What the Test Script Checks

The `scripts/test-auth-api.sh` script runs 16 tests:
- Signup with valid/invalid data
- Login with correct/wrong credentials
- Profile access with/without authentication
- Profile updates (and verifies you can't change your own role)
- Password reset flow
- Logout and session invalidation

If any test fails, the script will show you exactly what went wrong.

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

**"supabase: command not found"** — You need to install the Supabase CLI. See Step 2 above.

**"You need to be logged in"** or **"Not logged in"** when running migrations — Your access token isn't loaded. Run:
```bash
set -a && source .env.local && set +a
```
Then try again.

**"Project ref is required"** — The project isn't linked. Run `npm run db:link` first.

**"new row violates row-level security policy"** — The migration hasn't been applied. Run `npm run db:push`.

**Profile not being created during signup** — Same issue. Run `npm run db:push`.

**"Authentication required" on profile route** — You need to be logged in. Make sure your login request succeeded and you're including cookies in your curl request (`-b cookies.txt`).

### Next Up

- Week 1, Day 5: Test the full auth flow end-to-end
- Week 2: Start building Products & Inventory API

---

*Last updated: February 2025*
