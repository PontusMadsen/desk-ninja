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

# Check if running on Pi
if ! grep -q "Raspberry" /proc/cpuinfo 2>/dev/null; then
  echo "WARNING: This doesn't look like a Raspberry Pi."
  echo "Continuing anyway..."
fi

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
PI_DIR="$INSTALL_DIR/pi"

echo "[1/8] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  git nodejs npm i2c-tools espeak-ng sox libportaudio2 \
  python3-pip python3-venv iptables

echo "[2/8] Enabling I2C..."
sudo raspi-config nonint do_i2c 0 2>/dev/null || echo "  (manual: enable I2C in raspi-config)"

echo "[3/8] Installing Python packages..."
pip3 install --break-system-packages \
  openwakeword sounddevice webrtcvad numpy luma.oled

echo "[4/8] Installing ReSpeaker HAT driver..."
if [ ! -d "$HOME/seeed-voicecard" ]; then
  cd "$HOME"
  git clone https://github.com/HinTak/seeed-voicecard.git
fi
cd "$HOME/seeed-voicecard"
KERNEL_VERSION=$(uname -r | grep -oP '^\d+\.\d+')
git checkout "v${KERNEL_VERSION}" 2>/dev/null || echo "  (using default branch)"
sudo ./install.sh
# Add overlay if not present
if ! grep -q "seeed-2mic-voicecard" /boot/firmware/config.txt 2>/dev/null; then
  echo "dtoverlay=seeed-2mic-voicecard" | sudo tee -a /boot/firmware/config.txt
fi

echo "[5/8] Installing Node.js dependencies..."
cd "$PI_DIR"
npm install

echo "[6/8] Setting up data directory..."
mkdir -p "$PI_DIR/data"

echo "[7/9] Setting default volume..."
amixer -c 0 set Speaker 60% 2>/dev/null || true
amixer -c 0 set Capture 40 2>/dev/null || true
amixer -c 0 set "ADC PCM" 200 2>/dev/null || true
sudo alsactl store

echo "[8/9] Setting up systemd service..."
cat > /tmp/ninja.service << EOF
[Unit]
Description=Ninja Desk Companion
After=network.target sound.target

[Service]
Type=simple
User=$(whoami)
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

echo "[9/9] Setting up port 80 redirect..."
sudo iptables -t nat -C PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8888 2>/dev/null || \
  sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8888
sudo sh -c 'iptables-save > /etc/iptables.rules'
if [ ! -f /etc/network/if-pre-up.d/iptables ]; then
  sudo sh -c 'printf "#!/bin/sh\niptables-restore < /etc/iptables.rules\n" > /etc/network/if-pre-up.d/iptables'
  sudo chmod +x /etc/network/if-pre-up.d/iptables
fi

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
