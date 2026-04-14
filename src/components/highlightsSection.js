import { HIGHLIGHTS_DEMO_PROMOS } from '../data/highlightsDemo.js';
import { BrazeManager, IAM_RECEIVED } from '../managers/BrazeManager.js';
import { AppLogger } from '../managers/AppLogger.js';

/**
 * @typedef {Object} HighlightPromo
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {string} [imageAlt]
 * @property {string} [href]
 * @property {boolean} [external]
 * @property {Date|null} [expiresAt]
 * @property {'demo'|'iam'} source
 */

const MAX_VISIBLE = 3;

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * @param {HighlightPromo} entry
 * @returns {boolean}
 */
function entryExpired(entry) {
  if (!entry.expiresAt) return false;
  const t =
    entry.expiresAt instanceof Date
      ? entry.expiresAt.getTime()
      : new Date(entry.expiresAt).getTime();
  return Number.isFinite(t) && t < Date.now();
}

/**
 * Deep-enough clone for demo promos (no brazeCard).
 * @returns {HighlightPromo[]}
 */
function cloneDemoPromos() {
  return HIGHLIGHTS_DEMO_PROMOS.map((p) => ({ ...p, expiresAt: p.expiresAt }));
}

/**
 * Highlights strip markup (mount `#highlights-cards` from JS).
 * @returns {string}
 */
export function renderHighlightsSection() {
  return `
  <section id="highlights-section" class="bg-sia-muted border-t border-sia-border" aria-labelledby="highlights-heading">
    <div class="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <h2 id="highlights-heading" class="font-display text-2xl md:text-3xl text-sia-navy mb-8 md:mb-10 flex items-center gap-3">
        <span class="w-1 self-stretch min-h-[1.5em] bg-sia-gold rounded-sm shrink-0" aria-hidden="true"></span>
        Highlights
      </h2>
      <div id="highlights-cards" class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"></div>
    </div>
  </section>`;
}

/**
 * @param {HighlightPromo} promo
 * @returns {string}
 */
function cardHtml(promo) {
  const title = escapeHtml(promo.title);
  const desc = escapeHtml(promo.description || '');
  const imgAlt = escapeAttr(promo.imageAlt || '');
  const idAttr = escapeAttr(promo.id);
  const extIcon =
    promo.external === true
      ? '<i class="fa-solid fa-arrow-up-right-from-square text-xs ml-1 opacity-70" aria-hidden="true"></i>'
      : '';
  const href = promo.href?.trim();
  const img = `<div class="aspect-[16/10] overflow-hidden rounded-t-sm bg-white">
      <img src="${escapeAttr(promo.imageUrl)}" alt="${imgAlt}" class="w-full h-full object-cover" loading="lazy" />
    </div>`;
  const body = `<div class="p-4 md:p-5 bg-white rounded-b-sm border border-t-0 border-sia-border shadow-sm">
      <p class="font-semibold text-sia-navy text-sm md:text-base leading-snug">${title}${extIcon}</p>
      ${desc ? `<p class="mt-2 text-sm text-sia-text-muted leading-relaxed">${desc}</p>` : ''}
    </div>`;

  if (href) {
    const rel = promo.external ? ' rel="noopener noreferrer"' : '';
    const target = promo.external ? ' target="_blank"' : '';
    return `<article class="rounded-sm overflow-hidden h-full flex flex-col">
      <a href="${escapeAttr(href)}" class="group flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sia-gold focus-visible:ring-offset-2 rounded-sm" data-highlight-id="${idAttr}"${target}${rel}>
        ${img}
        ${body}
      </a>
    </article>`;
  }

  return `<article class="rounded-sm overflow-hidden h-full flex flex-col">
    <div class="flex flex-col h-full cursor-default" data-highlight-id="${idAttr}">
      ${img}
      ${body}
    </div>
  </article>`;
}

