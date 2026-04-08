import { DESTINATION_OPTIONS } from '../data/flights.js';

/**
 * Hero + tabbed booking widget (Book Trip active; other tabs placeholder).
 * @param {{ defaultDepart?: string, defaultReturn?: string, defaultDestination?: string }} [persisted]
 * @returns {string}
 */
export function renderHomeBooking(persisted = {}) {
  const destOptions = DESTINATION_OPTIONS.map(
    (d) =>
      `<option value="${d.code}" ${persisted.defaultDestination === d.code ? 'selected' : ''}>${d.label}</option>`,
  ).join('');

  const dep = persisted.defaultDepart || '';
  const ret = persisted.defaultReturn || '';

  return `
  <section class="relative min-h-[520px] flex flex-col justify-end">
    <div class="absolute inset-0 z-0">
      <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop" alt="" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-sia-navy/35"></div>
    </div>
    <div class="relative z-10 max-w-7xl mx-auto px-4 w-full pb-10 md:pb-14">
      <div class="max-w-xl text-white mb-6 md:mb-8 fade-view">
        <p class="text-sm uppercase tracking-widest text-white/90 mb-2">Fly with us</p>
        <h1 id="hero-title" class="font-display text-3xl md:text-4xl font-semibold leading-tight">Discover your next journey</h1>
        <button type="button" class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sia-gold hover:underline rounded-none" id="hero-cta">
          Discover More
          <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
        </button>
      </div>
      <div class="bg-white/95 backdrop-blur rounded-sm shadow-xl border border-white/40 max-w-5xl">
        <div class="border-b border-sia-border px-2 pt-2">
          <ul class="flex flex-wrap gap-1 text-sm" role="tablist">
            <li><button type="button" id="tab-book" class="tab-btn px-4 py-2 font-medium text-white bg-sia-navy rounded-t-sm" role="tab" aria-selected="true">Book Trip</button></li>
            <li><button type="button" id="tab-manage" class="tab-btn px-4 py-2 font-medium text-sia-text-muted hover:bg-sia-muted rounded-t-sm" role="tab" aria-selected="false">Manage Booking</button></li>
            <li><button type="button" id="tab-checkin" class="tab-btn px-4 py-2 font-medium text-sia-text-muted hover:bg-sia-muted rounded-t-sm" role="tab" aria-selected="false">Check In</button></li>
            <li><button type="button" id="tab-status" class="tab-btn px-4 py-2 font-medium text-sia-text-muted hover:bg-sia-muted rounded-t-sm" role="tab" aria-selected="false">Flight Status</button></li>
          </ul>
        </div>
        <div id="tab-panel-book" class="tab-panel p-4 md:p-6">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <fieldset class="lg:col-span-12 flex flex-wrap gap-6 border-0 p-0 m-0">
              <legend class="sr-only">Trip type</legend>
              <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="trip_type" value="book_flights" class="text-sia-navy focus:ring-sia-gold" checked />
                Book flights
              </label>
              <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="trip_type" value="redeem_flights" class="text-sia-navy focus:ring-sia-gold" />
                Redeem flights
              </label>
            </fieldset>
            <div class="lg:col-span-3">
              <label for="origin" class="block text-xs font-medium text-sia-text-muted mb-1">From</label>
              <input id="origin" type="text" readonly value="Singapore (SIN)" class="bg-sia-muted border border-sia-border text-sia-text text-sm rounded-sm block w-full p-2.5" />
            </div>
            <div class="lg:col-span-3">
              <label for="destination" class="block text-xs font-medium text-sia-text-muted mb-1">To</label>
              <select id="destination" class="w-full border border-sia-border text-sm rounded-sm p-2.5 focus:ring-sia-gold focus:border-sia-gold">
                ${destOptions}
              </select>
            </div>
            <div class="lg:col-span-2">
              <label for="depart_date" class="block text-xs font-medium text-sia-text-muted mb-1">Depart</label>
              <input id="depart_date" type="date" value="${dep}" class="w-full border border-sia-border text-sm rounded-sm p-2.5" />
            </div>
            <div class="lg:col-span-2">
              <label for="return_date" class="block text-xs font-medium text-sia-text-muted mb-1">Return</label>
              <input id="return_date" type="date" value="${ret}" class="w-full border border-sia-border text-sm rounded-sm p-2.5" />
            </div>
            <div class="lg:col-span-2 flex gap-4 text-sm text-sia-text">
              <div>
                <span class="block text-xs text-sia-text-muted">Class</span>
                <span class="font-medium">Economy</span>
              </div>
              <div>
                <span class="block text-xs text-sia-text-muted">Passengers</span>
                <span class="font-medium">1 Adult</span>
              </div>
            </div>
            <div class="lg:col-span-12">
              <button type="button" id="search-flights-btn" class="w-full md:w-auto md:min-w-[200px] px-8 py-3 text-sm font-semibold text-sia-navy bg-sia-gold hover:bg-sia-gold/90 rounded-sm transition-colors">
                SEARCH
              </button>
            </div>
          </div>
        </div>
        <div id="tab-panel-placeholder" class="tab-panel hidden p-6 text-sia-text-muted text-sm">
          This demo focuses on Book Trip. Other tabs are decorative.
        </div>
      </div>
    </div>
  </section>`;
}
