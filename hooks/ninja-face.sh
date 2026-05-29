#!/usr/bin/env bash
# Desk Ninja — Claude Code Hook
# Changes the ninja's face via the web API
# Usage: echo "surprised" | ./ninja-face.sh
#
# Set NINJA_URL in your environment or it defaults to http://ninja:8888

NINJA_URL="${NINJA_URL:-http://ninja:8888}"
FACE="${1:-$(cat)}"

# Fire and forget — don't block Claude Code
curl -sf -X POST "$NINJA_URL/api/face" \
  -H "Content-Type: application/json" \
  -d "{\"face\":\"$FACE\"}" \
  --connect-timeout 1 --max-time 2 > /dev/null 2>&1 &

exit 0
