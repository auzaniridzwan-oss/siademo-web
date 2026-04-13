import { FARE_BUCKETS } from '../data/flights.js';

/** Index of the Value fare bucket; API base price is stored here when present. */
const VALUE_FARE_INDEX = FARE_BUCKETS.indexOf('Value');

/**
 * @param {number} offset
 * @returns {string}
 */
function arrivalDaySuffix(offset) {
  if (offset <= 0) return '';
  if (offset === 1) return ' (+1 day)';
  return ` (+${offset} days)`;
}

/**
 * Whole SGD amounts with thousands separators (no cents).
 * @param {number} amount
 * @returns {string}
 */
function formatSgdWhole(amount) {
  const n = Math.round(amount);
  return `SGD ${n.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`;
}

/**
 * @param {{ origin_code?: string, destination_code?: string } | null | undefined} routeCodes
 * @param {{ originAirportCode?: string, destinationAirportCode?: string }} f
 * @returns {{ o: string, d: string }}
 */
function resolveRouteCodes(routeCodes, f) {
  const o =
    (f.originAirportCode && String(f.originAirportCode).trim()) ||
    (routeCodes?.origin_code && String(routeCodes.origin_code).trim()) ||
    '';
  const d =
    (f.destinationAirportCode && String(f.destinationAirportCode).trim()) ||
    (routeCodes?.destination_code && String(routeCodes.destination_code).trim()) ||
    '';
  return { o, d };
}

/**
 * Full airport names for the page header, falling back to IATA codes when names are missing.
 * @param {{ originAirportName?: string, destinationAirportName?: string }} f
 * @param {{ o: string, d: string }} headerCodes
 * @returns {{ origin: string, destination: string }}
 */
function resolveHeaderRouteLabels(f, headerCodes) {
  const origin = (f.originAirportName && String(f.originAirportName).trim()) || headerCodes.o;
  const destination =
    (f.destinationAirportName && String(f.destinationAirportName).trim()) || headerCodes.d;
  return { origin, destination };
}

/**
 * When Value (`prices[VALUE_FARE_INDEX]`) is set, derives Lite/Standard/Flexi from that base for display; otherwise returns the raw bucket price (for legacy mock rows).
 * @param {(number|null|undefined)[]} prices
 * @param {number} bucketIndex
 * @returns {number|null}
 */
function getDisplayPriceForBucket(prices, bucketIndex) {
  const base = prices[VALUE_FARE_INDEX];
  if (base != null && Number.isFinite(base)) {
    const multipliers = [0.85, 1, 1.2, 1.3];
    return base * multipliers[bucketIndex];
  }
  const raw = prices[bucketIndex];
  return raw != null && Number.isFinite(raw) ? raw : null;
}

/**
 * Renders the flight search results list. When `data.flights[n].prices[1]` (Value) is set, Lite/Standard/Flexi display amounts are derived from that API base at render time.
 * @param {{ flights: Array<{ id: string, flightNumber: string, departureTime: string, arrivalTime: string, duration: string, prices: (number|null)[], originAirportName?: string, destinationAirportName?: string, originAirportCode?: string, destinationAirportCode?: string, aircraft?: string, arrivalDayOffset?: number }>, searchSummary?: string, routeCodes?: { origin_code: string, destination_code: string }, dateRangeLine?: string }} data
 * @returns {string}
 */
