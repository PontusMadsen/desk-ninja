/**
 * Display streamer — sends JPEG frames to ESP32 over UART
 * The ESP32 is a dumb display: we control all animation logic here.
 * Uses ack-gated sending: waits for ESP32 'K' before sending next frame.
 */
import { SerialPort } from 'serialport';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const BAUD = 921600;
const FRAME_DIR = join(dirname(fileURLToPath(import.meta.url)), '../frames');
const SERIAL_PATH = '/dev/serial0';

const FACE_MAP = {
  idle: 'default',
  happy: 'smile',
  sad: 'cry',
  angry: 'angry',
  surprised: 'WHAT',
  sleeping: 'sleeping',
  confused: 'dizzy',
  focused: 'squint',
  scared: 'scared',
  talking: 'talking',
};

let port = null;
let currentAnim = null;
let frames = [];
let frameIdx = 0;
let running = false;
let waitingForAck = false;
let playOnceMode = false;
let playOnceResolve = null;

function loadAnimation(name) {
  const dir = join(FRAME_DIR, name);
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
    return files.map(f => readFileSync(join(dir, f)));
  } catch {
    console.error(`[DISPLAY] Animation not found: ${name}`);
    return [];
  }
}

function sendFrame(data) {
  if (!port || !port.isOpen) return;
  const header = Buffer.alloc(5);
  header[0] = 0xFF;
  header.writeUInt32LE(data.length, 1);
  port.write(Buffer.concat([header, data]));
  waitingForAck = true;
}

function sendNextFrame() {
  if (!running || frames.length <= 1 || waitingForAck) return;
  frameIdx++;

  if (frameIdx >= frames.length) {
    if (playOnceMode) {
      // Animation finished — resolve the promise
      playOnceMode = false;
      running = false;
      if (playOnceResolve) {
        playOnceResolve();
        playOnceResolve = null;
      }
      return;
    }
    frameIdx = 0; // loop
  }

  sendFrame(frames[frameIdx]);
}

export function setFace(state) {
  if (playOnceMode) return; // don't interrupt play-once animations

  const animName = FACE_MAP[state] || state;
  if (animName === currentAnim && running) return;

  // Stop current animation
  running = false;
  waitingForAck = false;
  currentAnim = animName;
  frames = loadAnimation(animName);
  frameIdx = 0;

  if (frames.length === 0) return;

  // Exit and re-enter streaming to flush ESP32 state
  port.write(Buffer.from([0x00])); // exit stream
  setTimeout(() => {
    port.write(Buffer.from('{"cmd":"stream"}\n'));
    setTimeout(() => {
      running = true;
      sendFrame(frames[0]);
    }, 50);
  }, 50);
}

/**
 * Play an animation once (all frames), then resolve.
 * Cannot be interrupted by setFace until complete.
 */
export function playOnce(animName) {
  return new Promise((resolve) => {
    playOnceResolve = resolve;

    // Stop current animation
    running = false;
    waitingForAck = false;
    currentAnim = animName;
    frames = loadAnimation(animName);
    frameIdx = 0;

    if (frames.length === 0) {
      resolve();
      return;
    }

    // Set playOnceMode AFTER loading frames
    playOnceMode = true;

    // Exit and re-enter streaming
    port.write(Buffer.from([0x00]));
    setTimeout(() => {
      port.write(Buffer.from('{"cmd":"stream"}\n'));
      setTimeout(() => {
        running = true;
        sendFrame(frames[0]);
      }, 100);
    }, 100);
  });
}

export function buzz() {
  if (!port || !port.isOpen) return;
  running = false;
  port.write(Buffer.from([0x00]));
  setTimeout(() => {
    port.write(Buffer.from('{"cmd":"buzz"}\n'));
    setTimeout(() => {
      port.write(Buffer.from('{"cmd":"stream"}\n'));
      setTimeout(() => {
        running = true;
        if (frames.length > 0) sendFrame(frames[frameIdx]);
      }, 200);
    }, 200);
  }, 100);
}

export async function init() {
  return new Promise((resolve, reject) => {
    port = new SerialPort({
      path: SERIAL_PATH,
      baudRate: BAUD,
    });

    port.on('open', () => {
      console.log(`[DISPLAY] Connected at ${BAUD} baud`);

      // Reset ESP32 via RTS toggle
      console.log('[DISPLAY] Resetting ESP32...');
      port.set({ rts: true });
      setTimeout(() => {
        port.set({ rts: false });
      }, 100);

      // Wait for ESP32 to boot, then enter streaming mode with retry
      const tryStream = (attempts) => {
        port.flush();
        // Exit any existing stream mode, flush buffer, then ping
        port.write(Buffer.from([0x00]));
        port.write(Buffer.from('\n'));
        setTimeout(() => port.write(Buffer.from('{"cmd":"ping"}\n')), 200);

        let gotPong = false;
        const onData = (chunk) => {
          if (chunk.toString().includes('pong')) {
            gotPong = true;
            port.removeListener('data', onData);
            // Set up ack handler for streaming
            port.on('data', (chunk) => {
              for (let i = 0; i < chunk.length; i++) {
                if (chunk[i] === 0x4B) {
                  waitingForAck = false;
                  sendNextFrame();
                }
              }
            });
            // Enter streaming mode
            port.write(Buffer.from('{"cmd":"stream"}\n'));
            console.log('[DISPLAY] Streaming mode active');
            setTimeout(() => {
              setFace('idle');
              resolve();
            }, 500);
          }
        };
        port.on('data', onData);

        setTimeout(() => {
          if (!gotPong) {
            port.removeListener('data', onData);
            if (attempts > 0) {
              console.log(`[DISPLAY] ESP32 not ready, retrying... (${attempts} left)`);
              setTimeout(() => tryStream(attempts - 1), 2000);
            } else {
              console.error('[DISPLAY] ESP32 not responding after retries');
              resolve(); // start anyway, display just won't work
            }
          }
        }, 2000);
      };

      setTimeout(() => tryStream(10), 2000);
    });

    port.on('error', (err) => {
      console.error('[DISPLAY] Serial error:', err.message);
      reject(err);
    });
  });
}

export function close() {
  running = false;
  if (port && port.isOpen) {
    port.write(Buffer.from([0x00]));
    setTimeout(() => port.close(), 200);
  }
}
