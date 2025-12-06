-- ============================================================
-- EXIMLEY – MULTI-TENANT SaaS SCHEMA
-- Version: v1.0.2 (fixed for Supabase/Postgres)
-- ============================================================


-- ============================================================
-- SECTION A — MULTI-TENANCY ROOT TABLES
-- ============================================================

create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text,
    gst text,
    iec text,
    logo_url text,
    contact_email text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.company_users (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('admin','executive','viewer')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_company_users_company on public.company_users(company_id);
create index if not exists idx_company_users_user on public.company_users(user_id);
create unique index if not exists unique_company_user on public.company_users(company_id, user_id);



-- ============================================================
-- SECTION A.1 — USER PROFILES
-- ============================================================

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    phone text,
    avatar_url text,
    job_title text,
    timezone text,
    last_login timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);



-- ============================================================
-- SECTION B — CONFIGURATION (HSN + SKUs)
-- ============================================================

create table if not exists public.company_hsn (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    hsn_code text not null,
    description text,
    gst_rate numeric,
    duty_rate numeric,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_hsn_company on public.company_hsn(company_id);

create table if not exists public.skus (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    sku_code text not null,
    name text not null,
    description text,
    unit text,
    hsn_code text,
    base_price numeric,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_sku_company on public.skus(company_id);
create unique index if not exists sku_unique_per_company on public.skus(company_id, sku_code);



-- ============================================================
-- SECTION C — SHIPMENTS + ITEMS
-- ============================================================

create table if not exists public.shipments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    created_by uuid references auth.users(id) on delete set null,
    type text check (type in ('import','export')),
    status text default 'draft',
    buyer_name text,
    supplier_name text,
    reference_no text,
    tracking_number text,
    carrier text,
    incoterm text,
    incoterm_place text,
    total_packages numeric,
    total_weight numeric,
    eta timestamptz,
    etd timestamptz,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_shipments_company on public.shipments(company_id);

create table if not exists public.shipment_items (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    shipment_id uuid not null references public.shipments(id) on delete cascade,
    sku_id uuid not null references public.skus(id) on delete restrict,
    quantity numeric not null,
    unit_price numeric,
    currency text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_items_company on public.shipment_items(company_id);
create index if not exists idx_items_shipment on public.shipment_items(shipment_id);



-- ============================================================
-- SECTION D — DOCUMENTS
-- ============================================================

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    shipment_id uuid not null references public.shipments(id) on delete cascade,
    doc_type text,
    file_url text not null,
    created_by uuid references auth.users(id) on delete set null,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_docs_company on public.documents(company_id);
create index if not exists idx_docs_shipment on public.documents(shipment_id);



-- ============================================================
-- SECTION E — COST SHEETS
-- ============================================================

create table if not exists public.cost_sheets (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    shipment_id uuid not null references public.shipments(id) on delete cascade,
    hsn_code text,
    product_cost numeric,
    freight numeric,
    insurance numeric,
    duty_percentage numeric,
    duty_amount numeric,
    total_landed_cost numeric,
    margin numeric,
    currency text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_cost_company on public.cost_sheets(company_id);
create index if not exists idx_cost_shipment on public.cost_sheets(shipment_id);



-- ============================================================
-- SECTION F — TRACKING, TASKS, COMMENTS
-- ============================================================

create table if not exists public.tracking_events (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    shipment_id uuid not null references public.shipments(id) on delete cascade,
    event_name text,
    event_description text,
    location text,
    event_time timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_track_company on public.tracking_events(company_id);
create index if not exists idx_track_shipment on public.tracking_events(shipment_id);

create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    shipment_id uuid not null references public.shipments(id) on delete cascade,
    assigned_to uuid references auth.users(id) on delete set null,
    description text,
    status text default 'todo',
    due_date timestamptz,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_tasks_company on public.tasks(company_id);
create index if not exists idx_tasks_shipment on public.tasks(shipment_id);

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    shipment_id uuid not null references public.shipments(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    message text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_comments_company on public.comments(company_id);
create index if not exists idx_comments_shipment on public.comments(shipment_id);



-- ============================================================
-- SECTION G — ENABLE RLS
-- ============================================================

alter table public.companies        enable row level security;
alter table public.company_users    enable row level security;
alter table public.profiles         enable row level security;
alter table public.company_hsn      enable row level security;
alter table public.skus             enable row level security;
alter table public.shipments        enable row level security;
alter table public.shipment_items   enable row level security;
alter table public.documents        enable row level security;
alter table public.cost_sheets      enable row level security;
alter table public.tracking_events  enable row level security;
alter table public.tasks            enable row level security;
alter table public.comments         enable row level security;



-- ============================================================
-- SECTION H — RLS POLICIES (SELECT ONLY)
-- Note: DROP OLD POLICIES IF THEY EXIST, THEN CREATE FRESH
-- ============================================================

-- Cleanup existing policies (safe to run multiple times)
drop policy if exists "companies_select_own"              on public.companies;
drop policy if exists "company_users_select_same_company" on public.company_users;
drop policy if exists "profiles_select_own"               on public.profiles;
drop policy if exists "company_hsn_select_same_company"   on public.company_hsn;
drop policy if exists "skus_select_same_company"          on public.skus;
drop policy if exists "shipments_select_same_company"     on public.shipments;
drop policy if exists "shipment_items_select_same_company"on public.shipment_items;
drop policy if exists "documents_select_same_company"     on public.documents;
drop policy if exists "cost_sheets_select_same_company"   on public.cost_sheets;
drop policy if exists "tracking_events_select_same_company" on public.tracking_events;
drop policy if exists "tasks_select_same_company"         on public.tasks;
drop policy if exists "comments_select_same_company"      on public.comments;


-- H1. COMPANIES
create policy "companies_select_own"
on public.companies
for select
using (
    id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H2. COMPANY_USERS
create policy "company_users_select_same_company"
on public.company_users
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H3. PROFILES (user can only see own profile)
create policy "profiles_select_own"
on public.profiles
for select
using (
    user_id = auth.uid()
);

-- H4. COMPANY_HSN
create policy "company_hsn_select_same_company"
on public.company_hsn
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H5. SKUS
create policy "skus_select_same_company"
on public.skus
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H6. SHIPMENTS
create policy "shipments_select_same_company"
on public.shipments
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H7. SHIPMENT ITEMS
create policy "shipment_items_select_same_company"
on public.shipment_items
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H8. DOCUMENTS
create policy "documents_select_same_company"
on public.documents
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H9. COST SHEETS
create policy "cost_sheets_select_same_company"
on public.cost_sheets
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H10. TRACKING EVENTS
create policy "tracking_events_select_same_company"
on public.tracking_events
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H11. TASKS
create policy "tasks_select_same_company"
on public.tasks
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- H12. COMMENTS
create policy "comments_select_same_company"
on public.comments
for select
using (
    company_id in (
        select company_id from public.company_users
        where user_id = auth.uid()
    )
);

-- ============================================================
-- END OF EXIMLEY SCHEMA v1.0.2 (FIXED)
-- ============================================================
