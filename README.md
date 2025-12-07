# Eximley - Multi-tenant Import/Export SaaS

## Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, ShadCN UI
- **Backend**: Supabase (Auth, Postgres, Storage)
- **API**: Next.js Route Handlers (Server-side Only)

## Setup Instructions

1. **Clone & Install**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create `.env.local`:
   ```env
   SUPABASE_URL=https://rsmnazjdqumqdsmlvzar.supabase.com
   SUPABASE_ANON_SECRET=<server-only-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
   ```

3. **Database Setup**
   - Run the SQL schema in `supabase/schema.sql` via Supabase SQL Editor.
   - Ensure Storage bucket `documents` exists.

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Architecture Notes
- **Security**: Supabase keys are NEVER exposed to the client. The frontend uses an internal API layer (`/api/...`) which communicates with Supabase using server-side clients.
- **Multi-tenancy**: All data is scoped by `company_id`. RLS policies enforce isolation.
- **PDF Generation**: Uses `pdf-lib` via server-side Route Handler.

## Access
- **Signup**: `/signup`
- **Dashboard**: `/dashboard`
