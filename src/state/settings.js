/**
 * settings.js — Custom scoring rules state management
 * Allows users to customize point values per event per position
 */

const STORAGE_KEY = 'prem_scoring_rules';

/** Default scoring rules (matches original store.js SCORING) */
const DEFAULT_RULES = {
    goal: { GK: 6, DEF: 6, MID: 5, FWD: 4 },
    assist: { GK: 3, DEF: 3, MID: 3, FWD: 3 },
    cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
    yellowCard: { GK: -1, DEF: -1, MID: -1, FWD: -1 },
    redCard: { GK: -3, DEF: -3, MID: -3, FWD: -3 },
    appearance: { GK: 2, DEF: 2, MID: 2, FWD: 2 },
};

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function save(rules) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

/**
 * Get the current scoring rules (custom or defaults)
 */
export function getScoringRules() {
    return load() || structuredClone(DEFAULT_RULES);
}

/**
 * Get just the default rules for comparison / reset
 */
export function getDefaultRules() {
    return structuredClone(DEFAULT_RULES);
}

/**
 * Update a single scoring rule
 * @param {string} event - e.g. 'goal', 'assist', 'cleanSheet'
 * @param {string} position - 'GK', 'DEF', 'MID', 'FWD'
 * @param {number} value - point value
 */
export function updateRule(event, position, value) {
    const rules = getScoringRules();
    if (!rules[event]) rules[event] = {};
    rules[event][position] = Number(value);
    save(rules);
    return rules;
}

/**
 * Reset all rules to defaults
 */
export function resetRules() {
    localStorage.removeItem(STORAGE_KEY);
    return structuredClone(DEFAULT_RULES);
}

/**
 * Calculate points using current custom rules
 */
export function calculatePointsCustom(position, events, isCaptain = false) {
    const rules = getScoringRules();
    let pts = 0;

    // Appearance points
    pts += (rules.appearance?.[position] || 2);

    if (events.goals) pts += (events.goals * (rules.goal?.[position] || 0));
    if (events.assists) pts += (events.assists * (rules.assist?.[position] || 0));
    if (events.cleanSheet) pts += (rules.cleanSheet?.[position] || 0);
    if (events.yellowCard) pts += (rules.yellowCard?.[position] || 0);
    if (events.redCard) pts += (rules.redCard?.[position] || 0);

    if (isCaptain) pts *= 2;
    return pts;
}

/** Event display names */
export const EVENT_NAMES = {
    goal: 'Goal',
    assist: 'Assist',
    cleanSheet: 'Clean Sheet',
    yellowCard: 'Yellow Card',
    redCard: 'Red Card',
    appearance: 'Appearance',
};

export const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];
