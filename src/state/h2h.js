/**
 * h2h.js — 2v2 Head-to-Head state management
 * AI opponent generation + matchup record persistence
 */

const STORAGE_KEYS = {
    OPPONENT: 'prem_h2h_opponent',
    RECORD: 'prem_h2h_record',
    HISTORY: 'prem_h2h_history',
};

const POSITION_LIMITS = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

// ---- Helpers ----
function load(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ---- Opponent Generation ----

/**
 * Generate a random 15-man opponent squad from available players
 * Avoids picking players already in the user's squad
 */
export function generateOpponent(allPlayers, yourSquad) {
    const yourIds = new Set(yourSquad.map(p => p.id));
    const available = allPlayers.filter(p => !yourIds.has(p.id));

    const squad = [];
    const posCount = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

    // Shuffle available players
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    for (const player of shuffled) {
        const pos = player.position || 'MID';
        const limit = POSITION_LIMITS[pos] || 5;
        if (posCount[pos] >= limit) continue;

        squad.push({
            id: player.id,
            name: player.name,
            position: pos,
            teamName: player.teamName,
            teamCrest: player.teamCrest,
            teamId: player.teamId,
        });

        posCount[pos]++;
        if (squad.length >= 15) break;
    }

    // Auto-pick a captain (random FWD or MID)
    const captainCandidates = squad.filter(p => p.position === 'FWD' || p.position === 'MID');
    const captain = captainCandidates.length > 0
        ? captainCandidates[Math.floor(Math.random() * captainCandidates.length)]
        : squad[0];

    const opponent = {
        name: generateRivalName(),
        squad,
        captainId: captain?.id || null,
        createdAt: Date.now(),
    };

    save(STORAGE_KEYS.OPPONENT, opponent);
    return opponent;
}

/**
 * Generate a fun rival manager name
 */
function generateRivalName() {
    const firstNames = [
        'Tactical', 'Strategic', 'Ruthless', 'Cunning', 'Electric',
        'Shadow', 'Iron', 'Golden', 'Phantom', 'Storm',
        'Elite', 'Rogue', 'Apex', 'Neo', 'Cyber',
    ];
    const lastNames = [
        'Manager', 'Boss', 'Gaffer', 'Tactician', 'Mastermind',
        'Coach', 'Strategist', 'General', 'Commander', 'Legend',
    ];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

// ---- Opponent Retrieval ----

export function getOpponentSquad() {
    return load(STORAGE_KEYS.OPPONENT);
}

export function clearOpponent() {
    localStorage.removeItem(STORAGE_KEYS.OPPONENT);
}

// ---- Record ----

export function getH2HRecord() {
    return load(STORAGE_KEYS.RECORD) || { wins: 0, draws: 0, losses: 0 };
}

export function saveH2HResult(result) {
    const record = getH2HRecord();
    if (result === 'win') record.wins++;
    else if (result === 'draw') record.draws++;
    else if (result === 'loss') record.losses++;
    save(STORAGE_KEYS.RECORD, record);
}

// ---- Match History ----

export function getH2HHistory() {
    return load(STORAGE_KEYS.HISTORY) || [];
}

export function addH2HMatch(matchData) {
    const history = getH2HHistory();
    history.unshift({
        ...matchData,
        timestamp: Date.now(),
    });
    // Keep last 20 matches
    if (history.length > 20) history.length = 20;
    save(STORAGE_KEYS.HISTORY, history);
}

// ---- Share Code System ----

/**
 * Encode a squad + captain into a shareable code
 * Format: base64 encoded JSON with minimal fields
 */
export function encodeSquadToCode(squad, captainId, managerName = 'Friend') {
    const minimal = squad.map(p => ({
        i: p.id,
        n: p.name,
        p: p.position,
        t: p.teamName,
        c: p.teamCrest,
        ti: p.teamId,
    }));
    const payload = { m: managerName, s: minimal, c: captainId, v: 1 };
    return btoa(JSON.stringify(payload));
}

/**
 * Decode a share code back to a squad
 * Returns null if invalid
 */
export function decodeSquadFromCode(code) {
    try {
        const payload = JSON.parse(atob(code.trim()));
        if (!payload.s || !Array.isArray(payload.s)) return null;

        const squad = payload.s.map(p => ({
            id: p.i,
            name: p.n,
            position: p.p,
            teamName: p.t,
            teamCrest: p.c,
            teamId: p.ti,
        }));

        return {
            name: payload.m || 'Friend',
            squad,
            captainId: payload.c || null,
            createdAt: Date.now(),
            isFriend: true,
        };
    } catch {
        return null;
    }
}

/**
 * Import a friend's squad as the opponent
 */
export function importFriendSquad(code) {
    const opponent = decodeSquadFromCode(code);
    if (!opponent) return { success: false, error: 'Invalid share code' };
    save(STORAGE_KEYS.OPPONENT, opponent);
    return { success: true, opponent };
}

export function resetH2H() {
    localStorage.removeItem(STORAGE_KEYS.OPPONENT);
    localStorage.removeItem(STORAGE_KEYS.RECORD);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
}
