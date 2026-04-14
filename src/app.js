import { renderShellFooter, renderShellHeader } from './components/shell.js';
import { renderHomeBooking } from './components/homeBooking.js';
import { createHighlightsSection, renderHighlightsSection } from './components/highlightsSection.js';
import { renderSearchResults, bindFareOptionSelection } from './components/searchResults.js';
import { renderRegistrationModal, isValidEmail, validateSgPhone } from './components/registrationModal.js';
import { renderLoginModal } from './components/loginModal.js';
import { renderDebugOverlay } from './components/debugOverlay.js';
import { FLIGHT_DATA } from './data/flights.js';
import { buildBookingPayload, isValidBookingSearch } from './logic/bookingPayload.js';
import { getPersistedExternalId, persistAuthSession } from './logic/userSession.js';
import { fetchSqDemoFlights } from './services/serpapiFlightsClient.js';
import { StorageManager } from './managers/StorageManager.js';
import { AppLogger } from './managers/AppLogger.js';
import { BrazeManager, EVENT_LOGGED } from './managers/BrazeManager.js';
import { BrazeRestManager } from './managers/BrazeRestManager.js';
import { Modal } from 'flowbite';


const VIEWS = { HOME: 'HOME', SEARCH_RESULTS: 'SEARCH_RESULTS' };

/** @type {'HOME'|'SEARCH_RESULTS'} */
let currentView = VIEWS.HOME;

/** @type {object | null} */
let pendingSearchPayload = null;

/** @type {(() => void) | null} */
let unsubBrazeEvents = null;

/** @type {ReturnType<typeof createHighlightsSection> | null} */
let highlightsController = null;

/**
 * @returns {boolean}
 */
function isDebugUrl() {
  return new URLSearchParams(location.search).get('debug') === 'true';
}

/**
 * @returns {boolean}
 */
function hasLoggedInUserId() {
  return !!getPersistedExternalId();
}

/**
 * @returns {boolean}
 */
function isDebugOverlayEligible() {
  return isDebugUrl() || hasLoggedInUserId();
}

/**
 * @returns {boolean}
 */
function isDebugLauncherHiddenPersisted() {
  return !!StorageManager.get('debug_launcher_hidden', false);
}

/**
 * Syncs floating Debug button, header recovery link, and drawer launcher controls.
 * @returns {void}
 */
function applyDebugLauncherVisibility() {
  const trigger = document.getElementById('debug-drawer-trigger');
  const recovery = document.getElementById('debug-launcher-recovery');
  const urlDebug = isDebugUrl();
  const eligible = isDebugOverlayEligible();
  const hidden = isDebugLauncherHiddenPersisted();
  const showFab = eligible && (urlDebug || !hidden);

  trigger?.classList.toggle('hidden', !showFab);
  recovery?.classList.toggle('hidden', !(eligible && hidden && !urlDebug));

  const note = document.getElementById('debug-launcher-url-note');
  const btnHide = document.getElementById('debug-hide-launcher');
  const btnShow = document.getElementById('debug-show-launcher');
  note?.classList.toggle('hidden', !(urlDebug && eligible));
  const showHideBtn = eligible && !urlDebug && !hidden;
  btnHide?.classList.toggle('hidden', !showHideBtn);
  btnShow?.classList.toggle('hidden', !(eligible && !urlDebug && hidden));
}

/**
 * @returns {'HOME'|'SEARCH_RESULTS'}
 */
