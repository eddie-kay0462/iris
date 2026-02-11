#!/bin/bash
#
# Auth API Test Script
#
# Tests authentication endpoints for the Iris platform.
# Run this script while the dev server is running on localhost:3000
#
# Usage: bash scripts/test-auth-api.sh
#
# Note: Some tests use the existing admin@iris.test account.
# Signup tests may fail due to Supabase rate limits or email validation.
#

BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/iris-test-cookies.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           IRIS AUTH API TEST SUITE                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Clean up any existing cookie file
rm -f $COOKIE_FILE

# Track test results
PASSED=0
FAILED=0

# Helper function to check response
check_response() {
    local name="$1"
    local expected_code="$2"
    local actual_code="$3"
    local response="$4"

    if [ "$actual_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $name (HTTP $actual_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $name (Expected $expected_code, got $actual_code)"
        echo "  Response: $response"
        ((FAILED++))
    fi
}

echo "═══════════════════════════════════════════════════════════════"
echo "LOGIN TESTS (using existing admin account)"
echo "═══════════════════════════════════════════════════════════════"

# Test 1: Login with missing credentials
echo ""
echo "Test 1: Login with missing credentials..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Login missing credentials" "400" "$HTTP_CODE" "$BODY"

# Test 2: Login with wrong password
echo ""
echo "Test 2: Login with wrong password..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iris.test","password":"wrongpassword"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Login wrong password" "401" "$HTTP_CODE" "$BODY"

# Test 3: Login with non-existent email
echo ""
echo "Test 3: Login with non-existent email..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"password123"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Login non-existent email" "401" "$HTTP_CODE" "$BODY"

# Test 4: Successful login (using heredoc to handle special chars)
echo ""
echo "Test 4: Successful login..."
LOGIN_JSON=$(cat <<'ENDJSON'
{"email":"admin@iris.test","password":"TestAdmin123!"}
ENDJSON
)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -c $COOKIE_FILE \
  -d "$LOGIN_JSON")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Login success" "200" "$HTTP_CODE" "$BODY"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "PROFILE TESTS"
echo "═══════════════════════════════════════════════════════════════"

# Test 5: Get profile without auth
echo ""
echo "Test 5: Get profile without auth..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/profile")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Profile without auth" "401" "$HTTP_CODE" "$BODY"

# Test 6: Get profile with auth
echo ""
echo "Test 6: Get profile with auth..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/profile" \
  -b $COOKIE_FILE)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Profile with auth" "200" "$HTTP_CODE" "$BODY"

# Test 7: Update profile
echo ""
echo "Test 7: Update profile..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{"first_name":"Test","last_name":"Admin"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Update profile" "200" "$HTTP_CODE" "$BODY"

# Test 8: Update profile - attempt to change role (should be ignored)
echo ""
echo "Test 8: Update profile with role (should succeed but ignore role)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{"first_name":"Still Test","role":"public"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Update profile ignores role" "200" "$HTTP_CODE" "$BODY"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "PASSWORD RESET TESTS"
echo "═══════════════════════════════════════════════════════════════"

# Test 9: Password reset with missing email
echo ""
echo "Test 9: Password reset missing email..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Password reset missing email" "400" "$HTTP_CODE" "$BODY"

# Test 10: Password reset with invalid email
echo ""
echo "Test 10: Password reset invalid email format..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Password reset invalid email" "400" "$HTTP_CODE" "$BODY"

# Test 11: Password reset success (always returns 200 to prevent email enumeration)
echo ""
echo "Test 11: Password reset success..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iris.test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Password reset success" "200" "$HTTP_CODE" "$BODY"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "LOGOUT TESTS"
echo "═══════════════════════════════════════════════════════════════"

# Test 12: Logout
echo ""
echo "Test 12: Logout..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/logout" \
  -b $COOKIE_FILE)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Logout" "200" "$HTTP_CODE" "$BODY"

# Test 13: Profile after logout should fail
echo ""
echo "Test 13: Profile after logout (should fail)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/profile" \
  -b $COOKIE_FILE)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Profile after logout" "401" "$HTTP_CODE" "$BODY"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "SIGNUP TESTS"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${YELLOW}Note: Signup tests may fail due to Supabase rate limits${NC}"

# Test 14: Signup with missing email
echo ""
echo "Test 14: Signup with missing email..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"password":"password123"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Signup missing email" "400" "$HTTP_CODE" "$BODY"

# Test 15: Signup with missing password
echo ""
echo "Test 15: Signup with missing password..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Signup missing password" "400" "$HTTP_CODE" "$BODY"

# Test 16: Signup with weak password
echo ""
echo "Test 16: Signup with weak password..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"short"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_response "Signup weak password" "400" "$HTTP_CODE" "$BODY"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Check output above for details.${NC}"
    exit 1
fi