/**
 * Outer slot wrapper for Braze / programmatic replacement (fixed IDs per column).
 * @param {HighlightPromo} promo
 * @param {1|2|3} slotIndex
 * @returns {string}
 */
function wrapHighlightSlot(promo, slotIndex) {
  const id =
    slotIndex === 1
      ? 'ux_highlight_1'
      : slotIndex === 2
        ? 'ux_highlight_2'
        : 'ux_highlight_3';
  return `<div id="${id}">${cardHtml(promo)}</div>`;
}

/**
 * @param {HTMLElement} rootEl - Container `#highlights-cards`
 * @returns {{ setPromoCards: (cards: HighlightPromo[]) => void, resetToDemo: () => void, dispose: () => void }}
 */
export function createHighlightsSection(rootEl) {
  if (!rootEl) {
    throw new Error('createHighlightsSection: root element required');
  }

  /** @type {HighlightPromo[]} */
  let stack = cloneDemoPromos();

  /** @type {HighlightPromo[]} IAM-derived promos only; newest first; max {@link MAX_VISIBLE}. */
  let iamStack = [];

  /** @type {string} */
  let lastRenderedKey = '';

  /**
   * IAM promos first, then demo rows. Prunes expired entries from the stack.
   */
  function rebuildStack() {
    const demos = stack.filter((e) => e.source === 'demo');
    AppLogger.info('[UI]', 'Rebuilding stack', { iamStack, demos });
    stack = [...iamStack, ...demos];
    pruneStack();
    paint();
  }

  /**
   * @param {HighlightPromo} promo
   */
  function pushIamPromo(promo) {
    iamStack = [promo, ...iamStack].slice(0, MAX_VISIBLE);
    AppLogger.info('[UI]', 'Pushing IAM Highlight Promo to stack', iamStack);
    rebuildStack();
  }

  function pruneStack() {

    stack = stack.filter((e) => !entryExpired(e));
    AppLogger.info('[UI]', 'Pruning stack', stack);
  }

  function paint() {
    AppLogger.info('[UI]', 'Painting stack', stack);
    pruneStack();
    const visible = stack.slice(0, MAX_VISIBLE);
    const key = visible.map((p) => p.id).join('|');
    if (key !== lastRenderedKey) {
      lastRenderedKey = key;
      rootEl.innerHTML = visible
        .map((promo, i) => wrapHighlightSlot(promo, /** @type {1|2|3} */(i + 1)))
        .join('');
      AppLogger.info('[UI]', 'Rendered stack', rootEl.innerHTML);
    }
  }

  /**
   * @param {{ promo?: HighlightPromo }} payload
   */
  function onIamReceived(payload) {

    AppLogger.info('[UI]', 'IAM Highlight Promo received', payload);
    const promo = payload?.promo;
    if (!promo || typeof promo.id !== 'string') return;
    pushIamPromo(promo);
    AppLogger.info('[UI]', 'Pushing IAM Highlight Promo to stack', promo);
  }

  const unsubIam = BrazeManager.subscribe(IAM_RECEIVED, onIamReceived);

  const expiryTimer = window.setInterval(() => {
    pruneStack();
    paint();
  }, 60_000);

  paint();

  return {
    /**
     * Replace the entire stack with these promos (e.g. tests or manual overrides).
     * @param {HighlightPromo[]} cards
     */
    setPromoCards(cards) {
      iamStack = [];
      stack = Array.isArray(cards) ? cards.map((c) => ({ ...c })) : [];
      lastRenderedKey = '';
      paint();
    },

    /** Restore demo-only stack. */
    resetToDemo() {
      iamStack = [];
      stack = cloneDemoPromos();
      lastRenderedKey = '';
      paint();
    },

    /** Unsubscribe from Braze and remove listeners. */
    dispose() {
      window.clearInterval(expiryTimer);
      try {
        unsubIam();
      } catch (e) {
        AppLogger.warn('[UI]', 'Highlights dispose unsubscribe failed', e);
      }
    },
  };
}
