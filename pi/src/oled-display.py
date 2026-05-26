#!/usr/bin/env python3
"""
OLED face display for the Ninja desk companion.
Runs as a subprocess, receives face commands on stdin.
Plays pre-rendered 1-bit animation frames on SH1106 128x64 I2C OLED.
"""
import sys
import os
import time
import threading
import glob
from luma.core.interface.serial import i2c
from luma.oled.device import sh1106
from PIL import Image

FRAMES_DIR = os.path.join(os.path.dirname(__file__), '..', 'oled-frames')

serial = i2c(port=1, address=0x3c)
device = sh1106(serial, width=128, height=64)

# Face state → folder mapping
FACE_MAP = {
    'idle': 'default',
    'happy': 'smile',
    'sad': 'cry',
    'angry': 'angry',
    'surprised': 'WHAT',
    'sleeping': 'sleeping',
    'confused': 'dizzy',
    'focused': 'squint',
    'scared': 'scared',
    'talking': 'talking',
}

# Cache loaded frames
frame_cache = {}

def load_frames(name):
    if name in frame_cache:
        return frame_cache[name]
    folder = os.path.join(FRAMES_DIR, name)
    if not os.path.isdir(folder):
        return []
    files = sorted(glob.glob(os.path.join(folder, '*.pbm')))
    frames = [Image.open(f).convert('1') for f in files]
    frame_cache[name] = frames
    return frames

# Animation state
current_face = 'idle'
lock = threading.Lock()

def animate():
    frame_idx = 0
    last_face = None

    while True:
        with lock:
            face = current_face

        anim_name = FACE_MAP.get(face, face)
        frames = load_frames(anim_name)

        if not frames:
            # Fallback to default
            frames = load_frames('default')

        if not frames:
            time.sleep(0.1)
            continue

        # Reset frame index on face change
        if face != last_face:
            frame_idx = 0
            last_face = face

        if frame_idx >= len(frames):
            frame_idx = 0

        device.display(frames[frame_idx])
        frame_idx += 1

        time.sleep(0.05)  # ~20fps target, I2C limits to ~5fps actual

def main():
    global current_face

    # Preload default face
    load_frames('default')

    # Start animation thread
    anim_thread = threading.Thread(target=animate, daemon=True)
    anim_thread.start()

    print("[OLED] ready", flush=True)

    # Read face commands from stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        with lock:
            current_face = line
        print(f"[OLED] face={line}", flush=True)

if __name__ == '__main__':
    main()