function parseHash() {
  let h = location.hash.replace(/^#/, '');
  if (!h) h = '/home';
  if (!h.startsWith('/')) h = `/${h}`;
  if (h.startsWith('/search-results')) return VIEWS.SEARCH_RESULTS;
  return VIEWS.HOME;
}

/**
 * @param {'HOME'|'SEARCH_RESULTS'} view
 */
function setHashForView(view) {
  const next = view === VIEWS.SEARCH_RESULTS ? '#/search-results' : '#/home';
  if (location.hash === next) return;
  location.hash = next;
}

/**
 * @param {'HOME'|'SEARCH_RESULTS'} view
 * @param {{ replaceHash?: boolean }} [opts]
 */
function navigate(view, { replaceHash = true } = {}) {
  currentView = view;
  if (replaceHash) setHashForView(view);
  window.scrollTo(0, 0);
  BrazeManager.logCustomEvent('page_view', { page: currentView });
  render();
  bindAfterRender();
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const showDebugOverlay = isDebugOverlayEligible();

  app.innerHTML = `
    ${renderShellHeader({ activeView: currentView, loggedIn: hasLoggedInUserId() })}
    <main id="main-view" class="flex flex-col min-h-[40vh]"></main>
    ${renderShellFooter()}
    ${renderRegistrationModal()}
    ${renderLoginModal()}
    ${showDebugOverlay ? renderDebugOverlay() : ''}
  `;

  const main = document.getElementById('main-view');
  if (!main) return;

  if (currentView === VIEWS.HOME) {
    const saved = StorageManager.get('booking_search', null);
    const persisted =
      saved && isValidBookingSearch(saved)
        ? {
          defaultDestination: saved.destination_code,
          defaultDepart: saved.depart_date,
          defaultReturn: saved.return_date,
        }
        : {};
    main.innerHTML = `${renderHomeBooking(persisted)}${renderHighlightsSection()}`;
  } else {
    const search = StorageManager.get('booking_search', null);
    if (!isValidBookingSearch(search)) {
      AppLogger.warn('[UI]', 'Invalid booking_search on results route — redirecting home');
      currentView = VIEWS.HOME;
      history.replaceState(null, '', `${location.pathname}${location.search}#/home`);
      main.innerHTML = `${renderHomeBooking({})}${renderHighlightsSection()}`;
      return;
    }
    const cached = StorageManager.get('booking_last_results', null);
    const flights = Array.isArray(cached) ? cached : [];
    const summary = `${search.origin_code} → ${search.destination_code} · ${search.depart_date} – ${search.return_date}`;
    const dateRangeLine = `${search.depart_date} – ${search.return_date}`;
    main.innerHTML = renderSearchResults({
      flights,
      searchSummary: summary,
      routeCodes: { origin_code: search.origin_code, destination_code: search.destination_code },
      dateRangeLine,
    });
  }
}

/**
 * Flowbite 2.x: use `new Modal(...)` (default instance options override by id after re-renders). There is no `Modal.getInstance(element)`.
 * @returns {InstanceType<typeof Modal> | null}
 */
function getRegistrationModalInstance() {
  const el = document.getElementById('registration-modal');
  if (!el) return null;
  return new Modal(el, { backdrop: 'dynamic', closable: true });
}

function openRegistrationModal() {
  getRegistrationModalInstance()?.show();
}

function closeRegistrationModal() {
  getRegistrationModalInstance()?.hide();
}

/**
 * @returns {InstanceType<typeof Modal> | null}
 */
function getLoginModalInstance() {
  const el = document.getElementById('login-modal');
  if (!el) return null;
  return new Modal(el, { backdrop: 'dynamic', closable: true });
}

function openLoginModal() {
  getLoginModalInstance()?.show();
}

function closeLoginModal() {
  getLoginModalInstance()?.hide();
}

/**
 * @param {object} payload
 */
async function runSearchAfterAuth(payload) {
  StorageManager.set('booking_search', payload);
  BrazeManager.setCustomAttribute('sia_last_search_origin', payload.origin_code);
  BrazeManager.setCustomAttribute('sia_last_search_destination', payload.destination_code);
  BrazeManager.setCustomAttribute('sia_last_search_depart', payload.depart_date);
  BrazeManager.setCustomAttribute('sia_last_search_return', payload.return_date);
  BrazeManager.logCustomEvent('sia_searched_flight', {
    origin_code: payload.origin_code,
    destination_code: payload.destination_code,
    depart_date: payload.depart_date,
    return_date: payload.return_date,
    trip_type: payload.trip_type,
  });
  BrazeManager.requestImmediateDataFlush();

  document.getElementById('search-loading')?.classList.remove('hidden');

  const t0 = Date.now();
  const live = await fetchSqDemoFlights(payload);
  let list =
    live.ok && live.rows.length > 0 ? live.rows : FLIGHT_DATA[payload.destination_code] ?? [];
  const elapsed = Date.now() - t0;
  const minMs = 400;
  if (elapsed < minMs) {
    await new Promise((r) => setTimeout(r, minMs - elapsed));
  }

  StorageManager.set('booking_last_results', list);

  document.getElementById('search-loading')?.classList.add('hidden');

  navigate(VIEWS.SEARCH_RESULTS);
}

/**
 * @returns {void}
 */
function bindAfterRender() {
  if (highlightsController) {
    highlightsController.dispose();
    highlightsController = null;
  }

  const main = document.getElementById('main-view');
  if (main) {
    bindFareOptionSelection(main, currentView === VIEWS.SEARCH_RESULTS);
  }

  document.getElementById('sia-logo-btn')?.addEventListener('click', () => navigate(VIEWS.HOME));

  document.querySelectorAll('[data-route]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const r = /** @type {HTMLElement} */ (a).dataset.route;
      if (r === 'SEARCH_RESULTS') {
        const search = StorageManager.get('booking_search', null);
        if (!isValidBookingSearch(search)) {
          AppLogger.info('[UI]', 'No saved search; opening home');
          location.hash = '#/home';
          return;
        }
      }
      location.hash = r === 'SEARCH_RESULTS' ? '#/search-results' : '#/home';
    });
  });

  document.querySelectorAll('[data-nav="utility"], [data-nav="decor"]').forEach((el) => {
    el.addEventListener('click', (e) => e.preventDefault());
  });

  document.getElementById('header-login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openLoginModal();
  });

  document.getElementById('debug-launcher-recovery')?.addEventListener('click', () => {
    StorageManager.set('debug_launcher_hidden', false);
    applyDebugLauncherVisibility();
  });

  if (currentView === VIEWS.HOME) {
    const tabBook = document.getElementById('tab-book');
    const tabManage = document.getElementById('tab-manage');
    const tabCheck = document.getElementById('tab-checkin');
    const tabStatus = document.getElementById('tab-status');
    const panelBook = document.getElementById('tab-panel-book');
    const panelPh = document.getElementById('tab-panel-placeholder');

    /** @param {'book'|'oth'} mode */
    const setTab = (mode) => {
      const pairs = [
        [tabBook, mode === 'book'],
        [tabManage, false],
        [tabCheck, false],
        [tabStatus, false],
      ];
      pairs.forEach(([btn, on]) => {
        if (!btn) return;
        btn.classList.toggle('bg-sia-navy', on);
        btn.classList.toggle('text-white', on);
        btn.classList.toggle('text-sia-text-muted', !on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panelBook?.classList.toggle('hidden', mode !== 'book');
      panelPh?.classList.toggle('hidden', mode === 'book');
    };

    tabBook?.addEventListener('click', () => setTab('book'));
    tabManage?.addEventListener('click', () => setTab('oth'));
    tabCheck?.addEventListener('click', () => setTab('oth'));
    tabStatus?.addEventListener('click', () => setTab('oth'));

    const highlightsMount = document.getElementById('highlights-cards');
    if (highlightsMount) {
      highlightsController = createHighlightsSection(highlightsMount);
    }

    document.getElementById('search-flights-btn')?.addEventListener('click', () => {
      const tripEl = document.querySelector('input[name="trip_type"]:checked');
      const trip_type = tripEl ? /** @type {HTMLInputElement} */ (tripEl).value : 'book_flights';
      const destination_code = /** @type {HTMLSelectElement} */ (document.getElementById('destination')).value;
      const depart_date = /** @type {HTMLInputElement} */ (document.getElementById('depart_date')).value;
      const return_date = /** @type {HTMLInputElement} */ (document.getElementById('return_date')).value;

      const built = buildBookingPayload({
        destination_code,
        trip_type,
        depart_date,
        return_date,
      });
      if (!built.ok || !built.payload) {
        AppLogger.warn('[UI]', built.error || 'Validation failed');
        alert(built.error || 'Please check your trip details.');
        return;
      }

      const userId = getPersistedExternalId();
      if (!userId) {
        pendingSearchPayload = built.payload;
        AppLogger.info('[AUTH]', 'Search gated — registration required');
        openRegistrationModal();
        return;
      }

      runSearchAfterAuth(built.payload);
    });

    document.getElementById('hero-cta')?.addEventListener('click', () => {
      document.getElementById('search-flights-btn')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  bindRegistrationForm();
  bindLoginForm();
  bindDebugOverlay();
}

function bindRegistrationForm() {
  const form = document.getElementById('registration-form');
  if (!form) return;

  const showErr = (id, msg) => {
    const p = document.getElementById(id);
    if (!p) return;
    if (msg) {
      p.textContent = msg;
      p.classList.remove('hidden');
    } else {
      p.textContent = '';
      p.classList.add('hidden');
    }
  };

  document.getElementById('registration-cancel')?.addEventListener('click', () => {
    pendingSearchPayload = null;
    closeRegistrationModal();
  });
  document.getElementById('registration-modal-close')?.addEventListener('click', () => {
    pendingSearchPayload = null;
    closeRegistrationModal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showErr('reg-first-err');
    showErr('reg-last-err');
    showErr('reg-email-err');
    showErr('reg-phone-err');
    showErr('reg-form-err');

    const firstName = /** @type {HTMLInputElement} */ (document.getElementById('reg-first')).value.trim();
    const lastName = /** @type {HTMLInputElement} */ (document.getElementById('reg-last')).value.trim();
    const email = /** @type {HTMLInputElement} */ (document.getElementById('reg-email')).value.trim();
    const phoneRaw = /** @type {HTMLInputElement} */ (document.getElementById('reg-phone')).value;

    let bad = false;
    if (!firstName) {
      showErr('reg-first-err', 'Required');
      bad = true;
    }
    if (!lastName) {
      showErr('reg-last-err', 'Required');
      bad = true;
    }
    if (!email || !isValidEmail(email)) {
      showErr('reg-email-err', 'Valid email required');
      bad = true;
    }
    const phoneCheck = validateSgPhone(phoneRaw);
    if (!phoneCheck.ok) {
      showErr('reg-phone-err', phoneCheck.error || 'Invalid phone');
      bad = true;
    }
    if (bad) return;

    const result = BrazeManager.completeRegistration({
      firstName,
      lastName,
      email,
      phone: phoneCheck.e164,
    });

    if (!result.ok) {
      showErr('reg-form-err', result.error || 'Registration failed');
      return;
    }

    persistAuthSession(result.externalId, 'registration');
    AppLogger.info('[AUTH]', 'Registration complete');
    closeRegistrationModal();

    const resume = pendingSearchPayload;
    pendingSearchPayload = null;
    if (resume) {
      runSearchAfterAuth(resume);
    } else {
      render();
      bindAfterRender();
    }
  });
}

function bindLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const showErr = (id, msg) => {
    const p = document.getElementById(id);
    if (!p) return;
    if (msg) {
      p.textContent = msg;
      p.classList.remove('hidden');
    } else {
      p.textContent = '';
      p.classList.add('hidden');
    }
  };

  document.getElementById('login-cancel')?.addEventListener('click', () => {
    closeLoginModal();
  });
  document.getElementById('login-modal-close')?.addEventListener('click', () => {
    closeLoginModal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showErr('login-email-err');
    showErr('login-form-err');

    const emailRaw = /** @type {HTMLInputElement} */ (document.getElementById('login-email')).value.trim();
    if (!emailRaw || !isValidEmail(emailRaw)) {
      showErr('login-email-err', 'Valid email required');
      return;
    }

    const normalizedEmail = emailRaw.toLowerCase();
    persistAuthSession(normalizedEmail, 'login');
    BrazeManager.login(normalizedEmail);
    AppLogger.info('[AUTH]', 'Login complete');
    closeLoginModal();
    render();
    bindAfterRender();
  });
}

function bindDebugOverlay() {
  if (!isDebugOverlayEligible()) {
    if (unsubBrazeEvents) {
      unsubBrazeEvents();
      unsubBrazeEvents = null;
    }
    return;
  }

  const drawer = document.getElementById('debug-drawer');
  const trigger = document.getElementById('debug-drawer-trigger');
  trigger?.addEventListener('click', () => {
    drawer?.classList.remove('-translate-x-full');
    void refreshDebugPanels();
  });
  document.getElementById('debug-drawer-close')?.addEventListener('click', () => {
    drawer?.classList.add('-translate-x-full');
  });

  document.getElementById('debug-hide-launcher')?.addEventListener('click', () => {
    if (isDebugUrl()) return;
    StorageManager.set('debug_launcher_hidden', true);
    applyDebugLauncherVisibility();
    drawer?.classList.add('-translate-x-full');
  });

  document.getElementById('debug-show-launcher')?.addEventListener('click', () => {
    if (isDebugUrl()) return;
    StorageManager.set('debug_launcher_hidden', false);
    applyDebugLauncherVisibility();
  });

  if (unsubBrazeEvents) {
    unsubBrazeEvents();
    unsubBrazeEvents = null;
  }

  unsubBrazeEvents = BrazeManager.subscribe(EVENT_LOGGED, (payload) => {
    const ul = document.getElementById('debug-event-log');
    if (!ul) return;
    const li = document.createElement('li');
    li.className = 'event-log-flash border-b border-sia-border/40 pb-1 break-all';
    li.textContent = `${new Date().toISOString()} — ${payload.name} ${JSON.stringify(payload.props || {})}`;
    ul.prepend(li);
  });

  document.getElementById('debug-refresh-profile')?.addEventListener('click', () => refreshDebugPanels());

  document.getElementById('debug-reset-app')?.addEventListener('click', () => {
    if (
      !window.confirm(
        'Reset the app? This logs you out, clears all local storage for this site, and reloads the page.',
      )
    ) {
      return;
    }
    BrazeManager.wipeLocalSdkData();
    try {
      localStorage.clear();
    } catch (e) {
      AppLogger.warn('[STORAGE]', 'localStorage.clear failed', e);
    }
    location.reload();
  });

  applyDebugLauncherVisibility();
}

async function refreshDebugPanels() {
  const sdkPre = document.getElementById('debug-sdk-user');
  const restPre = document.getElementById('debug-rest-profile');
  if (sdkPre) {
    sdkPre.textContent = JSON.stringify(BrazeManager.getUserData(), null, 2);
  }
  const uid = getPersistedExternalId();
  if (restPre) {
    if (!uid) {
      restPre.textContent = 'No persisted external id in storage';
      return;
    }
    try {
      const data = await BrazeRestManager.fetchUserProfile(uid);
      restPre.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      restPre.textContent = e instanceof Error ? e.message : String(e);
    }
  }
}

function ensureSearchLoadingOverlay() {
  if (document.getElementById('search-loading')) return;
  const el = document.createElement('div');
  el.id = 'search-loading';
  el.className =
    'hidden fixed inset-0 z-[70] bg-white/70 flex items-center justify-center pointer-events-auto';
  el.innerHTML = `
    <div class="flex flex-col items-center gap-5 px-4">
      <div class="relative flex h-24 w-24 items-center justify-center">
        <div
          class="absolute inset-0 rounded-full border-4 border-sia-border border-t-sia-gold border-r-transparent animate-spin"
          aria-hidden="true"
        ></div>
        <i class="fa-solid fa-plane text-3xl text-sia-navy" aria-hidden="true"></i>
      </div>
      <p class="text-sia-navy font-medium text-lg text-center">Searching flights…</p>
    </div>`;
  document.body.appendChild(el);
}

/**
 * @returns {void}
 */
export function bootstrapApp() {
  AppLogger.info('[SYSTEM]', `App start v${__APP_VERSION__}`);

  ensureSearchLoadingOverlay();

  const apiKey = import.meta.env.VITE_BRAZE_SDK_KEY || '';
  const baseUrl = import.meta.env.VITE_BRAZE_SDK_URL || '';
  BrazeManager.initialize(apiKey, baseUrl);
  BrazeManager.syncUserFromStorage();

  BrazeManager.subscribe('HERO_CONTENT', (patch) => {
    if (patch?.title) {
      const t = document.getElementById('hero-title');
      if (t) t.textContent = patch.title;
    }
  });

  window.addEventListener('hashchange', () => {
    const next = parseHash();
    if (next === VIEWS.SEARCH_RESULTS) {
      const search = StorageManager.get('booking_search', null);
      if (!isValidBookingSearch(search)) {
        AppLogger.warn('[UI]', 'Results route requires valid booking_search');
        if (location.hash !== '#/home') {
          location.hash = '#/home';
        }
        return;
      }
    }
    if (next === currentView) return;
    navigate(next, { replaceHash: false });
  });

  if (!location.hash || location.hash === '#') {
    history.replaceState(null, '', `${location.pathname}${location.search}#/home`);
  }

  currentView = parseHash();
  if (currentView === VIEWS.SEARCH_RESULTS) {
    const search = StorageManager.get('booking_search', null);
    if (!isValidBookingSearch(search)) {
      currentView = VIEWS.HOME;
      history.replaceState(null, '', `${location.pathname}${location.search}#/home`);
    }
  }

  navigate(currentView, { replaceHash: false });
}


StorageManager.set('debug_mode', true);
