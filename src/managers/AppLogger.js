import { StorageManager } from './StorageManager.js';

let brazeLogError = () => {};

/**
 * @param {(msg: string, data?: unknown) => void} fn
 */
export function setAppLoggerBrazeErrorHook(fn) {
  brazeLogError = fn;
}

/**
 * Centralized logging with ring buffer and optional Braze `App_Error` for ERROR level.
 */
export const AppLogger = {
  logs: [],
  MAX_LOGS: 100,

  get DEBUG_MODE() {
    return !!StorageManager.get('debug_mode', false);
  },

  /**
   * @param {'INFO'|'DEBUG'|'WARN'|'ERROR'} level
   * @param {'[UI]'|'[SDK]'|'[AUTH]'|'[STORAGE]'|'[SYSTEM]'} category
   * @param {string} message
   * @param {unknown} [data]
   * @returns {void}
   */
  log(level, category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, category, message, data };

    this.logs.push(logEntry);
    if (this.logs.length > this.MAX_LOGS) this.logs.shift();

    if (this.DEBUG_MODE || level === 'ERROR' || level === 'WARN' || level === 'INFO') {
      const color = this.getColor(level);
      console.log(
        `%c[${timestamp}] [${category}] [${level}]: ${message}`,
        `color: ${color}; font-weight: bold;`,
        data ?? '',
      );
    }

    if (level === 'ERROR') {
      try {
        brazeLogError(message, data);
      } catch {
        /* noop */
      }
    }
  },

  /**
   * @param {string} level
   * @returns {string}
   */
  getColor(level) {
    switch (level) {
      case 'ERROR':
        return '#ff4d4d';
      case 'WARN':
        return '#ffa500';
      case 'DEBUG':
        return '#7f8c8d';
      default:
        return '#2ecc71';
    }
  },

  /** @returns {Array<{timestamp:string,level:string,category:string,message:string,data?:unknown}>} */
  getLogs() {
    return this.logs.slice(-50);
  },

  /** @param {string} cat @param {string} msg @param {unknown} [data] */
  info(cat, msg, data) {
    this.log('INFO', cat, msg, data);
  },
  /** @param {string} cat @param {string} msg @param {unknown} [data] */
  debug(cat, msg, data) {
    this.log('DEBUG', cat, msg, data);
  },
  /** @param {string} cat @param {string} msg @param {unknown} [data] */
  warn(cat, msg, data) {
    this.log('WARN', cat, msg, data);
  },
  /** @param {string} cat @param {string} msg @param {unknown} [data] */
  error(cat, msg, data) {
    this.log('ERROR', cat, msg, data);
  },
};
