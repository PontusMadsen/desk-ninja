#!/usr/bin/env bash
# Hook: Stop — ninja goes back to idle
cat > /dev/null
NINJA_URL="${NINJA_URL:-http://ninja:8888}"
curl -sf -X POST "$NINJA_URL/api/face" \
  -H "Content-Type: application/json" \
  -d '{"face":"idle"}' \
  --connect-timeout 1 --max-time 2 > /dev/null 2>&1 &
exit 0
