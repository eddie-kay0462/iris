#!/bin/bash
#
# RBAC Test Script
#
# Comprehensive test suite for the Role-Based Access Control system.
# Tests all RBAC endpoints across all user roles.
#
# Prerequisites:
# 1. Run setup script: npx tsx scripts/setup-rbac-test-users.ts
# 2. Start dev server: npm run dev
#
# Usage: bash scripts/test-rbac.sh
#
# Test Matrix:
# | Endpoint          | Admin | Manager | Staff | Public | Unauth |
# |-------------------|-------|---------|-------|--------|--------|
# | auth-only         | 200   | 200     | 200   | 200    | 401    |
# | admin-only        | 200   | 200     | 200   | 403    | 401    |
# | manager-only      | 200   | 200     | 403   | 403    | 401    |
# | products-create   | 200   | 200     | 403   | 403    | 401    |
# | orders-refund     | 200   | 200     | 403   | 403    | 401    |
#

BASE_URL="http://localhost:3000"
COOKIE_DIR="/tmp/iris-rbac-test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test credentials
declare -A USERS
USERS[admin]="admin@iris.test"
USERS[manager]="manager@iris.test"
USERS[staff]="staff@iris.test"
USERS[public]="customer@iris.test"

PASSWORD="TestUser123!"

# Test endpoints and expected results
# Format: endpoint:admin:manager:staff:public:unauth
TESTS=(
  "auth-only:200:200:200:200:401"
  "admin-only:200:200:200:403:401"
  "manager-only:200:200:403:403:401"
  "products-create:200:200:403:403:401"
  "orders-refund:200:200:403:403:401"
)

# Track results
PASSED=0
FAILED=0
TOTAL=0

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           IRIS RBAC TEST SUITE                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Create cookie directory
rm -rf "$COOKIE_DIR"
mkdir -p "$COOKIE_DIR"

# Helper function to check response
check_response() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    local response="$4"

    ((TOTAL++))
    if [ "$actual" == "$expected" ]; then
        echo -e "  ${GREEN}✓ PASS${NC}: $name (HTTP $actual)"
        ((PASSED++))
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC}: $name (Expected $expected, got $actual)"
        echo "    Response: $response"
        ((FAILED++))
        return 1
    fi
}

# Login a user and save cookies
login_user() {
    local role="$1"
    local email="${USERS[$role]}"
    local cookie_file="$COOKIE_DIR/${role}.txt"

    # Build login JSON using heredoc to handle special chars
    local login_json
    login_json=$(cat <<ENDJSON
{"email":"${email}","password":"${PASSWORD}"}
ENDJSON
)

    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -c "$cookie_file" \
        -d "$login_json" 2>/dev/null)

    local http_code
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" == "200" ]; then
        echo -e "  ${GREEN}✓${NC} Logged in as $role ($email)"
        return 0
    else
        echo -e "  ${RED}✗${NC} Failed to login as $role ($email) - HTTP $http_code"
        local body
        body=$(echo "$response" | sed '$d')
        echo "    Response: $body"
        return 1
    fi
}

# Test an endpoint as a specific role
test_endpoint() {
    local endpoint="$1"
    local role="$2"
    local expected="$3"
    local cookie_file="$COOKIE_DIR/${role}.txt"

    local response
    local curl_opts="-s -w \n%{http_code}"

    if [ "$role" == "unauth" ]; then
        # No cookies for unauthenticated
        response=$(curl $curl_opts "$BASE_URL/api/test/rbac/$endpoint" 2>/dev/null)
    else
        response=$(curl $curl_opts "$BASE_URL/api/test/rbac/$endpoint" \
            -b "$cookie_file" 2>/dev/null)
    fi

    local http_code
    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')

    check_response "$endpoint as $role" "$expected" "$http_code" "$body"
}

# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 1: Login Test Users"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

LOGIN_FAILED=0
for role in admin manager staff public; do
    if ! login_user "$role"; then
        LOGIN_FAILED=1
    fi
done

if [ "$LOGIN_FAILED" == "1" ]; then
    echo ""
    echo -e "${YELLOW}Warning: Some logins failed. Have you run the setup script?${NC}"
    echo "  Run: set -a && source .env.local && set +a && npx tsx scripts/setup-rbac-test-users.ts"
    echo ""
fi

# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 2: Test RBAC Endpoints"
echo "═══════════════════════════════════════════════════════════════════"

for test_config in "${TESTS[@]}"; do
    # Parse test configuration
    IFS=':' read -r endpoint exp_admin exp_manager exp_staff exp_public exp_unauth <<< "$test_config"

    echo ""
    echo -e "${BLUE}Testing: /api/test/rbac/$endpoint${NC}"
    echo "───────────────────────────────────────────────────────────────────"

    # Test each role
    test_endpoint "$endpoint" "admin" "$exp_admin"
    test_endpoint "$endpoint" "manager" "$exp_manager"
    test_endpoint "$endpoint" "staff" "$exp_staff"
    test_endpoint "$endpoint" "public" "$exp_public"
    test_endpoint "$endpoint" "unauth" "$exp_unauth"
done

# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 3: Edge Case Tests"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Edge case: Invalid session cookie
echo -e "${BLUE}Testing: Invalid/expired session cookie${NC}"
echo "───────────────────────────────────────────────────────────────────"
echo "some-invalid-cookie" > "$COOKIE_DIR/invalid.txt"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/test/rbac/auth-only" \
    -b "$COOKIE_DIR/invalid.txt" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
# Invalid cookie should be treated as unauthenticated
check_response "auth-only with invalid cookie" "401" "$http_code" "$body"

# Edge case: Missing authorization header
echo ""
echo -e "${BLUE}Testing: Request with no auth at all${NC}"
echo "───────────────────────────────────────────────────────────────────"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/test/rbac/admin-only" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
check_response "admin-only with no auth" "401" "$http_code" "$body"

# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo -e "Total:  ${TOTAL}"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

# Permission matrix summary
echo "Permission Matrix Results:"
echo "───────────────────────────────────────────────────────────────────"
printf "%-20s %8s %8s %8s %8s %8s\n" "Endpoint" "Admin" "Manager" "Staff" "Public" "Unauth"
echo "───────────────────────────────────────────────────────────────────"
for test_config in "${TESTS[@]}"; do
    IFS=':' read -r endpoint exp_admin exp_manager exp_staff exp_public exp_unauth <<< "$test_config"
    printf "%-20s %8s %8s %8s %8s %8s\n" "$endpoint" "$exp_admin" "$exp_manager" "$exp_staff" "$exp_public" "$exp_unauth"
done
echo "───────────────────────────────────────────────────────────────────"
echo ""

# Cleanup
rm -rf "$COOKIE_DIR"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ALL TESTS PASSED! RBAC system is working correctly.         ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  SOME TESTS FAILED! Check output above for details.          ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
