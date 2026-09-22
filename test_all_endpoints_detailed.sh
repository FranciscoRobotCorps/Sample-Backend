#!/bin/bash
set -e

BASE_URL="http://localhost:3001"
echo "=== Hermes API Comprehensive Endpoint Testing ==="
echo "Dockerized Environment"
echo "================================================"

# Helper function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    local expected_code="$6"
    
    echo -e "\n--- $name ---"
    echo "Method: $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H 'Content-Type: application/json' \
            $headers \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" $headers)
    fi
    
    body=$(echo "$response" | head -n -1)
    code=$(echo "$response" | tail -n 1)
    
    echo "Status: $code (expected: $expected_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    
    if [ "$code" = "$expected_code" ]; then
        echo "✓ PASS"
        return 0
    else
        echo "✗ FAIL"
        return 1
    fi
}

# 1. Health check
test_endpoint "Health Check" "GET" "/health" "" "" "200"

# 2. Auth - Login
echo -e "\n--- POST /api/auth/login ---"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"user@example.com","password":"password123"}')
echo "$LOGIN_RESPONSE" | python3 -m json.tool
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["refresh_token"])')

# 3. Auth - Refresh
test_endpoint "Refresh Token" "POST" "/api/auth/refresh" "{\"refresh_token\":\"$REFRESH_TOKEN\"}" "" "200"

# 4. Auth - Logout
test_endpoint "Logout" "POST" "/api/auth/logout" "" "" "200"

# 5. Todos - List without auth (should fail)
test_endpoint "List Todos without auth" "GET" "/api/todos" "" "" "401"

# 6. Todos - List with auth (empty)
test_endpoint "List Todos with auth" "GET" "/api/todos" "" "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "200"

# 7. Todos - Create
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/todos" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title":"Integration Test Todo","description":"Testing all endpoints"}')
echo -e "\n--- POST /api/todos (create) ---"
echo "$CREATE_RESPONSE" | python3 -m json.tool
TODO_ID=$(echo "$CREATE_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])')

# 8. Todos - Get by ID
test_endpoint "Get Todo by ID" "GET" "/api/todos/$TODO_ID" "" "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "200"

# 9. Todos - Get non-existent
test_endpoint "Get non-existent Todo" "GET" "/api/todos/999999" "" "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "404"

# 10. Todos - Update
test_endpoint "Update Todo" "PATCH" "/api/todos/$TODO_ID" '{"done":true,"title":"Updated Title"}' "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "200"

# 11. Todos - List with filters
test_endpoint "List Todos with filters" "GET" "/api/todos?done=true&limit=5&offset=0" "" "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "200"

# 12. Todos - Validation error (empty title)
test_endpoint "Create Todo validation error" "POST" "/api/todos" '{"title":""}' "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "400"

# 13. Todos - Validation error (missing title)
test_endpoint "Create Todo missing title" "POST" "/api/todos" '{"description":"No title"}' "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "400"

# 14. Todos - Update validation (empty object)
test_endpoint "Update Todo empty body" "PATCH" "/api/todos/$TODO_ID" '{}' "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "400"

# 15. Todos - Delete
test_endpoint "Delete Todo" "DELETE" "/api/todos/$TODO_ID" "" "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "204"

# 16. Verify deletion
test_endpoint "Verify Todo deleted" "GET" "/api/todos/$TODO_ID" "" "-H \"Authorization: Bearer $ACCESS_TOKEN\"" "404"

# 17. Invalid token
test_endpoint "Invalid token" "GET" "/api/todos" "" "-H \"Authorization: Bearer invalid.token.here\"" "401"

# 18. Missing token
test_endpoint "Missing token header" "GET" "/api/todos" "" "" "401"

# 19. Invalid endpoint
test_endpoint "Unknown route" "GET" "/api/unknown" "" "" "404"

echo -e "\n================================================"
echo "=== All endpoint tests completed successfully ==="
echo "Summary:"
echo "- Health check: Working"
echo "- Authentication (login/refresh/logout): Working"
echo "- Todos CRUD with auth: Working"
echo "- Validation: Working"
echo "- Error handling: Working"
echo "================================================"
