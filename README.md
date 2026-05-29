# Desk Ninja

A desk companion with an animated face, voice interaction, and productivity tools. Built on a Raspberry Pi Zero 2 W with a tiny OLED screen, microphone, and speaker.

Say **"Hey Ninja"** and the ninja wakes up, listens, thinks, and responds — with a grumpy Japanese-accented personality and 37 animated face expressions.

## Features

**Voice Companion**
- Custom wake word detection ("Hey Ninja")
- Speech-to-text via Groq Whisper
- AI personality via Claude Haiku (grumpy ninja, English with Japanese accent)
- Text-to-speech via Google Cloud TTS (Japanese voice)
- Conversation mode — follow-up questions without repeating the wake word

**Animated Face**
- 37 animated expressions on a 128x64 OLED display
- Reacts to tasks, habits, voice, and idle time
- Sleepy phase before falling asleep
- Random fun animations while idle (sakura, rain, bee, music...)
- Angry reactions when you insult it

**Productivity Web App** (http://ninja.local)
- Task management with priorities, recurring tasks, and drag-and-drop sorting
- Pomodoro focus timer linked to tasks
- Habit tracking with 7-day streaks
- Focus insights and weekly stats
- Chat with the ninja from your browser
- Daily summary (grumpy recap of your day)
- Settings panel with volume, personality, TTS voice, API keys
- OTA updates from the web UI
- Desktop app (Tauri) available

## Hardware

**Required:**
- Raspberry Pi Zero 2 W
- ReSpeaker 2-Mic HAT (or compatible I2S audio HAT)
- SH1106 128x64 I2C OLED display (connected via HAT's I2C Grove connector)
- Small speaker wired to HAT speaker header (e.g., Mini Horn 3070, 8Ω 3W)
- Micro SD card (4GB+)

**OLED Wiring (Grove I2C connector):**
| Grove wire | OLED pin |
|-----------|----------|
| Green | GND |
| Yellow | VCC |
| Black | SCL |
| Red | SDA |

*Note: These colors are for the KEYESTUDIO ReSpeaker HAT. Your wiring may differ — use `i2cdetect -y 1` to verify the OLED appears at address 0x3c.*

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
4. Done!

### 5. Talk to it
- Say **"Hey Ninja"** and wait for the face to react (surprised face)
- Then ask your question
- The ninja thinks (squint face) and responds with voice + face animation

## Usage Tips

- **Wake word:** Say "Hey Ninja", wait for the surprised face, then speak
- **Conversation mode:** After the ninja responds, just keep talking — no need to say the wake word again for follow-up questions
- **Insult it:** Say something mean and watch the angry animation play
- **Bluetooth speaker:** Pair your phone via Bluetooth (shows as "ninja") and play music through the ninja's speaker
- **Music + voice:** Pause music from your phone before saying "Hey Ninja" — the mic can't hear you over the speaker
- **Web UI:** Access tasks, habits, focus timer, and settings at `http://ninja.local`
- **Desktop app:** Tauri-based native macOS app available (see releases)
- **Claude Code hooks:** The ninja's face reacts to your CLI — see `hooks/` folder for setup

## API Keys

| Service | Purpose | Get a key |
|---------|---------|-----------|
| [Groq](https://console.groq.com) | Speech-to-text (Whisper) | Free tier available |
| [Anthropic](https://console.anthropic.com) | AI personality (Claude Haiku) | Pay-as-you-go |
| [Google Cloud](https://console.cloud.google.com) | Text-to-speech (optional) | Free tier: 1M chars/month |

Without Google Cloud TTS, the ninja falls back to Piper (local, English-only).

## Known Issues

- **Latency:** The Pi Zero 2 W is slower than a Pi 4. Expect 3-5 seconds between speaking and getting a response.
- **Wake word timing:** Say "Hey Ninja" and wait for the face to change before speaking your question. The ninja can't hear you while the wake word is being processed.
- **OLED framerate:** ~5fps due to I2C speed limitations. Animations are smooth enough but not buttery.

## 3D Printable Case

*Coming soon — STL files for a ninja-shaped enclosure.*

## Face Credits

Face animations are based on work from [The Mochi](https://www.themochi.huykhong.com/) which were originally created by Dasai Mochi. Adapted and converted for OLED display.

## Updating

Click **"Check for Updates"** in the web UI settings panel. If updates are available, click **"Install Update"** — it pulls from GitHub and restarts automatically.

## License

MIT

## Credits

- Ninja character from [Little Gamers](https://www.littlegamers.com) by Pontus Madsen
- Face animations based on [Dasai Mochi](https://www.themochi.huykhong.com/)
- Built with Claude, Groq, Google Cloud, openwakeword, luma.oled
