// Test the voice pipeline: record → STT → Claude → TTS → play
import { recordAudio } from '../src/audio/record.js';
import { transcribe } from '../src/stt/groq.js';
import { respond } from '../src/llm/claude.js';
import { synthesize } from '../src/tts/voicevox.js';
import { playFile } from '../src/audio/playback.js';
import logger from '../src/logger.js';

logger.info('=== Voice Pipeline Test ===');
logger.info('Recording 5 seconds — SPEAK NOW!');

const audio = await recordAudio(5);

logger.info('Transcribing...');
const text = await transcribe(audio);
logger.info({ text }, 'You said');

if (!text || text.length < 2) {
  logger.info('No speech detected');
  process.exit(0);
}

logger.info('Thinking...');
const reply = await respond(text);
logger.info({ reply }, 'Ninja says');

if (reply) {
  logger.info('Speaking...');
  const tts = await synthesize(reply.text);
  if (tts) {
    await playFile(tts);
  }
}

logger.info('Done!');
process.exit(0);
