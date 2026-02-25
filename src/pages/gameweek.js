/**
 * gameweek.js — Football-themed Gameweek page
 * Scoreboard fixtures + squad point breakdown
 */

import { fetchCompetition, fetchMatches, isApiKeySet } from '../api/football.js';
import { getSquad, getCaptain, setCaptain, calculatePoints, saveGameweekScores, getGameweekScores, getTotalPoints } from '../state/store.js';
import { renderSquadPanel } from '../components/squadPanel.js';
import { showToast } from '../main.js';
import { animate, stagger } from 'motion';

let currentMatchday = 1;
let maxMatchday = 38;

export default async function gameweekPage(container) {
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
  for (const pts of Object.values(gwScores)) gwTotal += pts;

  container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">Match Overview</div>
      <h1 class="page__title">Gameweek <span style="color:var(--gold)">${currentMatchday}</span></h1>
      <p class="page__subtitle">Track fixtures and your squad's scoring</p>
    </div>

    <div class="gw-nav" style="opacity:0">
      <button class="gw-nav__btn" id="gw-prev" ${currentMatchday <= 1 ? 'disabled' : ''}>←</button>
      <div class="gw-nav__label">
        GW <span>${currentMatchday}</span>
        <span style="color:var(--chalk-muted);font-size:0.9rem;font-weight:400"> / 38</span>
      </div>
      <button class="gw-nav__btn" id="gw-next" ${currentMatchday >= maxMatchday ? 'disabled' : ''}>→</button>
    </div>

    <div class="stats-grid" style="opacity:0;margin-bottom:var(--space-xl)">
      <div class="stat-card">
        <div class="stat-card__value">${gwTotal}</div>
        <div class="stat-card__label">GW ${currentMatchday} Points</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value" id="total-season-pts">—</div>
        <div class="stat-card__label">Season Total</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 360px;gap:var(--space-xl);">
      <div>
        <div class="section-heading" style="opacity:0">
          <h2 class="section-heading__title">GW${currentMatchday} <span>Fixtures</span></h2>
          <div class="section-heading__line"></div>
        </div>
        <div id="gw-matches" class="matches-grid" style="margin-bottom:var(--space-2xl)">
          <div class="shimmer-block" style="height:140px"></div>
          <div class="shimmer-block" style="height:140px"></div>
          <div class="shimmer-block" style="height:140px"></div>
        </div>

        ${squad.length > 0 ? `
          <div class="scoring-section" style="opacity:0">
            <div class="section-heading">
              <h2 class="section-heading__title">Your Squad — <span>Points</span></h2>
              <div class="section-heading__line"></div>
            </div>
            <div id="gw-scores" class="card card--no-hover" style="padding:0;border-top:3px solid var(--gold);">
              <div style="padding:var(--space-md);color:var(--chalk-muted);font-family:var(--font-condensed);font-size:0.85rem;letter-spacing:0.05em;">
                Loading match data...
              </div>
            </div>
          </div>
        ` : `
          <div class="empty-state" style="opacity:0">
            <div class="empty-state__icon">📋</div>
            <div class="empty-state__title">No players drafted</div>
            <p class="empty-state__text">Head to the <a href="#/draft">Draft Room</a> to build your squad first.</p>
          </div>
        `}
      </div>

      <div id="gw-squad-panel"></div>
    </div>
  `;

  // Stagger entrance animations
  animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });
  animate('.gw-nav', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.1 });
  animate('.stats-grid', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.18 });
  animate('.section-heading', { opacity: [0, 1], y: [8, 0] }, { duration: 0.35, delay: 0.25 });
  animate('.scoring-section, .empty-state', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.3 });

  // Update season total
  const totalEl = document.getElementById('total-season-pts');
  if (totalEl) totalEl.textContent = getTotalPoints();

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

  // Squad panel
  const squadPanel = document.getElementById('gw-squad-panel');
  if (squadPanel) {
    renderSquadPanel(squadPanel, {
      onCaptain: (id) => {
        setCaptain(id);
        showToast('Captain updated!', 'success');
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
      const el = document.getElementById('gw-matches');
      if (el) {
        el.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">⚡</div>
            <div class="empty-state__title">Connection issue</div>
            <p class="empty-state__text">${err.message}</p>
          </div>
        `;
      }
    }
  } else {
    const el = document.getElementById('gw-matches');
    if (el) {
      el.innerHTML = `
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
  const el = document.getElementById('gw-matches');
  if (!el) return;

  if (matches.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📅</div>
        <div class="empty-state__title">No fixtures</div>
        <p class="empty-state__text">No matches scheduled for this gameweek.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = matches.map((m) => {
    const isLive = m.status === 'IN_PLAY';
    const isFinished = m.status === 'FINISHED';
    const scoreStr = (isLive || isFinished)
      ? `${m.score?.fullTime?.home ?? '?'} : ${m.score?.fullTime?.away ?? '?'}`
      : 'vs';
    const statusStr = isLive ? 'LIVE' : isFinished ? 'FT' : formatDate(m.utcDate);

    return `
      <div class="fixture-card">
        <div class="fixture-card__header">
          <span class="fixture-card__competition">Football</span>
          <span class="fixture-card__status ${isLive ? 'fixture-card__status--live' : ''}">${statusStr}</span>
        </div>
        <div class="fixture-card__body">
          <div class="fixture-card__team fixture-card__team--home">
            ${m.homeTeam?.crest ? `<img class="fixture-card__crest" src="${m.homeTeam.crest}" alt="" onerror="this.style.display='none'" />` : ''}
            <div class="fixture-card__team-name">${m.homeTeam?.shortName || m.homeTeam?.name || '?'}</div>
          </div>
          <div class="fixture-card__score">
            <div class="fixture-card__score-value">${scoreStr}</div>
            <div class="fixture-card__score-label">${isLive ? '● Live' : isFinished ? 'Full Time' : 'Upcoming'}</div>
          </div>
          <div class="fixture-card__team fixture-card__team--away">
            ${m.awayTeam?.crest ? `<img class="fixture-card__crest" src="${m.awayTeam.crest}" alt="" onerror="this.style.display='none'" />` : ''}
            <div class="fixture-card__team-name">${m.awayTeam?.shortName || m.awayTeam?.name || '?'}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  animate(
    '#gw-matches .fixture-card',
    { opacity: [0, 1], y: [14, 0] },
    { duration: 0.35, delay: stagger(0.06), easing: 'ease-out' }
  );
}

function calculateSquadScores(matches, squad, captainId) {
  const scoresEl = document.getElementById('gw-scores');
  if (!scoresEl) return;

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

    if (!teamStats[homeId]) teamStats[homeId] = { conceded: 0, scored: 0 };
    if (!teamStats[awayId]) teamStats[awayId] = { conceded: 0, scored: 0 };
    teamStats[homeId].conceded += awayGoals;
    teamStats[homeId].scored += homeGoals;
    teamStats[awayId].conceded += homeGoals;
    teamStats[awayId].scored += awayGoals;

    for (const goal of match.goals || []) {
      if (goal.scorer?.id) playerGoals[goal.scorer.id] = (playerGoals[goal.scorer.id] || 0) + 1;
      if (goal.assist?.id) playerAssists[goal.assist.id] = (playerAssists[goal.assist.id] || 0) + 1;
    }

    for (const booking of match.bookings || []) {
      if (booking.player?.id) {
        if (!playerCards[booking.player.id]) playerCards[booking.player.id] = { yellow: 0, red: 0 };
        if (booking.card === 'YELLOW_CARD') playerCards[booking.player.id].yellow++;
        else if (booking.card === 'RED_CARD') playerCards[booking.player.id].red++;
      }
    }
  }

  const rows = [];
  const gwScores = {};

  for (const player of squad) {
    const goals = playerGoals[player.id] || 0;
    const assists = playerAssists[player.id] || 0;
    const cards = playerCards[player.id] || { yellow: 0, red: 0 };
    const teamStat = teamStats[player.teamId];
    const cleanSheet = teamStat ? teamStat.conceded === 0 : false;
    const isCaptain = player.id === captainId;

    const events = { goals, assists, cleanSheet, yellowCard: cards.yellow > 0, redCard: cards.red > 0 };
    const pts = calculatePoints(player.position, events, isCaptain);
    gwScores[player.id] = pts;

    const pos = player.position || 'MID';
    const posColors = { GK: '#f5c518', DEF: '#60a5fa', MID: '#4ade80', FWD: '#f87171' };
    const posColor = posColors[pos] || 'var(--chalk-dim)';

    const details = [];
    if (goals) details.push(`⚽ ${goals}`);
    if (assists) details.push(`🅰️ ${assists}`);
    if (cleanSheet) details.push('🧤 CS');
    if (cards.yellow) details.push('🟡');
    if (cards.red) details.push('🔴');
    if (isCaptain) details.push('© 2×');

    rows.push({ player, pts, details: details.join('  ') || 'Appearance', isCaptain, posColor });
  }

  saveGameweekScores(currentMatchday, gwScores);

  // Update season total
  let seasonTotal = 0;
  for (let gw = 1; gw <= maxMatchday; gw++) {
    const s = getGameweekScores(gw);
    for (const p of Object.values(s)) seasonTotal += p;
  }
  const totalEl = document.getElementById('total-season-pts');
  if (totalEl) totalEl.textContent = seasonTotal;

  rows.sort((a, b) => b.pts - a.pts);

  scoresEl.innerHTML = rows.map((r) => `
    <div class="score-row">
      <div class="score-row__player">
        <div style="width:28px;height:28px;border-radius:50%;background:${r.posColor}22;display:flex;align-items:center;justify-content:center;font-family:var(--font-condensed);font-size:0.6rem;font-weight:900;color:${r.posColor};flex-shrink:0">
          ${r.player.position || 'MID'}
        </div>
        <span>${r.player.name}${r.isCaptain ? ' <span style="color:var(--gold);font-family:var(--font-condensed);font-size:0.72rem;font-weight:900">© C</span>' : ''}</span>
      </div>
      <div class="score-row__detail">${r.details}</div>
      <div class="score-row__points ${r.pts < 0 ? 'score-row__points--negative' : ''}">${r.pts > 0 ? '+' : ''}${r.pts}</div>
    </div>
  `).join('');

  const scoreRows = scoresEl.querySelectorAll('.score-row');
  animate(
    scoreRows,
    { opacity: [0, 1], x: [10, 0] },
    { duration: 0.3, delay: stagger(0.04), easing: 'ease-out' }
  );
}

function formatDate(utcDate) {
  if (!utcDate) return '';
  const d = new Date(utcDate);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
