import { FARE_BUCKETS } from '../data/flights.js';

/**
 * @param {{ flights: Array<{ id: string, flightNumber: string, departureTime: string, arrivalTime: string, duration: string, prices: (number|null)[] }>, searchSummary?: string }} data
 * @returns {string}
 */
export function renderSearchResults(data) {
  const { flights, searchSummary } = data;

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

  const cards = flights
    .map((f) => {
      const cells = FARE_BUCKETS.map((bucket, i) => {
        const p = f.prices[i];
        if (p == null) {
          return `<td class="px-2 py-3 text-center border-l border-sia-border text-sia-text-muted text-xs">Sold out</td>`;
        }
        return `<td class="px-2 py-3 text-center border-l border-sia-border"><span class="text-sia-gold font-semibold">S$ ${p.toFixed(0)}</span><span class="block text-[0.65rem] text-sia-text-muted">Seats</span></td>`;
      }).join('');
      return `
      <article class="bg-white border border-sia-border rounded-sm shadow-sm mb-4 overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-0">
          <div class="md:col-span-4 p-4 md:p-6 bg-sia-muted/40 border-b md:border-b-0 md:border-r border-sia-border">
            <p class="text-2xl font-semibold text-sia-navy">${f.departureTime}</p>
            <p class="text-sia-text-muted text-sm">to ${f.arrivalTime}</p>
            <p class="text-sm mt-2">${f.duration}</p>
            <p class="text-xs text-sia-text-muted mt-2">Flight ${f.flightNumber}</p>
          </div>
          <div class="md:col-span-8 overflow-x-auto">
            <table class="w-full text-sm min-w-[320px]">
              <thead>
                <tr class="bg-sia-navy text-white">
                  <th class="px-2 py-2 text-left font-medium"></th>
                  ${FARE_BUCKETS.map((b) => `<th class="px-2 py-2 text-center font-normal text-xs border-l border-white/20">${b}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="px-2 py-3 text-sia-text-muted text-xs">Fare</td>
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
      ${searchSummary ? `<p class="text-sm text-sia-text-muted mb-6">${searchSummary}</p>` : ''}
      <div class="space-y-4">${cards}</div>
    </div>
  </section>`;
}
