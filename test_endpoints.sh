#!/bin/bash
set -e

BASE_URL="http://localhost:3001"
echo "Testing Hermes API Dockerized"
echo "=============================="

# Test health
echo -e "\n1. Testing GET /health"
curl -s "$BASE_URL/health" | python3 -m json.tool

# Login to get token
echo -e "\n2. Testing POST /api/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}')
echo "$LOGIN_RESPONSE" | python3 -m json.tool

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["refresh_token"])')

echo -e "\nAccess Token: ${ACCESS_TOKEN:0:50}..."
echo -e "Refresh Token: ${REFRESH_TOKEN:0:50}..."

# Test refresh
echo -e "\n3. Testing POST /api/auth/refresh"
curl -s -X POST "$BASE_URL/api/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}" | python3 -m json.tool

# Test logout
echo -e "\n4. Testing POST /api/auth/logout"
curl -s -X POST "$BASE_URL/api/auth/logout" | python3 -m json.tool

# Test todos without auth (should fail)
echo -e "\n5. Testing GET /api/todos without auth (should fail)"
curl -s -w "\nHTTP Status: %{http_code}\n" "$BASE_URL/api/todos" || true

# Test todos with auth
echo -e "\n6. Testing GET /api/todos with auth"
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/todos" | python3 -m json.tool

# Create todo
echo -e "\n7. Testing POST /api/todos (create)"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/todos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"title":"Test Todo from script","description":"Created via test script"}')
echo "$CREATE_RESPONSE" | python3 -m json.tool

TODO_ID=$(echo "$CREATE_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])')
echo "Created Todo ID: $TODO_ID"

# Get todo by id
echo -e "\n8. Testing GET /api/todos/:id"
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/todos/$TODO_ID" | python3 -m json.tool

# Update todo
echo -e "\n9. Testing PATCH /api/todos/:id"
curl -s -X PATCH "$BASE_URL/api/todos/$TODO_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"done":true}' | python3 -m json.tool

# List with filters
echo -e "\n10. Testing GET /api/todos?done=true&limit=10"
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/todos?done=true&limit=10" | python3 -m json.tool

# Delete todo
echo -e "\n11. Testing DELETE /api/todos/:id"
curl -s -w "\nHTTP Status: %{http_code}\n" -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/todos/$TODO_ID"

# Verify deleted
echo -e "\n12. Testing GET deleted todo (should 404)"
curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/todos/$TODO_ID" || true

echo -e "\n=============================="
echo "All endpoint tests completed!"
