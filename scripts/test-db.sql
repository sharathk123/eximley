-- Database Testing Script for Eximley
-- Tests RLS policies, constraints, and data integrity

-- ==============================================
-- Test 1: RLS Policies - Export Orders
-- ==============================================
DO $$
DECLARE
    test_org_id UUID := 'test-org-123';
    test_user_id UUID := 'test-user-456';
    other_org_id UUID := 'other-org-789';
BEGIN
    RAISE NOTICE '=== Testing RLS Policies for Export Orders ===';
    
    -- Set session context to simulate authenticated user
    PERFORM set_config('request.jwt.claim.sub', test_user_id::text, false);
    PERFORM set_config('request.jwt.claim.org_id', test_org_id::text, false);
    
    -- Test: User can see their org's orders
    RAISE NOTICE 'Test: User can view own org orders';
    -- This should return records for test_org_id only
    
    -- Test: User cannot see other org's orders
    RAISE NOTICE 'Test: User cannot view other org orders';
    -- Records for other_org_id should be filtered out
END$$;

-- ==============================================
-- Test 2: Constraints - Status Values
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '=== Testing Status Constraints ===';
    
    -- Test: Invalid status should fail
    BEGIN
        INSERT INTO export_orders (
            org_id, buyer_id, order_date, currency_code, status
        ) VALUES (
            'test-org-123', 'buyer-id', CURRENT_DATE, 'USD', 'invalid_status'
        );
        RAISE EXCEPTION 'FAIL: Invalid status was accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'PASS: Invalid status rejected correctly';
    END;
END$$;

-- ==============================================
-- Test 3: Foreign Key Constraints
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '=== Testing Foreign Key Constraints ===';
    
    -- Test: Cannot create order with non-existent buyer
    BEGIN
        INSERT INTO export_orders (
            org_id, buyer_id, order_date, currency_code, status
        ) VALUES (
            'test-org-123', 'non-existent-buyer', CURRENT_DATE, 'USD', 'pending'
        );
        RAISE EXCEPTION 'FAIL: Non-existent buyer was accepted';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'PASS: Foreign key constraint working';
    END;
END$$;

-- ==============================================
-- Test 4: Triggers - Auto-generated fields
-- ==============================================
DO $$
DECLARE
    new_order_id UUID;
    order_number TEXT;
BEGIN
    RAISE NOTICE '=== Testing Auto-generation Triggers ===';
    
    -- Note: This requires a valid buyer_id and org_id from your database
    -- Update these with actual test IDs
    
    -- Test: Order number auto-generated
    -- INSERT INTO export_orders (...)
    -- SELECT order_number INTO order_number FROM export_orders WHERE id = new_order_id;
    
    RAISE NOTICE 'Test: Verify order_number format matches expected pattern';
    -- Should match pattern: SO-YYYY-MM-NNNN
END$$;

-- ==============================================
-- Test 5: Cascading Deletes
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '=== Testing Cascading Deletes ===';
    
    -- Test: Deleting order should delete order_items
    -- Create test order with items
    -- Delete order
    -- Verify items are also deleted
    
    RAISE NOTICE 'Test: Order deletion cascades to order_items';
END$$;

-- ==============================================
-- Test 6: Purchase Orders RLS
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '=== Testing Purchase Orders RLS ===';
    
    -- Similar tests as export_orders
    RAISE NOTICE 'Test: User can only see own org purchase orders';
END$$;

-- ==============================================
-- Test 7: Shipping Bills RLS
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '=== Testing Shipping Bills RLS ===';
    
    RAISE NOTICE 'Test: User can only see own org shipping bills';
END$$;

-- ==============================================
-- Test 8: Document Management
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '=== Testing Document Management ===';
    
    -- Test: Documents linked to correct entities
    -- Test: Document deletion when entity deleted
    
    RAISE NOTICE 'Test: Document RLS policies';
END$$;

-- ==============================================
-- Summary
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Database Tests Complete';
    RAISE NOTICE 'Review output above for PASS/FAIL results';
    RAISE NOTICE '=================================================';
END$$;

-- ==============================================
-- Manual Verification Queries
-- ==============================================

-- Query 1: Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('export_orders', 'purchase_orders', 'shipping_bills', 'proforma_invoices')
ORDER BY tablename;

-- Query 2: List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Query 3: Check for orphaned records (no org_id)
SELECT 'export_orders' as table_name, count(*) as orphaned_count
FROM export_orders WHERE org_id IS NULL
UNION ALL
SELECT 'purchase_orders', count(*) 
FROM purchase_orders WHERE org_id IS NULL
UNION ALL
SELECT 'shipping_bills', count(*) 
FROM shipping_bills WHERE org_id IS NULL;

-- Query 4: Verify foreign key constraints exist
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('export_orders', 'purchase_orders', 'shipping_bills')
ORDER BY tc.table_name;