export function renderSearchResults(data) {
  const { flights, searchSummary, routeCodes, dateRangeLine } = data;

  const steps = ['Flights', 'Passengers', 'Review', 'Payment'];
  const stepper = `
    <div class="max-w-3xl mx-auto mb-10">
      <ol class="flex flex-wrap justify-between gap-2 text-xs md:text-sm">
        ${steps
          .map((label, i) => {
            const active = i === 0;
            return `<li class="flex-1 min-w-[4rem] text-center ${active ? 'text-sia-navy font-semibold border-b-2 border-sia-gold pb-2' : 'text-sia-text-muted border-b border-sia-border pb-2'}">${label}</li>`;
          })
          .join('')}
      </ol>
    </div>`;

  if (!flights.length) {
    return `
    <section class="bg-sia-tan py-12 flex-1">
      <div class="max-w-7xl mx-auto px-4">
        ${stepper}
        <p class="text-center text-sia-text-muted">No flights found for this search.</p>
        <p class="text-center text-sm mt-2 text-sia-text-muted">${searchSummary || ''}</p>
      </div>
    </section>`;
  }

  const f0 = flights[0];
  const headerCodes = resolveRouteCodes(routeCodes, f0);
  const headerLabels = resolveHeaderRouteLabels(f0, headerCodes);
  const pageRouteLine =
    headerLabels.origin && headerLabels.destination
      ? `<p class="text-center font-bold text-lg text-sia-navy">${headerLabels.origin} → ${headerLabels.destination}</p>`
      : '';
  const pageSubtitle = dateRangeLine
    ? `<p class="text-center text-sm text-sia-text-muted mt-1">${dateRangeLine}</p>`
    : searchSummary
      ? `<p class="text-center text-sm text-sia-text-muted mt-1">${searchSummary}</p>`
      : '';
  const pageHeaderBlock =
    pageRouteLine || pageSubtitle
      ? `<div class="mb-6">${pageRouteLine}${pageSubtitle}</div>`
      : '';

  const cards = flights
    .map((f) => {
      const cells = FARE_BUCKETS.map((_, i) => {
        const p = getDisplayPriceForBucket(f.prices, i);
        if (p == null) {
          return `<td class="px-2 py-3 text-center border-l border-sia-border text-sia-text-muted text-xs first:border-l-0">Sold out</td>`;
        }
        return `<td class="px-2 py-3 text-center border-l border-sia-border first:border-l-0"><span class="text-sia-gold font-semibold">${formatSgdWhole(p)}</span></td>`;
      }).join('');

      const offset =
        typeof f.arrivalDayOffset === 'number' && Number.isFinite(f.arrivalDayOffset)
          ? Math.max(0, Math.floor(f.arrivalDayOffset))
          : 0;
      const arrSuffix = arrivalDaySuffix(offset);

      const { o: oc, d: dc } = resolveRouteCodes(routeCodes, f);
      const cardRouteHeader =
        oc && dc
          ? `<p class="text-center font-bold text-base text-sia-navy mb-3">${oc} → ${dc}</p>`
          : '';

      const aircraftLine = f.aircraft && String(f.aircraft).trim() ? f.aircraft : '—';

      return `
      <article class="bg-white border border-sia-border rounded-sm shadow-sm mb-4 overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-0">
          <div class="md:col-span-4 p-4 md:p-6 bg-sia-muted/40 border-b md:border-b-0 md:border-r border-sia-border">
            ${cardRouteHeader}
            <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xl font-semibold text-sia-navy">
              <p class="text-center m-0">${f.departureTime}</p>
              <span class="flex justify-center text-sia-text-muted" aria-hidden="true"><i class="fa-solid fa-arrow-right text-base"></i></span>
              <p class="text-center m-0">${f.arrivalTime}${arrSuffix}</p>
            </div>
            <p class="text-center text-sm mt-2 text-sia-navy">${f.duration}</p>
            <p class="text-center text-xs text-sia-text-muted mt-3">${f.flightNumber} · ${aircraftLine}</p>
          </div>
          <div class="md:col-span-8 overflow-x-auto">
            <table class="w-full text-sm min-w-[280px]">
              <thead>
                <tr class="bg-sia-navy text-white">
                  ${FARE_BUCKETS.map((b) => `<th class="px-2 py-2 text-center font-normal text-xs ${b !== 'Lite' ? 'border-l border-white/20' : ''}">${b}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  ${cells}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>`;
    })
    .join('');

  return `
  <section class="bg-sia-tan py-10 flex-1 fade-view">
    <div class="max-w-7xl mx-auto px-4">
      ${stepper}
      ${pageHeaderBlock}
      <div class="space-y-4">${cards}</div>
    </div>
  </section>`;
}
