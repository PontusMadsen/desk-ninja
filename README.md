# Little Gamers Ninja — Desk Companion

A desktop companion shaped like a ninja from the [Little Gamers](https://www.littlegamers.com) webcomic by Pontus Madsen. Round 480x480 LCD face on a Waveshare ESP32-S3, brain on a Raspberry Pi 4, connected over a single UART cable.

Say **"Hey Cookie"** and it listens, thinks, and talks back — in English with a Japanese accent.

## What it does

- **Animated eyes** on a 2.1" round IPS display — blinking, expressions, idle behaviors
- **Wake word** detection ("Hey Cookie") via openwakeword
- **Voice conversation** — Groq Whisper STT → Claude Haiku → Google Cloud TTS (Japanese accent)
- **9 expressions** — idle, happy, sad, angry, surprised, sleeping, confused, focused, scared
- **Idle behaviors** — looks around, gets drowsy, falls asleep after 5 minutes
- **Personality** — laconic, grumpy, secretly fond of you

## Hardware

| Component | Role |
|-----------|------|
| Raspberry Pi 4 (4GB) | Brain — wake word, STT, LLM, TTS |
| Waveshare ESP32-S3-Touch-LCD-2.1 | Face — 480x480 round LCD, IMU, touch |
| INMP441 I2S MEMS mic | Listening (wired to Pi I2S) |
| USB speaker (or headphone jack) | Talking |

Single 4-wire cable between Pi and ESP32 carries power + UART. See [hardware/wiring.md](hardware/wiring.md) for pin connections.

## Architecture

```
Pi 4 (brain)                    ESP32-S3 (face)
┌──────────────┐    UART JSON    ┌──────────────┐
│ Node.js      │◄──────────────►│ Arduino C++  │
│  orchestrator│    115200 8N1   │  face renderer│
│  wake word   │                 │  IMU/sensors  │
│  STT (Groq)  │                 │  480x480 LCD  │
│  LLM (Claude)│                 │  buzzer       │
│  TTS (Google)│                 └──────────────┘
│  reactions   │                   ▲ powered via
│  idle behav. │                   │ 5V from Pi
└──────────────┘                   │
     │ I2S                         │
  INMP441 mic              4-wire cable
```

## Quick Start

### 1. Flash the ESP32

```bash
cd firmware
pio run -t upload --upload-port /dev/cu.usbmodemXXXXX
```

Requires PlatformIO. Hold BOOT, press RESET, release BOOT to enter flash mode.

### 2. Set up the Pi

```bash
# Install Node.js dependencies
cd pi && npm install

# Create .env with your API keys
cp .env.example .env
# Edit .env with your GROQ_API_KEY and ANTHROPIC_API_KEY

# Install the systemd service
sudo bash scripts/install-service.sh
sudo systemctl start ninja
```

### 3. Talk to it

Say **"Hey Cookie"** and speak. The ninja listens for 4 seconds, then responds.

## Project Structure

```
little-gamers-ninja/
├── firmware/          # ESP32-S3 PlatformIO project
│   └── src/main.cpp   # LCD, UART, face renderer, IMU, sensors
├── pi/                # Raspberry Pi Node.js service
│   ├── src/
│   │   ├── orchestrator.js      # Main service
│   │   ├── transport/serial.js  # UART communication
│   │   ├── wakeword/            # openwakeword (Python subprocess)
│   │   ├── stt/groq.js          # Groq Whisper speech-to-text
│   │   ├── llm/claude.js        # Claude Haiku conversation
│   │   ├── tts/voicevox.js      # Google Cloud TTS (Piper fallback)
│   │   ├── audio/               # Record + playback
│   │   ├── reactions.js         # Sensor → face reactions
│   │   ├── idle-behaviors.js    # Random idle face animations
│   │   └── personality/         # Ninja character prompt
│   ├── config/
│   │   ├── default.json         # Settings
│   │   └── reactions.json       # Configurable reaction rules
│   ├── models/
│   │   └── hey_cookie.onnx      # Custom wake word model
│   └── systemd/ninja.service    # Auto-start on boot
├── hardware/
│   ├── wiring.md                # Current pin connections
│   └── bom.md                   # Bill of materials
└── docs/
    ├── architecture.md          # Design decisions
    └── protocol.md              # UART JSON protocol spec
```

## UART Protocol

Pi → ESP32 (commands):
```json
{"cmd":"face","state":"happy"}
{"cmd":"ping"}
{"cmd":"set_time","unix":1716200000}
```

ESP32 → Pi (events):
```json
{"event":"heartbeat","uptime_ms":5000,"face":"idle"}
{"event":"tilt","direction":"left","angle":45}
{"event":"pong"}
```

See [docs/protocol.md](docs/protocol.md) for the full spec.

## API Keys Required

- **GROQ_API_KEY** — free tier at [console.groq.com](https://console.groq.com)
- **ANTHROPIC_API_KEY** — from [console.anthropic.com](https://console.anthropic.com)
- **Google Cloud TTS** — service account JSON key with Text-to-Speech API enabled

## License

Personal project. Not open source yet.
