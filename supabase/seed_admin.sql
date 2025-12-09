-- Reseed Super Admin (Safe run)
-- 1. Ensure User Exists or Update Password
DO $$
DECLARE
    new_user_id UUID;
    existing_user_id UUID;
    new_company_id UUID;
BEGIN
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@eximley.com';
    
    IF existing_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@eximley.com',
            crypt('Admin123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW()
        )
        RETURNING id INTO new_user_id;

        -- Profile
        INSERT INTO public.user_profiles (id, full_name)
        VALUES (new_user_id, 'Super Admin')
        ON CONFLICT (id) DO NOTHING;
    ELSE
        new_user_id := existing_user_id;
        -- RESET PASSWORD
        UPDATE auth.users 
        SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
            updated_at = NOW(),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = new_user_id;
    END IF;

    -- 2. Ensure Company Exists
    SELECT id INTO new_company_id FROM public.companies WHERE legal_name = 'Eximley Global';
    
    IF new_company_id IS NULL THEN
        INSERT INTO public.companies (
            legal_name,
            trade_name,
            email,
            is_super_admin_company,
            status,
            country
        )
        VALUES (
            'Eximley Global',
            'Eximley Admin',
            'admin@eximley.com',
            true,
            'active',
            'India'
        )
        RETURNING id INTO new_company_id;
    END IF;

    -- 3. Link User to Company as Owner/SuperAdmin
    INSERT INTO public.company_users (
        company_id,
        user_id,
        role,
        is_super_admin,
        force_password_change
    )
    VALUES (
        new_company_id,
        new_user_id,
        'owner',
        true,
        false -- Set to false to avoid immediate change prompt if not desired during dev
    )
    ON CONFLICT (company_id, user_id) 
    DO UPDATE SET 
        role = 'owner', 
        is_super_admin = true;

END $$;
