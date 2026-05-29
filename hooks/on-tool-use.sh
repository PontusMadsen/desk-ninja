#!/usr/bin/env bash
# Hook: PreToolUse — ninja shows working face
cat > /dev/null
NINJA_URL="${NINJA_URL:-http://ninja:8888}"
curl -sf -X POST "$NINJA_URL/api/face" \
  -H "Content-Type: application/json" \
  -d '{"face":"focused"}' \
  --connect-timeout 1 --max-time 2 > /dev/null 2>&1 &
exit 0
