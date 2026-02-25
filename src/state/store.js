/**
 * store.js — localStorage-based state management for draft, squad, captain, scores
 */

const STORAGE_KEYS = {
    SQUAD: 'prem_squad',
    CAPTAIN: 'prem_captain',
    SCORES: 'prem_scores',
};

/** Position limits */
const POSITION_LIMITS = {
    GK: 2,
    DEF: 5,
    MID: 5,
    FWD: 3,
};

const MAX_SQUAD_SIZE = 15;

/** Scoring table: points per event per position */
const SCORING = {
    goal: { GK: 6, DEF: 6, MID: 5, FWD: 4 },
    assist: { GK: 3, DEF: 3, MID: 3, FWD: 3 },
    cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
    yellowCard: { GK: -1, DEF: -1, MID: -1, FWD: -1 },
    redCard: { GK: -3, DEF: -3, MID: -3, FWD: -3 },
};

// ---- Helpers ----

function load(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ---- Squad ----

/**
 * Get the current drafted squad
 * @returns {Array<{id:number, name:string, position:string, teamName:string, teamCrest:string}>}
 */
export function getSquad() {
    return load(STORAGE_KEYS.SQUAD) || [];
}

/**
 * Draft a player to the squad
 * @returns {{ success: boolean, error?: string }}
 */
export function draftPlayer(player) {
    const squad = getSquad();

    if (squad.length >= MAX_SQUAD_SIZE) {
        return { success: false, error: 'Squad is full (15/15)' };
    }

    if (squad.find((p) => p.id === player.id)) {
        return { success: false, error: 'Player already drafted' };
    }

    const posCount = squad.filter((p) => p.position === player.position).length;
    const limit = POSITION_LIMITS[player.position] || 5;

    if (posCount >= limit) {
        return {
            success: false,
            error: `${player.position} slots full (${posCount}/${limit})`,
        };
    }

    squad.push({
        id: player.id,
        name: player.name,
        position: player.position,
        teamName: player.teamName,
        teamCrest: player.teamCrest,
        teamId: player.teamId,
        nationality: player.nationality,
        shirtNumber: player.shirtNumber,
    });

    save(STORAGE_KEYS.SQUAD, squad);
    return { success: true };
}

/**
 * Release a player from the squad
 */
export function releasePlayer(playerId) {
    let squad = getSquad();
    squad = squad.filter((p) => p.id !== playerId);
    save(STORAGE_KEYS.SQUAD, squad);

    // If released player was captain, clear captain
    if (getCaptain() === playerId) {
        clearCaptain();
    }
}

/**
 * Check if a player is drafted
 */
export function isPlayerDrafted(playerId) {
    return getSquad().some((p) => p.id === playerId);
}

/**
 * Get position counts in current squad
 */
export function getPositionCounts() {
    const squad = getSquad();
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const p of squad) {
        counts[p.position] = (counts[p.position] || 0) + 1;
    }
    return counts;
}

/**
 * Check if a position is full
 */
export function isPositionFull(position) {
    const counts = getPositionCounts();
    return (counts[position] || 0) >= (POSITION_LIMITS[position] || 5);
}

// ---- Captain ----

/**
 * Get the captain's player ID
 */
export function getCaptain() {
    return load(STORAGE_KEYS.CAPTAIN);
}

/**
 * Set a player as captain
 */
export function setCaptain(playerId) {
    save(STORAGE_KEYS.CAPTAIN, playerId);
}

/**
 * Clear captain selection
 */
export function clearCaptain() {
    localStorage.removeItem(STORAGE_KEYS.CAPTAIN);
}

// ---- Scoring ----

/**
 * Calculate fantasy points for a player based on match events
 * Uses custom scoring rules from settings if the user has changed them
 * @param {string} position - GK, DEF, MID, FWD
 * @param {{ goals: number, assists: number, cleanSheet: boolean, yellowCard: boolean, redCard: boolean }} events
 * @param {boolean} isCaptain
 * @returns {number}
 */
export function calculatePoints(position, events, isCaptain = false) {
    // Try custom rules first, fall back to hardcoded SCORING
    let rules;
    try {
        const raw = localStorage.getItem('prem_scoring_rules');
        rules = raw ? JSON.parse(raw) : SCORING;
    } catch {
        rules = SCORING;
    }

    let pts = 0;

    // Appearance points
    pts += (rules.appearance?.[position] || 0);

    pts += (events.goals || 0) * (rules.goal?.[position] || SCORING.goal[position] || 0);
    pts += (events.assists || 0) * (rules.assist?.[position] || SCORING.assist[position] || 0);
    if (events.cleanSheet) pts += (rules.cleanSheet?.[position] || SCORING.cleanSheet[position] || 0);
    if (events.yellowCard) pts += (rules.yellowCard?.[position] || SCORING.yellowCard[position] || 0);
    if (events.redCard) pts += (rules.redCard?.[position] || SCORING.redCard[position] || 0);

    if (isCaptain) pts *= 2;

    return pts;
}

/**
 * Save gameweek scores
 */
export function saveGameweekScores(gameweek, scores) {
    const allScores = load(STORAGE_KEYS.SCORES) || {};
    allScores[gameweek] = scores;
    save(STORAGE_KEYS.SCORES, allScores);
}

/**
 * Get scores for a gameweek
 */
export function getGameweekScores(gameweek) {
    const allScores = load(STORAGE_KEYS.SCORES) || {};
    return allScores[gameweek] || {};
}

/**
 * Get total points across all gameweeks
 */
export function getTotalPoints() {
    const allScores = load(STORAGE_KEYS.SCORES) || {};
    let total = 0;
    for (const gw of Object.values(allScores)) {
        for (const pts of Object.values(gw)) {
            total += pts;
        }
    }
    return total;
}

/**
 * Reset all data
 */
export function resetAll() {
    localStorage.removeItem(STORAGE_KEYS.SQUAD);
    localStorage.removeItem(STORAGE_KEYS.CAPTAIN);
    localStorage.removeItem(STORAGE_KEYS.SCORES);
}

// Export constants for use elsewhere
export { POSITION_LIMITS, MAX_SQUAD_SIZE, SCORING };
