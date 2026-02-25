/**
 * social.js — Gamification & Social state management
 * Achievements, predictions, trash talk, season journal
 */

const STORAGE_KEYS = {
    ACHIEVEMENTS: 'prem_achievements',
    PREDICTIONS: 'prem_predictions',
    JOURNAL: 'prem_journal',
};

function load(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

// ---- Achievement Definitions ----

export const ACHIEVEMENT_DEFS = [
    { id: 'first_draft', name: 'First Pick', desc: 'Draft your first player', icon: '🏅', category: 'draft' },
    { id: 'full_squad', name: 'Squad Complete', desc: 'Draft all 15 players', icon: '🏆', category: 'draft' },
    { id: 'set_captain', name: 'Armband On', desc: 'Set your first captain', icon: '©️', category: 'draft' },
    { id: 'diverse_squad', name: 'Globetrotter', desc: 'Draft players from 5+ different teams', icon: '🌍', category: 'draft' },
    { id: 'gw_10pts', name: 'Getting Started', desc: 'Score 10+ points in a gameweek', icon: '⭐', category: 'scoring' },
    { id: 'gw_30pts', name: 'On Fire', desc: 'Score 30+ points in a gameweek', icon: '🔥', category: 'scoring' },
    { id: 'gw_50pts', name: 'Masterclass', desc: 'Score 50+ points in a gameweek', icon: '💎', category: 'scoring' },
    { id: 'season_100', name: 'Century', desc: 'Reach 100 total season points', icon: '💯', category: 'scoring' },
    { id: 'h2h_first_win', name: 'First Blood', desc: 'Win your first H2H match', icon: '⚔️', category: 'h2h' },
    { id: 'h2h_3_streak', name: 'Hat Trick Hero', desc: 'Win 3 H2H matches', icon: '🎩', category: 'h2h' },
    { id: 'h2h_10_wins', name: 'Arena Champion', desc: 'Win 10 H2H matches', icon: '👑', category: 'h2h' },
    { id: 'prediction_correct', name: 'Oracle', desc: 'Correctly predict a match result', icon: '🔮', category: 'social' },
    { id: 'prediction_5', name: 'Prophet', desc: 'Get 5 predictions correct', icon: '🎯', category: 'social' },
    { id: 'trash_talk', name: 'Banter King', desc: 'Generate your first trash talk', icon: '🗣️', category: 'social' },
];

// ---- Achievements ----

export function getAchievements() {
    return load(STORAGE_KEYS.ACHIEVEMENTS) || {};
}

export function unlockAchievement(id) {
    const achievements = getAchievements();
    if (achievements[id]) return false; // Already unlocked
    achievements[id] = { unlockedAt: Date.now() };
    save(STORAGE_KEYS.ACHIEVEMENTS, achievements);
    return true; // Newly unlocked
}

export function isAchievementUnlocked(id) {
    return !!getAchievements()[id];
}

/**
 * Check squad/score state and unlock any earned achievements
 * Returns array of newly unlocked achievement IDs
 */
export function checkAndUnlockAchievements(context = {}) {
    const { squad = [], captainId, gwPoints = 0, totalPoints = 0, h2hRecord = null } = context;
    const newlyUnlocked = [];

    // Draft achievements
    if (squad.length >= 1 && unlockAchievement('first_draft')) newlyUnlocked.push('first_draft');
    if (squad.length >= 15 && unlockAchievement('full_squad')) newlyUnlocked.push('full_squad');
    if (captainId && unlockAchievement('set_captain')) newlyUnlocked.push('set_captain');

    // Team diversity
    const teams = new Set(squad.map(p => p.teamId));
    if (teams.size >= 5 && unlockAchievement('diverse_squad')) newlyUnlocked.push('diverse_squad');

    // Scoring
    if (gwPoints >= 10 && unlockAchievement('gw_10pts')) newlyUnlocked.push('gw_10pts');
    if (gwPoints >= 30 && unlockAchievement('gw_30pts')) newlyUnlocked.push('gw_30pts');
    if (gwPoints >= 50 && unlockAchievement('gw_50pts')) newlyUnlocked.push('gw_50pts');
    if (totalPoints >= 100 && unlockAchievement('season_100')) newlyUnlocked.push('season_100');

    // H2H
    if (h2hRecord) {
        if (h2hRecord.wins >= 1 && unlockAchievement('h2h_first_win')) newlyUnlocked.push('h2h_first_win');
        if (h2hRecord.wins >= 3 && unlockAchievement('h2h_3_streak')) newlyUnlocked.push('h2h_3_streak');
        if (h2hRecord.wins >= 10 && unlockAchievement('h2h_10_wins')) newlyUnlocked.push('h2h_10_wins');
    }

    return newlyUnlocked;
}

// ---- Predictions ----

export function getPredictions() {
    return load(STORAGE_KEYS.PREDICTIONS) || [];
}

export function savePrediction(prediction) {
    const preds = getPredictions();
    preds.push({ ...prediction, createdAt: Date.now() });
    save(STORAGE_KEYS.PREDICTIONS, preds);
}

export function getPredictionStats() {
    const preds = getPredictions().filter(p => p.resolved);
    const correct = preds.filter(p => p.correct).length;
    return { total: preds.length, correct, accuracy: preds.length > 0 ? Math.round((correct / preds.length) * 100) : 0 };
}

// ---- Season Journal ----

export function getJournal() {
    return load(STORAGE_KEYS.JOURNAL) || [];
}

export function addJournalEntry(entry) {
    const journal = getJournal();
    journal.unshift({ ...entry, timestamp: Date.now() });
    if (journal.length > 50) journal.length = 50;
    save(STORAGE_KEYS.JOURNAL, journal);
}

// ---- Trash Talk ----

const TRASH_TALK_TEMPLATES = [
    "Your squad couldn't beat a Sunday league team",
    "My captain scores more in one match than your whole squad in a season",
    "I've seen better tactics from a coin flip",
    "Your defense is more porous than Swiss cheese",
    "My bench players would walk into your starting XI",
    "You drafted like you were blindfolded",
    "My GK has more assists than your midfield",
    "That squad screams 'I picked last'",
    "Even VAR can't save your gameweek score",
    "Your formation is a mystery... even to your players",
    "I'd say good luck, but luck can't fix that squad",
    "My fantasy points have more zeros than your bank account",
    "Your captain pick was... a choice",
    "Did you draft with your eyes closed or was that intentional?",
    "If fantasy points were currency, you'd need a loan",
];

export function generateTrashTalk(targetTeam) {
    const teamSpecific = [
        `${targetTeam}? More like ${targetTeam.slice(0, -1)}losers`,
        `Even ${targetTeam} fans wouldn't pick ${targetTeam} players`,
        `${targetTeam}'s best player can't carry your squad`,
        `Backing ${targetTeam} is a personality red flag`,
    ];

    const all = [...TRASH_TALK_TEMPLATES, ...teamSpecific];
    return all[Math.floor(Math.random() * all.length)];
}

export function resetSocial() {
    localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.PREDICTIONS);
    localStorage.removeItem(STORAGE_KEYS.JOURNAL);
}
