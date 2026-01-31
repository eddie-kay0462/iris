# Iris

E-commerce platform with an "Inner Circle" subscription membership tier.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Database/Auth:** Supabase (PostgreSQL)
- **State:** Zustand + React Query
- **Forms:** React Hook Form + Zod
- **Payments:** Paystack
- **SMS:** Termii API
- **Styling:** Tailwind CSS 4

## Getting Started

```bash
npm install
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SMS_PROVIDER_API_KEY=
SMS_SENDER_ID=
```

## Architecture

### Route Groups

| Route Group | Purpose |
|-------------|---------|
| `app/(auth)/` | User authentication (login, signup) |
| `app/(dashboard)/` | Customer dashboard (inner-circle, waitlist) |
| `app/(shop)/` | Shop pages (products, cart, checkout) |
| `app/admin/(auth)/` | Admin login |
| `app/admin/(dashboard)/` | Admin management panel |

### Supabase Clients

Three client patterns in `lib/supabase/`:

- `client.ts` - Browser client for client components
- `server.ts` - Server client for Server Components and Route Handlers
- `middleware.ts` - Auth cookie management

### Database Schema

Key tables in `types/database.types.ts`:

- `profiles` - Users with subscription info
- `products` - Dual pricing (`public_price`, `inner_circle_price`)
- `orders` / `order_items` - Order management
- `waitlist` - Inner Circle waitlist with priority scoring
- `inner_circle_invitations` - Invitation tokens

### External Integrations

- **Paystack** - Webhook at `app/api/webhooks/paystack/route.ts`
- **Termii SMS** - Templates in `lib/sms/termii.ts`
