/**
 * football.js — football-data.org API wrapper with in-memory caching
 *
 * Free tier: 10 requests/minute, supports Premier League (code: PL)
 * API docs: https://www.football-data.org/documentation/api
 */

const BASE_URL = '/api/v4';
const API_KEY = import.meta.env.VITE_API_KEY || '';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** @type {Map<string, {data: any, timestamp: number}>} */
const cache = new Map();

/**
 * Internal fetch with auth header + caching
 */
async function apiFetch(endpoint) {
    const cacheKey = endpoint;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const headers = {};
    if (API_KEY && API_KEY !== 'YOUR_API_KEY_HERE') {
        headers['X-Auth-Token'] = API_KEY;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, { headers });

    if (!res.ok) {
        if (res.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a minute and try again.');
        }
        throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
}

/**
 * Get PL competition info (current season, current matchday)
 */
export async function fetchCompetition() {
    return apiFetch('/competitions/PL');
}

/**
 * Detect the REAL current matchday by checking match dates
 * Falls back to API's currentMatchday if detection fails
 */
export async function detectCurrentMatchday() {
    try {
        const comp = await fetchCompetition();
        const apiMatchday = comp.currentSeason?.currentMatchday || 1;

        // Fetch matches around today to find the right matchday
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        const weekAhead = new Date(today);
        weekAhead.setDate(today.getDate() + 7);

        const dateFrom = weekAgo.toISOString().split('T')[0];
        const dateTo = weekAhead.toISOString().split('T')[0];

        const data = await apiFetch(`/competitions/PL/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);
        const matches = data.matches || [];

        if (matches.length === 0) {
            return apiMatchday;
        }

        // Find the matchday with matches closest to today
        const matchdays = [...new Set(matches.map(m => m.matchday))].sort((a, b) => a - b);

        // Prefer the matchday that has the closest upcoming or most recent match
        let bestMd = matchdays[0];
        let bestDiff = Infinity;

        for (const md of matchdays) {
            const mdMatches = matches.filter(m => m.matchday === md);
            for (const m of mdMatches) {
                const diff = Math.abs(new Date(m.utcDate).getTime() - today.getTime());
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestMd = md;
                }
            }
        }

        return bestMd;
    } catch {
        // Fallback to API value
        const comp = await fetchCompetition();
        return comp.currentSeason?.currentMatchday || 1;
    }
}

/**
 * Get all PL teams with full squads
 * Returns { teams: [{ id, name, crest, squad: [...] }] }
 */
export async function fetchTeams() {
    return apiFetch('/competitions/PL/teams');
}

/**
 * Get matches for a specific matchday
 * @param {number} matchday
 */
export async function fetchMatches(matchday) {
    return apiFetch(`/competitions/PL/matches?matchday=${matchday}`);
}

/**
 * Get all matches for the current season (no matchday filter)
 */
export async function fetchAllMatches() {
    return apiFetch('/competitions/PL/matches');
}

/**
 * Get top scorers
 */
export async function fetchScorers() {
    return apiFetch('/competitions/PL/scorers');
}

/**
 * Get current PL standings
 */
export async function fetchStandings() {
    return apiFetch('/competitions/PL/standings');
}

/**
 * Extract all players from all teams
 * Normalizes position names and adds team info
 */
export async function fetchAllPlayers() {
    const data = await fetchTeams();
    const players = [];

    for (const team of data.teams || []) {
        for (const player of team.squad || []) {
            players.push({
                id: player.id,
                name: player.name,
                position: normalizePosition(player.position),
                positionRaw: player.position,
                dateOfBirth: player.dateOfBirth,
                nationality: player.nationality,
                shirtNumber: player.shirtNumber,
                teamId: team.id,
                teamName: team.shortName || team.name,
                teamCrest: team.crest,
            });
        }
    }

    return players;
}

/**
 * Normalize API position strings to short codes
 */
function normalizePosition(pos) {
    if (!pos) return 'MID';
    const p = pos.toLowerCase();
    if (p.includes('goal')) return 'GK';
    if (p.includes('def') || p.includes('back')) return 'DEF';
    if (p.includes('mid')) return 'MID';
    if (p.includes('att') || p.includes('for') || p.includes('wing') || p.includes('strik')) return 'FWD';
    return 'MID';
}

/**
 * Check if the API key is configured
 */
export function isApiKeySet() {
    return API_KEY && API_KEY !== 'YOUR_API_KEY_HERE';
}

/**
 * Clear the cache
 */
export function clearCache() {
    cache.clear();
}
