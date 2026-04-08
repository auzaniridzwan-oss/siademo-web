import dayjs from 'dayjs';
import { DEMO_DESTINATION_CODES, DEMO_ORIGIN_CODE } from '../config/flightSearchScope.js';

/**
 * @param {unknown} obj
 * @returns {obj is { origin_code: string, destination_code: string, trip_type: string, depart_date: string, return_date: string, cabin_class: string, passengers: string }}
 */
export function isValidBookingSearch(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (obj);
  if (o.origin_code !== DEMO_ORIGIN_CODE) return false;
  if (typeof o.destination_code !== 'string' || !DEMO_DESTINATION_CODES.includes(o.destination_code)) return false;
  if (typeof o.trip_type !== 'string' || !o.trip_type) return false;
  if (typeof o.depart_date !== 'string' || !dayjs(o.depart_date).isValid()) return false;
  if (typeof o.return_date !== 'string' || !dayjs(o.return_date).isValid()) return false;
  if (dayjs(o.return_date).isBefore(dayjs(o.depart_date), 'day')) return false;
  if (typeof o.cabin_class !== 'string') return false;
  if (typeof o.passengers !== 'string') return false;
  return true;
}

/**
 * @param {object} raw
 * @returns {{ ok: boolean, payload?: object, error?: string }}
 */
export function buildBookingPayload(raw) {
  const {
    destination_code,
    trip_type,
    depart_date,
    return_date,
  } = raw;
  const payload = {
    origin_code: DEMO_ORIGIN_CODE,
    destination_code: String(destination_code || ''),
    trip_type: String(trip_type || ''),
    depart_date: String(depart_date || ''),
    return_date: String(return_date || ''),
    cabin_class: 'Economy',
    passengers: '1 Adult',
  };
  if (!isValidBookingSearch(payload)) {
    return { ok: false, error: 'Check destination and dates (return must be on or after departure).' };
  }
  return { ok: true, payload };
}
