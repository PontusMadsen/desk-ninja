/**
 * OLED display module — spawns Python subprocess for SH1106 OLED.
 * Drop-in replacement for display.js (ESP32 streaming).
 */
import { spawn } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let proc = null;
let currentFace = 'idle';
let playOnceMode = false;

function sendFace(state) {
  currentFace = state;
  if (proc && proc.stdin.writable) {
    proc.stdin.write(state + '\n');
  }
}

export function setFace(state) {
  if (playOnceMode) return; // don't interrupt play-once
  if (state === currentFace) return; // dedup
  sendFace(state);
}

export function playOnce(animName) {
  playOnceMode = true;
  currentFace = ''; // force resend
  sendFace(animName);
  const dir = join(__dirname, '..', 'oled-frames', animName);
  let frameCount = 30;
  try {
    frameCount = readdirSync(dir).filter(f => f.endsWith('.pbm')).length || 30;
  } catch {}
  // ~5fps effective on SH1106 I2C (measured)
  const duration = Math.max((frameCount / 5) * 1000, 2000);
  return new Promise(resolve => {
    setTimeout(() => {
      playOnceMode = false;
      sendFace('idle');
      resolve();
    }, duration);
  });
}

export function buzz() {
  // No buzzer on Zero
}

export async function init() {
  return new Promise((resolve, reject) => {
    proc = spawn('python3', [join(__dirname, 'oled-display.py')], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('[OLED] ready')) {
        console.log('[DISPLAY] OLED connected');
        setFace('idle');
        resolve();
      }
    });

    proc.stderr.on('data', (data) => {
      console.error('[OLED]', data.toString().trim());
    });

    proc.on('close', (code) => {
      console.error(`[OLED] process exited with code ${code}`);
    });

    proc.on('error', (err) => {
      console.error('[OLED] spawn error:', err.message);
      reject(err);
    });

    setTimeout(() => resolve(), 5000);
  });
}

export function close() {
  if (proc) {
    proc.kill();
    proc = null;
  }
}
