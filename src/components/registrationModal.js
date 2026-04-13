/**
 * Flowbite-compatible registration modal markup (search gate).
 * @returns {string}
 */
export function renderRegistrationModal() {
  return `
  <div id="registration-modal" tabindex="-1" aria-hidden="true" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center md:inset-0 h-[calc(100%-1rem)] max-h-full p-4">
    <div class="relative w-full max-w-lg max-h-full">
      <div class="relative bg-white rounded-sm shadow-lg border border-sia-border">
        <div class="flex items-start justify-between p-4 border-b border-sia-border rounded-t-sm">
          <h3 id="registration-modal-title" class="text-lg font-display font-semibold text-sia-navy">Register to search flights</h3>
          <button type="button" id="registration-modal-close" class="text-sia-text-muted hover:text-sia-navy p-1" aria-label="Close">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <form id="registration-form" class="p-4 md:p-6 space-y-4" novalidate>
          <p class="text-sm text-sia-text-muted">This demo requires a quick registration before you can search flights.</p>
          <div>
            <label for="reg-first" class="block text-sm font-medium mb-1">First name <span class="text-red-600">*</span></label>
            <input id="reg-first" name="firstName" type="text" maxlength="80" required class="w-full border border-sia-border rounded-sm p-2.5 text-sm" autocomplete="given-name" />
            <p id="reg-first-err" class="hidden text-xs text-red-600 mt-1"></p>
          </div>
          <div>
            <label for="reg-last" class="block text-sm font-medium mb-1">Last name <span class="text-red-600">*</span></label>
            <input id="reg-last" name="lastName" type="text" maxlength="80" required class="w-full border border-sia-border rounded-sm p-2.5 text-sm" autocomplete="family-name" />
            <p id="reg-last-err" class="hidden text-xs text-red-600 mt-1"></p>
          </div>
          <div>
            <label for="reg-email" class="block text-sm font-medium mb-1">Email <span class="text-red-600">*</span></label>
            <input id="reg-email" name="email" type="email" required class="w-full border border-sia-border rounded-sm p-2.5 text-sm" autocomplete="email" />
            <p id="reg-email-err" class="hidden text-xs text-red-600 mt-1"></p>
          </div>
          <div>
            <label for="reg-phone" class="block text-sm font-medium mb-1">Phone (optional)</label>
            <input id="reg-phone" name="phone" type="tel" inputmode="tel" placeholder="+65 9123 4567" class="w-full border border-sia-border rounded-sm p-2.5 text-sm" autocomplete="tel" />
            <p id="reg-phone-err" class="hidden text-xs text-red-600 mt-1"></p>
            <p class="text-xs text-sia-text-muted mt-1">Singapore: +65 followed by 8 digits</p>
          </div>
          <p id="reg-form-err" class="hidden text-sm text-red-600"></p>
          <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <button type="button" id="registration-cancel" class="px-4 py-2 text-sm border border-sia-border rounded-sm hover:bg-sia-muted">Cancel</button>
            <button type="submit" class="px-4 py-2 text-sm font-semibold text-sia-navy bg-sia-gold hover:bg-sia-gold/90 rounded-sm">Submit</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;
}

/**
 * @param {string} phoneRaw
 * @returns {{ ok: boolean, e164?: string, error?: string }}
 */
export function validateSgPhone(phoneRaw) {
  const trimmed = phoneRaw.trim();
  if (!trimmed) return { ok: true };
  const compact = trimmed.replace(/[\s-]/g, '');
  if (!/^\+65\d{8}$/.test(compact)) {
    return { ok: false, error: 'Use +65 followed by exactly 8 digits' };
  }
  return { ok: true, e164: compact };
}

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** @typedef {'Base' | 'Elite Silver' | 'Elite Gold' | 'PPS Club'} SiaLoyaltyTier */

/**
 * Random integer in [min, max], inclusive.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SIA_LOYALTY_TIERS = /** @type {const} */ (['Base', 'Elite Silver', 'Elite Gold', 'PPS Club']);

/**
 * @returns {SiaLoyaltyTier}
 */
function pickSiaLoyaltyTier() {
  const i = randomIntInclusive(0, SIA_LOYALTY_TIERS.length - 1);
  return SIA_LOYALTY_TIERS[i];
}

/**
 * Miles range depends on the assigned loyalty tier (demo data for Braze).
 * @param {SiaLoyaltyTier} tier
 * @returns {number}
 */
function milesForSiaLoyaltyTier(tier) {
  switch (tier) {
    case 'Base':
      return randomIntInclusive(1, 20000);
    case 'Elite Silver':
      return randomIntInclusive(25000, 50000);
    case 'Elite Gold':
      return randomIntInclusive(50000, 100000);
    case 'PPS Club':
      return randomIntInclusive(100000, 500000);
    default:
      return randomIntInclusive(1, 20000);
  }
}

const SIA_MEAL_PREFS = /** @type {const} */ ([
  'Normal',
  'Gluten Free',
  'Vegetarian',
  'Vegan',
  'Kosher',
  'Halal',
]);

/**
 * @returns {(typeof SIA_MEAL_PREFS)[number]}
 */
function pickSiaMealPreference() {
  const i = randomIntInclusive(0, SIA_MEAL_PREFS.length - 1);
  return SIA_MEAL_PREFS[i];
}

const SIA_SEAT_PREFS = /** @type {const} */ (['Aisle', 'Window', 'Legroom', 'No Preference']);

/**
 * @returns {(typeof SIA_SEAT_PREFS)[number]}
 */
function pickSiaSeatPreference() {
  const i = randomIntInclusive(0, SIA_SEAT_PREFS.length - 1);
  return SIA_SEAT_PREFS[i];
}

/**
 * @typedef {Object} SiaDemoRegistrationAttributes
 * @property {string} sia_loyalty_tier
 * @property {number} sia_loyalty_miles
 * @property {string} sia_preference_meals
 * @property {string} sia_preference_seats
 * @property {'true'} sia_demo_segment
 */

/**
 * Random demo loyalty and meal/seat preferences for Braze custom attributes on registration.
 * @returns {SiaDemoRegistrationAttributes}
 */
export function getSiaDemoRegistrationAttributes() {
  const tier = pickSiaLoyaltyTier();
  return {
    sia_loyalty_tier: tier,
    sia_loyalty_miles: milesForSiaLoyaltyTier(tier),
    sia_preference_meals: pickSiaMealPreference(),
    sia_preference_seats: pickSiaSeatPreference(),
    sia_demo_segment: 'true',
  };
}
