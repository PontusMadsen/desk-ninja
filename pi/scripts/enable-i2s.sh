#!/bin/bash
# Enable I²S overlays for INMP441 mic + MAX98357A amp
# Run once, then reboot
set -e
echo "Enabling I²S audio overlays..."
echo "# I²S audio for Little Gamers Ninja" | sudo tee -a /boot/firmware/config.txt
echo "dtoverlay=googlevoicehat-soundcard" | sudo tee -a /boot/firmware/config.txt
echo "Done. Reboot to apply: sudo reboot"
