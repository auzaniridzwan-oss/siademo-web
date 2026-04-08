/**
 * Persists app state under `ar_app_`-prefixed keys. Pass **suffix only** to get/set/remove.
 */
export const StorageManager = {
  PREFIX: 'ar_app_',

  /**
   * @param {string} key - Suffix only (e.g. `user_session`).
   * @param {unknown} value - JSON-serializable value.
   * @returns {void}
   */
  set(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(`${this.PREFIX}${key}`, serializedValue);
    } catch (e) {
      console.error('[Storage] Error saving to disk', e);
    }
  },

  /**
   * @param {string} key - Suffix only.
   * @param {unknown} [defaultValue]
   * @returns {unknown}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`${this.PREFIX}${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /**
   * @param {string} key - Suffix only.
   * @returns {void}
   */
  remove(key) {
    localStorage.removeItem(`${this.PREFIX}${key}`);
  },

  /** @returns {void} */
  clearSession() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(this.PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};
