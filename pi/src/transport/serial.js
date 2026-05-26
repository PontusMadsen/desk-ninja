import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';
import logger from '../logger.js';

export default class SerialTransport extends EventEmitter {
  constructor(config = {}) {
    super();
    this.portPath = config.port || '/dev/serial0';
    this.baudRate = config.baudRate || 115200;
    this.port = null;
    this.parser = null;
  }

  async open() {
    this.port = new SerialPort({
      path: this.portPath,
      baudRate: this.baudRate,
      autoOpen: false,
    });

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

    this.parser.on('data', (line) => {
      try {
        const msg = JSON.parse(line.trim());
        if (msg.event) {
          this.emit('event', msg);
          this.emit(msg.event, msg);
        }
        logger.debug({ rx: msg }, 'UART rx');
      } catch (e) {
        logger.warn({ line }, 'UART: invalid JSON received');
      }
    });

    this.port.on('error', (err) => {
      logger.error({ err }, 'UART error');
      this.emit('error', err);
    });

    return new Promise((resolve, reject) => {
      this.port.open((err) => {
        if (err) {
          logger.error({ err }, 'Failed to open serial port');
          reject(err);
        } else {
          logger.info({ port: this.portPath, baudRate: this.baudRate }, 'UART opened');
          resolve();
        }
      });
    });
  }

  send(obj) {
    if (!this.port || !this.port.isOpen) {
      logger.warn('UART not open, dropping message');
      return;
    }
    const line = JSON.stringify(obj) + '\n';
    this.port.write(line);
    logger.debug({ tx: obj }, 'UART tx');
  }

  async close() {
    if (this.port && this.port.isOpen) {
      return new Promise((resolve) => this.port.close(resolve));
    }
  }
}
