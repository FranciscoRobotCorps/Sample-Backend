#!/bin/bash
set -e

BASE_URL=http://localhost:3001
echo "=== Hermes API Comprehensive Endpoint Testing ==="
echo "Dockerized Environment"
echo "================================================"

test_endpoint() {
    local name=$1 method=$2 endpoint=$3 data=$4 headers=$5 expected_code=$6
    echo -e "\n--- ${name} ---"
    if [ -n "$data" ]; then
        eval "response=\$(curl -s -w '\n%{http_code}' -X "${method}" "${BASE_URL}${endpoint}" -H 'Content-Type: application/json' $headers -d "$data")"
    else
        eval "response=\$(curl -s -w '\n%{http_code}' -X "${method}" "${BASE_URL}${endpoint}" $headers)"
    fi
    body=$(echo "$response" | head -n -1)
    code=$(echo "$response" | tail -n 1)
    echo "Status: ${code} (expected: ${expected_code})"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    [ "$code" = "$expected_code" ] && { echo "PASS"; return 0; } || { echo "FAIL"; return 1; }
}

# ============================================================
# Health & Basic
# ============================================================
test_endpoint "Health Check" GET "/health" "" "" "200"
test_endpoint "Root Endpoint" GET "/" "" "" "200"

# ============================================================
# Subscriptions - CRUD
# ============================================================
if [ -n "$ACCESS_TOKEN" ]; then
    test_endpoint "Subscriptions: Get All Subscriptions" GET "/api/subscriptions" "" "Authorization: Bearer ${ACCESS_TOKEN}" "200"
    test_endpoint "Subscriptions: Create Subscription (title only)" POST "/api/subscriptions" "{\"title\":\"New Subscription\"}" "Authorization: Bearer ${ACCESS_TOKEN}" "201"
    test_endpoint "Subscriptions: Create Subscription (full)" POST "/api/subscriptions" "{\"title\":\"Full Subscription\",\"description\":\"A detailed subscription description\",\"status\":\"active\",\"category_id\":1,\"tags\":[1]}" "Authorization: Bearer ${ACCESS_TOKEN}" "201"
    test_endpoint "Subscriptions: Get Subscription by ID (invalid)" GET "/api/subscriptions/999999" "" "Authorization: Bearer ${ACCESS_TOKEN}" "404"
    test_endpoint "Subscriptions: Update Subscription" PATCH "/api/subscriptions/1" "{\"title\":\"Updated Title\",\"status\":\"inactive\"}" "Authorization: Bearer ${ACCESS_TOKEN}" "200"
    test_endpoint "Subscriptions: Delete Subscription" DELETE "/api/subscriptions/1" "" "Authorization: Bearer ${ACCESS_TOKEN}" "204"
fi

# ============================================================
# Notes - CRUD
# ============================================================
if [ -n "$ACCESS_TOKEN" ]; then
    test_endpoint "Notes: Get All Notes" GET "/api/notes" "" "Authorization: Bearer ${ACCESS_TOKEN}" "200"
    test_endpoint "Notes: Create Note (title only)" POST "/api/notes" "{\"title\":\"New Note\"}" "Authorization: Bearer ${ACCESS_TOKEN}" "201"
    test_endpoint "Notes: Create Note (full)" POST "/api/notes" "{\"title\":\"Full Note\",\"content\":\"This is the note content.\"}" "Authorization: Bearer ${ACCESS_TOKEN}" "201"
    test_endpoint "Notes: Get Note by ID (invalid)" GET "/api/notes/999999" "" "Authorization: Bearer ${ACCESS_TOKEN}" "404"
    test_endpoint "Notes: Update Note" PATCH "/api/notes/1" "{\"title\":\"Updated Title\",\"content\":\"Updated content\"}" "Authorization: Bearer ${ACCESS_TOKEN}" "200"
    test_endpoint "Notes: Delete Note" DELETE "/api/notes/1" "" "Authorization: Bearer ${ACCESS_TOKEN}" "204"
fi

# ============================================================
# Summary / Dashboard
# ============================================================
if [ -n "$ACCESS_TOKEN" ]; then
    test_endpoint "Summary: Get Dashboard" GET "/api/summary/dashboard" "" "Authorization: Bearer ${ACCESS_TOKEN}" "200"
fi
