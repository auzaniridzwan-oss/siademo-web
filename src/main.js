import './styles/main.css';
import 'flowbite';

import { setAppLoggerBrazeErrorHook } from './managers/AppLogger.js';
import { BrazeManager } from './managers/BrazeManager.js';
import { bootstrapApp } from './app.js';

setAppLoggerBrazeErrorHook((msg) => {
  try {
    BrazeManager.logCustomEvent('App_Error', { message: String(msg).slice(0, 200) });
  } catch {
    /* SDK optional */
  }
});

bootstrapApp();
