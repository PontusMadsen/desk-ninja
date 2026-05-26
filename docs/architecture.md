# Architecture

## Locked-In Decisions

### 1. Pi 4 is brain, ESP32 is peripheral
The Raspberry Pi 4 runs all intelligence — wake word detection, speech-to-text, LLM inference, and text-to-speech synthesis. The Waveshare ESP32-S3-Touch-LCD-2.1 is a peripheral responsible only for display, touch input, IMU sensing, and RTC.

### 2. UART communication, not Wi-Fi
Pi and ESP32 communicate over a wired UART connection (115200 baud, 8N1) using newline-delimited JSON. This avoids Wi-Fi latency, pairing complexity, and network dependency. The ESP32's Wi-Fi radio is unused.

### 3. Audio on Pi, not ESP32
All audio capture (INMP441 I2S mic) and playback (MAX98357A I2S amp) is wired to the Pi. The ESP32 has no audio hardware attached. This keeps the audio pipeline close to the processing and avoids streaming audio over UART.

### 4. Voice pipeline
- **Wake word:** openWakeWord (running on Pi)
- **Speech-to-text:** Groq Whisper (whisper-large-v3-turbo) — fast cloud transcription
- **LLM:** Claude Haiku 4.5 — personality and response generation
- **Text-to-speech:** VOICEVOX — Japanese character voice

### 5. VOICEVOX for character voice
The ninja speaks Japanese using VOICEVOX with the Zundamon voice (speaker_id=3). VOICEVOX runs locally on the Pi as a Docker container or native install.

### 6. Sprite-based animations in PSRAM/SPIFFS
Face animations are pre-rendered sprite sheets stored in the ESP32's SPIFFS partition and loaded into PSRAM for fast display. The Pi tells the ESP32 which face state to show; the ESP32 handles all rendering.

### 7. Bundle-for-sale ready, but no commercial features yet
The architecture is designed so that a unit could be assembled and sold — modular pipeline, config files, structured logging with cost tracking, per-device rate limiting. However, no commercial features (OTA updates, captive portal setup, web UI) are built yet. Those are deferred.
