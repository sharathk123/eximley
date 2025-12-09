-- COMPLETE RESET of Super Admin User
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Grant Permissions (Fixes "Database error querying schema" potential causes)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Delete existing Admin User (Clean Slate)
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@eximley.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Delete from public tables (Cascades usually handle this, but explicit is safer)
        DELETE FROM public.company_users WHERE user_id = v_user_id;
        DELETE FROM public.user_profiles WHERE id = v_user_id;
        DELETE FROM public.ai_hsn_suggestions WHERE created_by = v_user_id;
        
        -- Delete from auth.users coverage
        DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
END $$;

-- 3. Re-create Admin User
DO $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
BEGIN
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'admin@eximley.com',
        crypt('Admin123!', gen_salt('bf')), -- Password: Admin123!
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Super Admin"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO v_user_id;

    -- Create Profile (if trigger didn't catch it)
    INSERT INTO public.user_profiles (id, full_name)
    VALUES (v_user_id, 'Super Admin')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Super Admin';

    -- Ensure Company
    SELECT id INTO v_company_id FROM public.companies WHERE legal_name = 'Eximley Global';
    
    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (
            legal_name, trade_name, email, is_super_admin_company, status, country
        ) VALUES (
            'Eximley Global', 'Eximley Admin', 'admin@eximley.com', true, 'active', 'India'
        ) RETURNING id INTO v_company_id;
    END IF;

    -- Link User to Company
    INSERT INTO public.company_users (
        company_id, user_id, role, is_super_admin, force_password_change
    ) VALUES (
        v_company_id, v_user_id, 'owner', true, false
    );
    
END $$;

-- 4. Reload Config
NOTIFY pgrst, 'reload config';
