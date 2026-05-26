#!/bin/bash
set -e
echo "Installing ninja service..."
sudo cp "$(dirname "$0")/../systemd/ninja.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ninja
echo "Done. Start with: sudo systemctl start ninja"
echo "View logs: journalctl -u ninja -f"
