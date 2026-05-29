#!/bin/bash
# Bluetooth speaker for Desk Ninja
# Auto-accepts pairing and routes audio to speaker

NINJA_URL="http://localhost:8888"

# Power on and make discoverable
bluetoothctl power on
bluetoothctl discoverable on
bluetoothctl pairable on

# Start auto-accept agent in background
python3 /home/ninja/bt-agent.py &
AGENT_PID=$!

# Route BT audio to speaker
while true; do
    # Skip if ninja is in a voice conversation
    if [ -f /tmp/ninja-voice-active ]; then
        sleep 1
        continue
    fi

    DEVICE=$(bluealsa-aplay --list-devices 2>/dev/null | grep -oP "[0-9A-F:]{17}" | head -1)
    if [ -n "$DEVICE" ]; then
        # Trigger music face once
        curl -sf -X POST "$NINJA_URL/api/face" -H "Content-Type: application/json" -d "{\"face\":\"music\",\"playOnce\":true}" > /dev/null 2>&1
        echo "Playing BT audio from $DEVICE"
        bluealsa-aplay -D playback "$DEVICE" 2>/dev/null
    fi
    sleep 2
done

kill $AGENT_PID 2>/dev/null
