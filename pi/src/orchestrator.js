import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

import logger from './logger.js';
import { readFileSync } from 'fs';

// Display — use OLED on Zero, ESP32 streaming on Pi 4
const DISPLAY_MODE = process.env.DISPLAY_MODE || 'esp32';
const displayMod = DISPLAY_MODE === 'oled'
  ? await import('./oled-display.js')
  : await import('./display.js');
const { init: displayInit, setFace, playOnce, close: displayClose } = displayMod;
const buzz = displayMod.buzz || (() => {});

// Voice pipeline imports
import { recordAudio } from './audio/record.js';
import { playFile, speakText } from './audio/playback.js';
import { transcribe } from './stt/groq.js';
import { respondStreaming } from './llm/claude-stream.js';
import { synthesize } from './tts/voicevox.js';
import WakeWordListener from './wakeword/index.js';
import { playStockPhrase, preloadStockPhrases } from './audio/stock-phrases.js';
import IdleBehaviors from './idle-behaviors.js';
import { startWebServer } from './web/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AUDIO_DEVICE = process.env.AUDIO_DEVICE || 'plughw:UACDemoV10,0';

import { hasAngryKeyword, angryReaction, moodFace, wakeWordDetected, thinking, speaking } from './face-reactions.js';

let voiceActive = false;
let wakeListener = null;
let idle = null;
const conversationLog = [];

const MAX_CONVERSATION_TURNS = 5;

async function doSingleTurn(text) {
  logger.info({ text }, 'User said');

  // Stream LLM → TTS per sentence
  const sentences = [];
  let fullText = '';

  const onSentence = (sentence) => {
    logger.info({ sentence: sentence.substring(0, 50) }, 'Sentence ready');
    fullText += sentence + ' ';
    sentences.push(sentence);
  };

  setFace('focused');
  const result = await respondStreaming(text, onSentence);

  if (!result) {
    setFace('confused');
    await speakText('hmm, I cannot think right now', AUDIO_DEVICE);
    return null;
  }

  // Log conversation (persistent)
  const { addConversation } = await import('./web/data.js');
  addConversation(text, fullText.trim());

  // Play sentences in order
  setFace('talking');
  for (const sentence of sentences) {
    try {
      const file = await synthesize(sentence);
      if (file) await playFile(file, AUDIO_DEVICE);
    } catch (e) {
      logger.warn({ err: e.message }, 'Sentence TTS failed');
    }
  }

  // Angry keyword trigger
  if (hasAngryKeyword(fullText)) {
    const angryAnim = angryReaction();
    logger.info({ anim: angryAnim }, 'Angry trigger!');
    await new Promise(r => setTimeout(r, 200));
    await playOnce(angryAnim);
  } else {
    const face = moodFace(result.mood || 'happy');
    setFace(face);
    await new Promise(r => setTimeout(r, 1000));
  }

  return result;
}

async function handleVoiceTurn() {
  if (voiceActive) return;
  voiceActive = true;
  if (idle) {
    idle.noteInteraction();
    idle.enabled = false;
  }

  try {
    if (wakeListener) wakeListener.stop();

    // Pause BT audio and prevent restart during voice turn
    try {
      execSync('touch /tmp/ninja-voice-active');
      execSync('sudo pkill -f bluealsa-aplay 2>/dev/null');
    } catch {}

    // First turn — triggered by wake word (force overrides idle animations)
    setFace('surprised', true);
    await new Promise(r => setTimeout(r, 500));

    let audio = await recordAudio(5);
    if (!audio) { setFace('idle'); return; }
    setFace('focused');
    playStockPhrase(AUDIO_DEVICE);

    let text = await transcribe(audio);
    if (!text || text.length < 2) {
      logger.info('No speech detected');
      setFace('idle');
      return;
    }

    let result = await doSingleTurn(text);
    if (!result) return;

    // Conversation loop — listen for follow-ups without wake word
    for (let turn = 1; turn < MAX_CONVERSATION_TURNS; turn++) {
      // Listen for follow-up (3 seconds)
      setFace('surprised');
      logger.info({ turn }, 'Listening for follow-up...');
      await new Promise(r => setTimeout(r, 300));

      audio = await recordAudio(5);
      if (!audio) {
        logger.info('Silent recording, ending conversation');
        break;
      }
      setFace('focused');

      text = await transcribe(audio);
      if (!text || text.length < 2) {
        logger.info('No follow-up detected, ending conversation');
        break;
      }

      result = await doSingleTurn(text);
      if (!result) break;
    }

    setFace('idle');

  } catch (e) {
    logger.error({ err: e.message }, 'Voice turn failed');
    setFace('confused');
  } finally {
    voiceActive = false;
    if (idle) idle.enabled = true;
    // Allow BT audio to resume
    try { execSync('rm -f /tmp/ninja-voice-active'); } catch {}
    // Restart wake word listener with delay to avoid TTS echo
    if (wakeListener) {
      wakeListener.stop();
      await new Promise(r => setTimeout(r, 5000));
      wakeListener.start();
    }
  }
}

async function main() {
  logger.info('Little Gamers Ninja — starting orchestrator');

  // Init streaming display
  await displayInit();
  logger.info('Display connected');

  // Start idle behaviors (now uses setFace directly)
  idle = new IdleBehaviors({ setFace, playOnce });

  // Pre-generate stock phrases with Google TTS voice
  await preloadStockPhrases();

  // Start wake word listener
  wakeListener = new WakeWordListener();
  wakeListener.on('wake', () => {
    logger.info('Wake word triggered!');
    handleVoiceTurn();
  });
  wakeListener.start();

  // Set initial face
  setFace('idle');

  // Start idle behavior loop
  idle.start();

  // Start web UI
  startWebServer({
    get currentFace() { return 'idle'; },
    get wakeWordActive() { return wakeListener?.running || false; },
    get voiceActive() { return voiceActive; },
    conversationLog,
    framesDir: join(__dirname, '..', 'frames'),
    setFace,
    playOnce,
    startWakeWord: () => wakeListener?.start(),
    stopWakeWord: () => wakeListener?.stop(),
  });

  logger.info('Orchestrator running — say "Hey Cookie" to talk');

  // Handle shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down');
    idle.stop();
    setFace('sleeping');
    await new Promise(r => setTimeout(r, 500));
    displayClose();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Orchestrator failed');
  process.exit(1);
});
