import { StorageManager } from '../managers/StorageManager.js';

/**
 * Returns the Braze external id from persisted auth: `user_id` first, then `user_session.external_id`.
 * @returns {string | null}
 */
export function getPersistedExternalId() {
  const uid = StorageManager.get('user_id', null);
  if (typeof uid === 'string' && uid.trim()) return uid.trim();
  const session = StorageManager.get('user_session', null);
  if (
    session &&
    typeof session === 'object' &&
    typeof session.external_id === 'string' &&
    session.external_id.trim()
  ) {
    return session.external_id.trim();
  }
  return null;
}

/**
 * Persists Braze external id and a minimal session record (no PII beyond email-as-id used elsewhere).
 * @param {string} externalId
 * @param {'login' | 'registration'} source
 * @returns {void}
 */
export function persistAuthSession(externalId, source) {
  const id = externalId.trim();
  StorageManager.set('user_id', id);
  StorageManager.set('user_session', {
    external_id: id,
    logged_in_at: new Date().toISOString(),
    source,
  });
}
