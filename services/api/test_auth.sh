#!/bin/bash

echo "=== Phase 1: Verification Script ==="
echo "Testing backend auth routes on localhost:4000..."
echo ""

# 1. Test POST /api/auth/nonce
echo "[Test 1: Nonce Request]"
NONCE_RES=$(curl -s -X POST http://localhost:4000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x1234567890123456789012345678901234567890"}')

echo $NONCE_RES | grep -q "nonce"
if [ $? -eq 0 ]; then
  echo "✅ SUCCESS: Nonce generated successfully."
else
  echo "❌ FAIL: Did not receive a nonce."
  echo "Output: $NONCE_RES"
fi
echo ""

# 2. Test KV protected route (ngoApplications) -> Without JWT or Signature should fail
echo "[Test 2: KV Collection Protection]"
KV_RES=$(curl -s -X PUT http://localhost:4000/api/kv/ngoApplications/test \
  -H "Content-Type: application/json" \
  -d '{"data": {"test": true}}')

# Both 401 Unauthorized (auth layer) and 403 kv_collection_write_blocked (collection layer)
# are correct responses — the write is blocked either way.
echo $KV_RES | grep -q -E "kv_collection_write_blocked|Unauthorized"
if [ $? -eq 0 ]; then
  echo "✅ SUCCESS: Write correctly blocked (unauthenticated write rejected)."
  echo "   Response: $KV_RES"
else
  echo "❌ FAIL: Protected collection could allow writes or failed incorrectly."
  echo "Output: $KV_RES"
fi
echo ""

# 3. Test Public Route (campaigns)
echo "[Test 3: Public Route Access]"
PUB_RES=$(curl -s http://localhost:4000/api/campaigns)
echo $PUB_RES | grep -q -i "error"
if [ $? -eq 1 ]; then
  echo "✅ SUCCESS: Public campaigns route is accessible."
else
  echo "❌ FAIL: Campaigns route returned an error or was blocked."
  echo "Output: $PUB_RES"
fi
echo ""

echo "Done running automated curl tests for Phase 1!"

