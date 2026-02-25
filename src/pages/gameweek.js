/**
 * gameweek.js — Gameweek view page
 * Navigate matchdays, view fixtures, see player scores, set captain
 */

import { fetchCompetition, fetchMatches, isApiKeySet } from '../api/football.js';
import { getSquad, getCaptain, setCaptain, calculatePoints, saveGameweekScores, getGameweekScores } from '../state/store.js';
import { renderSquadPanel } from '../components/squadPanel.js';
import { showToast } from '../main.js';

let currentMatchday = 1;
let maxMatchday = 38;

export default async function gameweekPage(container) {
    // Get current matchday from API
    if (isApiKeySet()) {
        try {
            const comp = await fetchCompetition();
            currentMatchday = comp.currentSeason?.currentMatchday || 1;
            maxMatchday = 38;
        } catch (err) {
            console.error('Failed to fetch competition:', err);
        }
    }

    renderGW(container);
}

async function renderGW(container) {
    const squad = getSquad();
    const captainId = getCaptain();
    const gwScores = getGameweekScores(currentMatchday);
    let gwTotal = 0;
    for (const pts of Object.values(gwScores)) {
        gwTotal += pts;
    }

    container.innerHTML = `
    <div class="page__header">
      <h1 class="page__title">Gameweek</h1>
      <p class="page__subtitle">Track your squad's performance and set your captain</p>
    </div>

    <div class="gw-nav">
      <button class="gw-nav__btn" id="gw-prev" ${currentMatchday <= 1 ? 'disabled' : ''}>←</button>
      <div class="gw-nav__label">Gameweek ${currentMatchday}</div>
      <button class="gw-nav__btn" id="gw-next" ${currentMatchday >= maxMatchday ? 'disabled' : ''}>→</button>
    </div>

    <div class="stats-grid" style="margin-bottom: var(--space-xl);">
      <div class="card stat-card">
        <div class="stat-card__value">${gwTotal}</div>
        <div class="stat-card__label">GW ${currentMatchday} Points</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__value" id="total-season-pts">—</div>
        <div class="stat-card__label">Season Total</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 340px;gap:var(--space-xl);">
      <div>
        <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:var(--space-md);">Fixtures</h2>
        <div id="gw-matches" class="matches-grid">
          <div class="shimmer shimmer-block"></div>
          <div class="shimmer shimmer-block"></div>
        </div>

        ${squad.length > 0
            ? `
          <div class="scoring-section">
            <h2 class="scoring-section__title">Your Squad — Point Breakdown</h2>
            <div id="gw-scores" class="card card--no-hover" style="padding:0;">
              <p style="padding:var(--space-md);color:var(--text-muted);font-size:0.85rem;">
                Loading match data for scoring...
              </p>
            </div>
          </div>
        `
            : `
          <div class="empty-state" style="margin-top:var(--space-xl);">
            <div class="empty-state__icon">📋</div>
            <div class="empty-state__title">No players drafted</div>
            <p class="empty-state__text">Head to the <a href="#/draft">Draft Room</a> to build your squad first.</p>
          </div>
        `
        }
      </div>

      <div id="gw-squad-panel"></div>
    </div>
  `;

    // GW navigation
    document.getElementById('gw-prev')?.addEventListener('click', () => {
        if (currentMatchday > 1) {
            currentMatchday--;
            renderGW(container);
        }
    });

    document.getElementById('gw-next')?.addEventListener('click', () => {
        if (currentMatchday < maxMatchday) {
            currentMatchday++;
            renderGW(container);
        }
    });

    // Squad panel with captain selection
    const squadPanel = document.getElementById('gw-squad-panel');
    if (squadPanel) {
        renderSquadPanel(squadPanel, {
            onCaptain: (id) => {
                setCaptain(id);
                showToast('Captain updated! 🧢', 'success');
                renderGW(container);
            },
        });
    }

    // Load match data
    if (isApiKeySet()) {
        try {
            const matchData = await fetchMatches(currentMatchday);
            renderMatches(matchData.matches || []);
            if (squad.length > 0) {
                calculateSquadScores(matchData.matches || [], squad, captainId);
            }
        } catch (err) {
            console.error('Failed to load matches:', err);
            const matchesEl = document.getElementById('gw-matches');
            if (matchesEl) {
                matchesEl.innerHTML = `
          <div class="card" style="border-color:var(--color-danger);">
            <p style="color:var(--color-danger);">Failed to load: ${err.message}</p>
          </div>
        `;
            }
        }
    } else {
        const matchesEl = document.getElementById('gw-matches');
        if (matchesEl) {
            matchesEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📡</div>
          <div class="empty-state__title">API key required</div>
          <p class="empty-state__text">Add your football-data.org key to see live fixtures.</p>
        </div>
      `;
        }
    }
}

function renderMatches(matches) {
    const matchesEl = document.getElementById('gw-matches');
    if (!matchesEl) return;

    if (matches.length === 0) {
        matchesEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📅</div>
        <div class="empty-state__title">No fixtures</div>
        <p class="empty-state__text">No matches scheduled for this gameweek.</p>
      </div>
    `;
        return;
    }

    matchesEl.innerHTML = matches
        .map(
            (m) => `
    <div class="card match-card">
      <div class="match-card__team">
        ${m.homeTeam?.crest ? `<img class="match-card__crest" src="${m.homeTeam.crest}" alt="${m.homeTeam.shortName}" onerror="this.style.display='none'" />` : ''}
        <div class="match-card__team-name">${m.homeTeam?.shortName || m.homeTeam?.name || '?'}</div>
      </div>
      <div>
        <div class="match-card__score">
          ${m.status === 'FINISHED' || m.status === 'IN_PLAY' ? `${m.score?.fullTime?.home ?? '?'} — ${m.score?.fullTime?.away ?? '?'}` : 'vs'}
        </div>
        <div class="match-card__status ${m.status === 'IN_PLAY' ? 'match-card__status--live' : ''}">
          ${m.status === 'IN_PLAY' ? '● LIVE' : m.status === 'FINISHED' ? 'FT' : formatMatchDate(m.utcDate)}
        </div>
      </div>
      <div class="match-card__team">
        ${m.awayTeam?.crest ? `<img class="match-card__crest" src="${m.awayTeam.crest}" alt="${m.awayTeam.shortName}" onerror="this.style.display='none'" />` : ''}
        <div class="match-card__team-name">${m.awayTeam?.shortName || m.awayTeam?.name || '?'}</div>
      </div>
    </div>
  `
        )
        .join('');
}

function calculateSquadScores(matches, squad, captainId) {
    const scoresEl = document.getElementById('gw-scores');
    if (!scoresEl) return;

    // Build a map of team goals/conceded from finished matches
    const teamStats = {};
    const playerGoals = {};
    const playerAssists = {};
    const playerCards = {};

    for (const match of matches) {
        if (match.status !== 'FINISHED') continue;

        const homeId = match.homeTeam?.id;
        const awayId = match.awayTeam?.id;
        const homeGoals = match.score?.fullTime?.home || 0;
        const awayGoals = match.score?.fullTime?.away || 0;

        // Clean sheets
        if (!teamStats[homeId]) teamStats[homeId] = { conceded: 0, scored: 0 };
        if (!teamStats[awayId]) teamStats[awayId] = { conceded: 0, scored: 0 };
        teamStats[homeId].conceded += awayGoals;
        teamStats[homeId].scored += homeGoals;
        teamStats[awayId].conceded += homeGoals;
        teamStats[awayId].scored += awayGoals;

        // Goals & assists from match detail
        for (const goal of match.goals || []) {
            if (goal.scorer?.id) {
                playerGoals[goal.scorer.id] = (playerGoals[goal.scorer.id] || 0) + 1;
            }
            if (goal.assist?.id) {
                playerAssists[goal.assist.id] = (playerAssists[goal.assist.id] || 0) + 1;
            }
        }

        // Bookings
        for (const booking of match.bookings || []) {
            if (booking.player?.id) {
                if (!playerCards[booking.player.id]) {
                    playerCards[booking.player.id] = { yellow: 0, red: 0 };
                }
                if (booking.card === 'YELLOW_CARD') {
                    playerCards[booking.player.id].yellow++;
                } else if (booking.card === 'RED_CARD') {
                    playerCards[booking.player.id].red++;
                }
            }
        }
    }

    // Calculate per-player scores
    const gwScores = {};
    const rows = [];

    for (const player of squad) {
        const goals = playerGoals[player.id] || 0;
        const assists = playerAssists[player.id] || 0;
        const cards = playerCards[player.id] || { yellow: 0, red: 0 };
        const teamStat = teamStats[player.teamId];
        const cleanSheet = teamStat ? teamStat.conceded === 0 : false;
        const isCaptain = player.id === captainId;

        const events = {
            goals,
            assists,
            cleanSheet,
            yellowCard: cards.yellow > 0,
            redCard: cards.red > 0,
        };

        const pts = calculatePoints(player.position, events, isCaptain);
        gwScores[player.id] = pts;

        const details = [];
        if (goals) details.push(`⚽ ${goals} goal${goals > 1 ? 's' : ''}`);
        if (assists) details.push(`🅰️ ${assists} assist${assists > 1 ? 's' : ''}`);
        if (cleanSheet) details.push('🧤 Clean sheet');
        if (cards.yellow) details.push('🟡 Yellow');
        if (cards.red) details.push('🔴 Red');
        if (isCaptain) details.push('©️ Captain 2×');

        rows.push({ player, pts, details: details.join(' · ') || 'No events', isCaptain });
    }

    // Save scores
    saveGameweekScores(currentMatchday, gwScores);

    // Update season total
    let seasonTotal = 0;
    // Simple: sum all saved GW scores
    for (let gw = 1; gw <= maxMatchday; gw++) {
        const s = getGameweekScores(gw);
        for (const p of Object.values(s)) seasonTotal += p;
    }
    const totalEl = document.getElementById('total-season-pts');
    if (totalEl) totalEl.textContent = seasonTotal;

    // Sort by points desc
    rows.sort((a, b) => b.pts - a.pts);

    scoresEl.innerHTML = rows
        .map(
            (r) => `
    <div class="score-row">
      <div class="score-row__player">
        <span class="player-card__pos player-card__pos--${r.player.position?.toLowerCase()}" style="font-size:0.65rem;">${r.player.position}</span>
        <span style="font-weight:600;">${r.player.name}${r.isCaptain ? ' <span style="color:var(--color-warning);">©</span>' : ''}</span>
      </div>
      <div class="score-row__detail">${r.details}</div>
      <div class="score-row__points ${r.pts < 0 ? 'score-row__points--negative' : ''}">${r.pts > 0 ? '+' : ''}${r.pts}</div>
    </div>
  `
        )
        .join('');
}

function formatMatchDate(utcDate) {
    if (!utcDate) return '';
    const d = new Date(utcDate);
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
