import SerialTransport from '../src/transport/serial.js';
import logger from '../src/logger.js';

const uart = new SerialTransport({ port: '/dev/serial0', baudRate: 115200 });

const states = ['happy', 'sad', 'surprised', 'confused', 'idle', 'sleeping'];
let idx = 0;

uart.on('event', (msg) => {
  logger.info({ event: msg }, 'ESP32 event');
});

await uart.open();
logger.info('UART test started — cycling face states every 3s');

// Send a ping first
uart.send({ cmd: 'ping' });

setInterval(() => {
  const state = states[idx % states.length];
  logger.info({ state }, 'Sending face command');
  uart.send({ cmd: 'face', state });
  idx++;
}, 3000);

// Keep alive
process.on('SIGINT', async () => {
  logger.info('Shutting down');
  await uart.close();
  process.exit(0);
});
