import * as braze from '@braze/web-sdk';
import { AppLogger } from './AppLogger.js';
import { StorageManager } from './StorageManager.js';

export const EVENT_LOGGED = 'EVENT_LOGGED';
export const IAM_RECEIVED = 'IAM_RECEIVED';
export const CONTENT_CARDS_UPDATED = 'CONTENT_CARDS_UPDATED';

/**
 * Singleton-style Braze wrapper: init, user, logging, and pub/sub for overlays.
 */
class BrazeManagerClass {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    this._initialized = false;
  }

  /**
   * @param {string} eventType
   * @param {Function} callback
   * @returns {() => void}
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
      }
    };
  }

  /**
   * @param {string} eventType
   * @param {unknown} payload
   * @returns {void}
   */
  notify(eventType, payload) {
    const set = this.listeners.get(eventType);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        AppLogger.warn('[SDK]', 'BrazeManager listener error', e);
      }
    });
  }

  /**
   * @param {string} apiKey
   * @param {string} baseUrl - SDK endpoint host, e.g. sdk.iad-03.braze.com
   * @returns {boolean}
   */
  initialize(apiKey, baseUrl) {
    if (!apiKey || !baseUrl) {
      AppLogger.warn('[SDK]', 'Braze init skipped — missing VITE_BRAZE_SDK_KEY or VITE_BRAZE_SDK_URL');
      return false;
    }
    try {
      const ok = braze.initialize(apiKey, {
        baseUrl,
        enableLogging: false,
        noCookies: false,
      });
      this._initialized = ok;
      if (ok) {
        braze.automaticallyShowInAppMessages();
        try {
          braze.subscribeToInAppMessage(() => {
            this.notify(IAM_RECEIVED, { at: Date.now() });
          });
        } catch (e) {
          AppLogger.debug('[SDK]', 'subscribeToInAppMessage unavailable', e);
        }
        try {
          braze.subscribeToContentCardsUpdates(() => {
            this.notify(CONTENT_CARDS_UPDATED, { at: Date.now() });
          });
        } catch (e) {
          AppLogger.debug('[SDK]', 'subscribeToContentCardsUpdates unavailable', e);
        }
        AppLogger.info('[SDK]', 'Braze Web SDK initialized', { baseUrl });
      }
      return ok;
    } catch (e) {
      AppLogger.warn('[SDK]', 'Braze initialize failed', e);
      return false;
    }
  }

  /**
   * @param {string} externalId
   * @returns {void}
   */
  login(externalId) {
    try {
      if (typeof braze.changeUser === 'function') {
        braze.changeUser(externalId);
      }
      braze.openSession();
      AppLogger.info('[AUTH]', 'Braze login / session opened', { externalIdPreview: `${externalId.slice(0, 3)}…` });
    } catch (e) {
      AppLogger.warn('[AUTH]', 'Braze login failed', e);
    }
  }

  /**
   * @param {string} key
   * @param {string|number|boolean} value
   * @returns {void}
   */
  setCustomAttribute(key, value) {
    try {
      const user = braze.getUser?.();
      user?.setCustomAttribute?.(key, value);
    } catch (e) {
      AppLogger.warn('[SDK]', 'setCustomAttribute failed', e);
    }
  }

  /**
   * @param {string} name
   * @param {Record<string, unknown>} [props]
   * @returns {void}
   */
  logCustomEvent(name, props) {
    try {
      if (typeof braze.logCustomEvent === 'function') {
        braze.logCustomEvent(name, props);
      }
    } catch (e) {
      AppLogger.warn('[SDK]', 'logCustomEvent failed', e);
    }
    this.notify(EVENT_LOGGED, { name, props });
  }

  /** @returns {Record<string, unknown>} */
  getUserData() {
    try {
      const user = braze.getUser?.();
      if (!user) return {};
      return {
        userId: user.getUserId?.() ?? null,
      };
    } catch {
      return {};
    }
  }

  /**
   * On load: align SDK with persisted `user_id`.
   * @returns {void}
   */
  syncUserFromStorage() {
    const id = StorageManager.get('user_id', null);
    if (id && typeof id === 'string' && id.trim()) {
      try {
        braze.changeUser(id.trim());
      } catch (e) {
        AppLogger.debug('[SDK]', 'changeUser on load skipped', e);
      }
    }
  }

  /**
   * @param {{ firstName: string, lastName: string, email: string, phone?: string }} profile
   * @returns {{ ok: boolean, externalId: string, error?: string }}
   */
  completeRegistration(profile) {
    const externalId = profile.email.trim().toLowerCase();
    try {
      braze.changeUser(externalId);
      braze.openSession();

      const user = braze.getUser?.();
      if (user) {
        user.setEmail?.(profile.email.trim().toLowerCase());
        user.setFirstName?.(profile.firstName.trim());
        user.setLastName?.(profile.lastName.trim());
        if (profile.phone) {
          user.setPhoneNumber?.(profile.phone);
        }
      }

      const now = new Date().toISOString();
      this.setCustomAttribute('registration_completed_at', now);
      this.setCustomAttribute('registration_source', 'flight_search_gate');

      this.logCustomEvent('Registration - Completed', {
        has_phone: !!profile.phone,
      });

      braze.requestImmediateDataFlush?.();
      return { ok: true, externalId };
    } catch (e) {
      AppLogger.warn('[AUTH]', 'completeRegistration failed', e);
      return { ok: false, externalId, error: 'Registration failed' };
    }
  }

  /**
   * Expose for hero / IAM-driven updates (placeholder for future Content Cards).
   * @param {{ title?: string, cta?: string }} patch
   */
  broadcastContentPatch(patch) {
    this.notify('HERO_CONTENT', patch);
  }
}

export const BrazeManager = new BrazeManagerClass();
