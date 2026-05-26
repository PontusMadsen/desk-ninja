# Desk Ninja

A desk companion with an animated face, voice interaction, and productivity tools. Built on a Raspberry Pi Zero 2 W with a tiny OLED screen, microphone, and speaker.

Say **"Hey Cookie"** and the ninja wakes up, listens, thinks, and responds — with a grumpy Japanese-accented personality and 37 animated face expressions.

## Features

**Voice Companion**
- Wake word detection ("Hey Cookie")
- Speech-to-text via Groq Whisper
- AI personality via Claude Haiku (grumpy ninja, English with Japanese accent)
- Text-to-speech via Google Cloud TTS (Japanese voice)
- Conversation mode — follow-up questions without repeating the wake word
- Angry reactions when you insult it

**Animated Face**
- 37 animated expressions on a 128x64 OLED display
- Reacts to tasks, habits, voice, and idle time
- Sleepy phase before falling asleep
- Random fun animations while idle (sakura, rain, bee, music...)

**Productivity Web App** (http://ninja.local)
- Task management with priorities and daily navigation
- Pomodoro focus timer linked to tasks
- Habit tracking with 7-day streaks
- Focus insights and weekly stats
- Chat with the ninja from your browser
- Daily summary (grumpy recap of your day)
- BBS-style settings panel
- OTA updates from the web UI

## Hardware

**Required:**
- Raspberry Pi Zero 2 W
- ReSpeaker 2-Mic HAT (or compatible I2S audio HAT)
- SH1106 128x64 I2C OLED display
- Small speaker (wired to HAT speaker header)
- Micro SD card (4GB+)

**Optional (advanced):**
- ESP32-S3 with round LCD (480x480) for full-color animated faces
- See `firmware/` for the ESP32 streaming display firmware

## Quick Start

### 1. Flash Raspberry Pi OS
Use Raspberry Pi Imager to flash **Raspberry Pi OS** to your SD card. In settings:
- Set hostname (e.g., `ninja`)
- Enable SSH
- Configure WiFi

### 2. Connect Hardware
- Mount ReSpeaker HAT on the Pi
- Connect OLED to the HAT's I2C Grove connector
- Wire speaker to the HAT's speaker header

### 3. Install
```bash
git clone https://github.com/PontusMadsen/desk-ninja.git
cd desk-ninja
chmod +x setup.sh
./setup.sh
sudo reboot
```

### 4. Setup
Open `http://ninja.local` in your browser and follow the setup wizard:
1. Enter API keys (Groq, Anthropic)
2. Optionally add Google Cloud TTS key
3. Test speaker and microphone
4. Done — say "Hey Cookie"!

## API Keys

You'll need accounts (free tiers available) for:

| Service | Purpose | Get a key |
|---------|---------|-----------|
| [Groq](https://console.groq.com) | Speech-to-text (Whisper) | Free tier available |
| [Anthropic](https://console.anthropic.com) | AI personality (Claude Haiku) | Pay-as-you-go |
| [Google Cloud](https://console.cloud.google.com) | Text-to-speech (optional) | Free tier: 1M chars/month |

Without Google Cloud TTS, the ninja falls back to Piper (local, English-only).

## Project Structure

```
desk-ninja/
├── setup.sh              # One-command installer
├── pi/
│   ├── src/
│   │   ├── orchestrator.js    # Main brain — wires everything together
│   │   ├── display.js         # ESP32 LCD streaming (Pi 4 version)
│   │   ├── oled-display.js    # OLED display module (Zero version)
│   │   ├── oled-display.py    # Python OLED renderer
│   │   ├── face-reactions.js  # Face animation mappings
│   │   ├── idle-behaviors.js  # Random idle animations
│   │   ├── llm/               # Claude AI integration
│   │   ├── tts/               # Google Cloud + Piper TTS
│   │   ├── stt/               # Groq Whisper STT
│   │   ├── audio/             # Recording and playback
│   │   ├── wakeword/          # "Hey Cookie" detection
│   │   ├── personality/       # Ninja character prompt
│   │   └── web/               # Express web server + UI
│   ├── oled-frames/           # Pre-rendered animation frames
│   ├── models/                # Wake word model
│   └── package.json
└── firmware/                  # ESP32 streaming display (optional)
```

## Configuration

All settings are accessible from the web UI at `http://ninja.local`:
- **Volume** — speaker level with voice feedback
- **Personality** — edit the ninja's character prompt
- **TTS Voice** — change voice and speaking rate
- **API Keys** — update keys anytime
- **Face Control** — trigger any animation manually

Settings persist in `pi/data/` and survive updates.

## Updating

Click **"Check for Updates"** in the web UI settings panel. If updates are available, click **"Install Update"** — it pulls from GitHub and restarts automatically.

## License

MIT

## Credits

- Ninja character from [Little Gamers](https://www.littlegamers.com) by Pontus Madsen
- Built with Claude, Groq, Google Cloud, openwakeword, luma.oled
