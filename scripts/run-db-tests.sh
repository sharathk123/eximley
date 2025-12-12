#!/bin/bash

# Database Test Script Runner for Supabase
# This script helps run the database tests against your Supabase instance

echo "🗄️  Database Test Suite"
echo "======================"
echo ""

# Check if we have database credentials
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  Database URL not set"
    echo ""
    echo "You have 3 options to run database tests:"
    echo ""
    echo "Option 1: Using Supabase Dashboard (Easiest)"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Go to SQL Editor"
    echo "  4. Copy contents from scripts/test-db.sql"
    echo "  5. Paste and run"
    echo ""
    echo "Option 2: Using psql with connection string"
    echo "  export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres'"
    echo "  ./scripts/run-db-tests.sh"
    echo ""
    echo "Option 3: Manual Connection Info"
    echo "  Get from Supabase Dashboard → Project Settings → Database"
    echo "  psql -h db.your-project-ref.supabase.co -U postgres -d postgres -f scripts/test-db.sql"
    echo ""
    exit 1
fi

echo "✓ Database URL found"
echo "Running tests against: ${SUPABASE_DB_URL:0:30}..."
echo ""

# Run the tests
psql "$SUPABASE_DB_URL" -f scripts/test-db.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database tests completed"
    echo "Review output above for test results"
else
    echo ""
    echo "❌ Database tests failed"
    echo "Check connection and permissions"
    exit 1
fi
