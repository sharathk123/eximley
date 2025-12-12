#!/bin/bash

# API Testing Script for Eximley
# Tests all major API endpoints with authentication

# ============================================
# Configuration
# ============================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
TOKEN="${SUPABASE_ANON_KEY:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# ============================================
# Helper Functions
# ============================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -e "\n${YELLOW}Testing:${NC} $name"
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $TOKEN'"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    # Execute request
    response=$(eval $curl_cmd)
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Check result
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $status"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} - Expected: $expected_status, Got: $status"
        echo -e "${RED}Response:${NC} $body"
        ((FAILED++))
    fi
}

test_unauthorized() {
    local name="$1"
    local endpoint="$2"
    
    echo -e "\n${YELLOW}Testing:${NC} $name (Unauthorized)"
    
    response=$(curl -s -w '\n%{http_code}' -X GET "$BASE_URL$endpoint")
    status=$(echo "$response" | tail -n1)
    
    if [ "$status" = "401" ] || [ "$status" = "403" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Unauthorized access blocked (Status: $status)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} - Should reject unauthorized access (Got: $status)"
        ((FAILED++))
    fi
}

# ============================================
# Check Prerequisites
# ============================================

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Error: SUPABASE_ANON_KEY environment variable not set${NC}"
    echo "Set it with: export SUPABASE_ANON_KEY='your-anon-key'"
    exit 1
fi

echo -e "${BLUE}Eximley API Test Suite${NC}"
echo "Base URL: $BASE_URL"
echo "Token: ${TOKEN:0:20}..."

# ============================================
# Test Suite 1: Authentication
# ============================================

print_header "1. Authentication Tests"

test_unauthorized "GET /api/orders" "/api/orders"
test_unauthorized "GET /api/purchase-orders" "/api/purchase-orders"
test_unauthorized "GET /api/shipping-bills" "/api/shipping-bills"

# ============================================
# Test Suite 2: Export Orders API
# ============================================

print_header "2. Export Orders API"

test_api "List export orders" "GET" "/api/orders" "" "200"

test_api "Create order (invalid data)" "POST" "/api/orders" \
    '{"invalid":"data"}' \
    "400"

test_api "Create order (missing required fields)" "POST" "/api/orders" \
    '{"currency_code":"USD"}' \
    "400"

# Note: This will actually create an order if you have valid IDs
# test_api "Create order (valid)" "POST" "/api/orders" \
#     '{"buyer_id":"valid-id","currency_code":"USD","order_date":"2024-01-01","items":[{"sku_id":"valid-sku","quantity":1,"unit_price":100}]}' \
#     "201"

# ============================================
# Test Suite 3: Purchase Orders API
# ============================================

print_header "3. Purchase Orders API"

test_api "List purchase orders" "GET" "/api/purchase-orders" "" "200"

test_api "Create PO (invalid data)" "POST" "/api/purchase-orders" \
    '{"invalid":"data"}' \
    "400"

# ============================================
# Test Suite 4: Shipping Bills API
# ============================================

print_header "4. Shipping Bills API"

test_api "List shipping bills" "GET" "/api/shipping-bills" "" "200"

test_api "Create SB (invalid data)" "POST" "/api/shipping-bills" \
    '{"invalid":"data"}' \
    "400"

# ============================================
# Test Suite 5: Proforma Invoices API
# ============================================

print_header "5. Proforma Invoices API"

test_api "List proforma invoices" "GET" "/api/invoices/proforma" "" "200"

# ============================================
# Test Suite 6: Quotes API
# ============================================

print_header "6. Quotes API"

test_api "List quotes" "GET" "/api/quotes" "" "200"

# ============================================
# Test Suite 7: Enquiries API
# ============================================

print_header "7. Enquiries API"

test_api "List enquiries" "GET" "/api/enquiries" "" "200"

# ============================================
# Test Suite 8: Master Data APIs
# ============================================

print_header "8. Master Data APIs"

test_api "List entities (buyers)" "GET" "/api/entities?type=buyer" "" "200"
test_api "List entities (suppliers)" "GET" "/api/entities?type=supplier" "" "200"
test_api "List SKUs" "GET" "/api/skus" "" "200"
test_api "List currencies" "GET" "/api/currencies" "" "200"

# ============================================
# Test Suite 9: Workflow APIs
# ============================================

print_header "9. Workflow APIs"

# These will fail without valid IDs, but test the endpoint exists
test_api "Approve PI (no ID)" "POST" "/api/invoices/proforma/invalid-id/approve" "" "404"
test_api "Reject order (no ID)" "POST" "/api/orders/invalid-id/reject" '{"reason":"test"}' "404"

# ============================================
# Test Suite 10: PDF Generation
# ============================================

print_header "10. PDF Generation APIs"

# These need valid IDs to actually test
test_api "Generate PI PDF (no ID)" "POST" "/api/invoices/proforma/invalid-id/generate-pdf" "" "404"
test_api "Generate order PDF (no ID)" "POST" "/api/orders/invalid-id/generate-pdf" "" "404"

# ============================================
# Summary
# ============================================

print_header "Test Summary"

TOTAL=$((PASSED + FAILED))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
