#!/bin/bash
# ============================================================
# Ninja Desk Companion — Setup Script
# Run on a fresh Raspberry Pi Zero 2 W with ReSpeaker 2-Mic HAT
# ============================================================

set -e

echo "=========================================="
echo "  NINJA DESK COMPANION — Setup"
echo "=========================================="
echo ""

if ! grep -q "Raspberry" /proc/cpuinfo 2>/dev/null; then
  echo "WARNING: This doesn't look like a Raspberry Pi."
  echo "Continuing anyway..."
fi

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
PI_DIR="$INSTALL_DIR/pi"
USER=$(whoami)

echo "[1/10] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  git nodejs npm i2c-tools espeak-ng sox libportaudio2 \
  python3-pip python3-venv iptables

echo "[2/10] Enabling I2C..."
sudo raspi-config nonint do_i2c 0 2>/dev/null || echo "  (manual: enable I2C in raspi-config)"

echo "[3/10] Installing Python packages..."
pip3 install --break-system-packages \
  openwakeword sounddevice webrtcvad numpy luma.oled

echo "[4/10] Installing ReSpeaker HAT driver..."
if [ ! -d "$HOME/seeed-voicecard" ]; then
  cd "$HOME"
  git clone https://github.com/HinTak/seeed-voicecard.git
fi
cd "$HOME/seeed-voicecard"
KERNEL_VERSION=$(uname -r | grep -oP '^\d+\.\d+')
git checkout "v${KERNEL_VERSION}" 2>/dev/null || echo "  (using default branch)"
sudo ./install.sh
if ! grep -q "seeed-2mic-voicecard" /boot/firmware/config.txt 2>/dev/null; then
  echo "dtoverlay=seeed-2mic-voicecard" | sudo tee -a /boot/firmware/config.txt
fi

echo "[5/10] Installing Node.js dependencies..."
cd "$PI_DIR"
npm install

echo "[6/10] Setting up data directory..."
mkdir -p "$PI_DIR/data"
# Create default .env if missing
if [ ! -f "$PI_DIR/.env" ]; then
  cat > "$PI_DIR/.env" << ENVEOF
GROQ_API_KEY=your_groq_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
DISPLAY_MODE=oled
AUDIO_DEVICE=playback
MIC_DEVICE=capture
MIC_DIRECT=1
WAKE_WORD=hey_cookie
ENVEOF
  echo "  Created .env template — add your API keys via the web UI"
fi

echo "[7/10] Setting default volume..."
amixer -c 0 set Speaker 60% 2>/dev/null || true
amixer -c 0 set Capture 40 2>/dev/null || true
amixer -c 0 set "ADC PCM" 200 2>/dev/null || true
sudo alsactl store
echo '{"volume":60}' > "$PI_DIR/data/volume.json"

echo "[8/10] Setting up passwordless sudo..."
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart ninja.service, /usr/bin/systemctl stop ninja.service, /usr/bin/systemctl start ninja.service, /sbin/shutdown, /sbin/reboot, /usr/sbin/alsactl" | sudo tee /etc/sudoers.d/ninja > /dev/null
sudo chmod 440 /etc/sudoers.d/ninja

echo "[9/10] Setting up systemd service..."
cat > /tmp/ninja.service << EOF
[Unit]
Description=Ninja Desk Companion
After=network.target sound.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PI_DIR
ExecStart=/usr/bin/node src/orchestrator.js
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=300
StartLimitBurst=5
Environment=PYTHONUNBUFFERED=1
Environment=NODE_ENV=production
EnvironmentFile=$PI_DIR/.env

[Install]
WantedBy=multi-user.target
EOF
sudo cp /tmp/ninja.service /etc/systemd/system/ninja.service
sudo systemctl daemon-reload
sudo systemctl enable ninja.service

echo "[10/10] Setting up port 80 redirect..."
# Use a systemd service for iptables persistence (more reliable than if-pre-up)
cat > /tmp/ninja-redirect.service << EOF
[Unit]
Description=Port 80 to 8888 redirect for Ninja
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8888
ExecStop=/sbin/iptables -t nat -D PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8888
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
sudo cp /tmp/ninja-redirect.service /etc/systemd/system/ninja-redirect.service
sudo systemctl daemon-reload
sudo systemctl enable ninja-redirect.service
sudo systemctl start ninja-redirect.service

echo ""
echo "=========================================="
echo "  Setup complete!"
echo "=========================================="
echo ""
echo "  Next steps:"
echo "  1. Reboot: sudo reboot"
echo "  2. Open http://$(hostname).local in your browser"
echo "  3. Follow the setup wizard to add API keys"
echo ""
echo "  The ninja will start automatically on boot."
echo ""
