/**
 * ai.js — AI Strategy Assistant analysis engine
 * Algorithmic analysis of football-data.org data for recommendations
 */

import { getSquad, getCaptain, getPositionCounts, POSITION_LIMITS, SCORING } from './store.js';

// ---- Captain Recommendation ----

/**
 * Recommend best captain pick based on fixture difficulty
 * Favors FWD/MID players against low-ranked opponents
 */
export function analyzeCaptainPick(squad, standings, matchday, matches) {
    if (!squad.length) return { recommendation: null, reasoning: 'Draft players first.' };

    const standingsMap = {};
    if (standings?.length) {
        for (const row of standings) {
            standingsMap[row.team?.id] = row.position;
        }
    }

    // Find opponent rank for each player's team this matchday
    const teamOpponentRank = {};
    if (matches?.length) {
        for (const m of matches) {
            const homeId = m.homeTeam?.id;
            const awayId = m.awayTeam?.id;
            if (homeId && awayId) {
                // Home team faces away team and vice versa
                teamOpponentRank[homeId] = standingsMap[awayId] || 10;
                teamOpponentRank[awayId] = standingsMap[homeId] || 10;
            }
        }
    }

    // Score each player
    const scored = squad.map(player => {
        let score = 0;
        const pos = player.position || 'MID';

        // Position weight (FWD > MID > DEF > GK for attacking returns)
        const posWeight = { FWD: 4, MID: 3, DEF: 1.5, GK: 1 };
        score += posWeight[pos] || 2;

        // Fixture difficulty (higher rank opponent = harder = lower score)
        const oppRank = teamOpponentRank[player.teamId] || 10;
        score += Math.max(0, (21 - oppRank) * 0.3); // Facing 20th = +6, facing 1st = +0

        // Small random factor for variety
        score += Math.random() * 0.5;

        const oppTeam = findOpponentTeam(player.teamId, matches);

        return {
            player,
            score,
            opponentRank: oppRank,
            opponentName: oppTeam,
            reasoning: oppRank >= 15
                ? `Great fixture — facing a bottom-half team (${ordinal(oppRank)})`
                : oppRank <= 5
                    ? `Tough fixture — facing a top-5 team (${ordinal(oppRank)})`
                    : `Moderate fixture (opponent ranked ${ordinal(oppRank)})`,
        };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
        recommendation: scored[0]?.player || null,
        top3: scored.slice(0, 3),
        reasoning: scored[0]
            ? `${scored[0].player.name} has the best combination of position value and fixture difficulty.`
            : 'No data available.',
    };
}

// ---- Draft Suggestions ----

/**
 * Suggest best undrafted players based on team strength and position needs
 */
export function analyzeDraftSuggestions(squad, allPlayers, standings) {
    const draftedIds = new Set(squad.map(p => p.id));
    const posCounts = getPositionCounts();

    // Build team rank map
    const teamRank = {};
    if (standings?.length) {
        for (const row of standings) {
            teamRank[row.team?.id] = row.position;
        }
    }

    // Find positions with open slots
    const openPositions = {};
    for (const [pos, limit] of Object.entries(POSITION_LIMITS)) {
        const current = posCounts[pos] || 0;
        if (current < limit) {
            openPositions[pos] = limit - current;
        }
    }

    const available = allPlayers
        .filter(p => !draftedIds.has(p.id))
        .map(player => {
            let score = 0;
            const pos = player.position || 'MID';

            // Bonus if position has open slots
            if (openPositions[pos]) score += 3;

            // Team strength (top teams = better players)
            const rank = teamRank[player.teamId] || 10;
            score += Math.max(0, (21 - rank) * 0.4);

            // Position value for scoring
            const posValue = { FWD: 2, MID: 1.5, DEF: 1, GK: 0.5 };
            score += posValue[pos] || 1;

            return { player, score, teamRank: rank };
        });

    available.sort((a, b) => b.score - a.score);

    return {
        suggestions: available.slice(0, 8).map(s => ({
            player: s.player,
            reason: openPositions[s.player.position]
                ? `Fills a ${s.player.position} slot — plays for a top-${s.teamRank} team`
                : `Strong pick from a top-${s.teamRank} team`,
        })),
        openPositions,
    };
}

// ---- Squad Analysis ----

/**
 * Analyze squad composition and identify weaknesses
 */
export function analyzeSquadGaps(squad) {
    const posCounts = getPositionCounts();
    const gaps = [];
    const strengths = [];

    for (const [pos, limit] of Object.entries(POSITION_LIMITS)) {
        const count = posCounts[pos] || 0;
        if (count === 0) {
            gaps.push({ position: pos, severity: 'critical', message: `No ${posName(pos)} drafted — you need ${limit}` });
        } else if (count < limit) {
            gaps.push({ position: pos, severity: 'warning', message: `${posName(pos)}: ${count}/${limit} — ${limit - count} more needed` });
        } else {
            strengths.push({ position: pos, message: `${posName(pos)}: Full (${count}/${limit})` });
        }
    }

    // Team diversity
    const teams = new Set(squad.map(p => p.teamId));
    if (teams.size < 3 && squad.length > 5) {
        gaps.push({ position: 'TEAM', severity: 'warning', message: `Low diversity — players from only ${teams.size} team${teams.size === 1 ? '' : 's'}` });
    }

    // Captain check
    const captain = getCaptain();
    if (squad.length > 0 && !captain) {
        gaps.push({ position: 'CAPTAIN', severity: 'warning', message: 'No captain set — you\'re missing 2× points' });
    }

    return {
        gaps,
        strengths,
        totalPlayers: squad.length,
        maxPlayers: 15,
        overallRating: squad.length === 0 ? 'empty' : gaps.some(g => g.severity === 'critical') ? 'weak' : gaps.length > 0 ? 'decent' : 'strong',
    };
}

// ---- Fixture Difficulty ----

/**
 * Rate fixture difficulty for a team over next few matchdays
 */
export function analyzeFixtureDifficulty(teamId, standings, allMatches) {
    if (!allMatches?.length || !standings?.length) return [];

    const teamRank = {};
    for (const row of standings) {
        teamRank[row.team?.id] = { position: row.position, name: row.team?.shortName || row.team?.name };
    }

    // Find matches involving this team
    const teamMatches = allMatches
        .filter(m => m.homeTeam?.id === teamId || m.awayTeam?.id === teamId)
        .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
        .slice(0, 5);

    return teamMatches.map(m => {
        const isHome = m.homeTeam?.id === teamId;
        const oppId = isHome ? m.awayTeam?.id : m.homeTeam?.id;
        const oppInfo = teamRank[oppId] || { position: 10, name: '?' };

        let difficulty;
        if (oppInfo.position <= 4) difficulty = 'hard';
        else if (oppInfo.position <= 10) difficulty = 'medium';
        else difficulty = 'easy';

        return {
            matchday: m.matchday,
            opponent: oppInfo.name,
            opponentRank: oppInfo.position,
            isHome,
            difficulty,
            date: m.utcDate,
        };
    });
}

// ---- Helpers ----

function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function posName(pos) {
    const names = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards' };
    return names[pos] || pos;
}

function findOpponentTeam(teamId, matches) {
    if (!matches) return null;
    for (const m of matches) {
        if (m.homeTeam?.id === teamId) return m.awayTeam?.shortName || m.awayTeam?.name;
        if (m.awayTeam?.id === teamId) return m.homeTeam?.shortName || m.homeTeam?.name;
    }
    return null;
}
