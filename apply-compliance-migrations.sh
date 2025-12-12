#!/bin/bash
# Script to apply Indian export compliance migrations
# Run this script to update your Supabase database

echo "Applying Indian Export Compliance Migrations..."
echo "=============================================="

# Database connection string
DB_URL="postgresql://postgres.rsmnazjdqumqdsmlvzar:pass1234@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

echo ""
echo "Migration 1: Adding PI item compliance fields..."
psql "$DB_URL" -f supabase/migrations/20241212200000_add_pi_item_compliance_fields.sql
if [ $? -eq 0 ]; then
    echo "✅ Migration 1 completed successfully"
else
    echo "❌ Migration 1 failed"
    exit 1
fi

echo ""
echo "Migration 2: Adding export order payment fields..."
psql "$DB_URL" -f supabase/migrations/20241212200001_add_export_order_payment_fields.sql
if [ $? -eq 0 ]; then
    echo "✅ Migration 2 completed successfully"
else
    echo "❌ Migration 2 failed"
    exit 1
fi

echo ""
echo "Migration 3: Adding shipping bill vessel fields..."
psql "$DB_URL" -f supabase/migrations/20241212200002_add_shipping_bill_vessel_fields.sql
if [ $? -eq 0 ]; then
    echo "✅ Migration 3 completed successfully"
else
    echo "❌ Migration 3 failed"
    exit 1
fi

echo ""
echo "=============================================="
echo "✅ All migrations completed successfully!"
echo "Your database is now compliant with Indian export requirements."
