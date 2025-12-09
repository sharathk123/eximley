-- Grant permissions to standard Supabase roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant auth schema usage just in case (though usually restricted)
-- GRANT USAGE ON SCHEMA auth TO service_role; 
-- (Better not to mess with auth schema permissions unless necessary)

-- Force refresh of schema cache (if using PostgREST)
NOTIFY pgrst, 'reload config';
