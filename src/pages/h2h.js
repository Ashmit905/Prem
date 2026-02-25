/**
 * h2h.js — 2v2 Head-to-Head Arena page
 * Friend-vs-friend via share codes + AI rival fallback
 */

import { fetchAllPlayers, fetchCompetition, fetchMatches, isApiKeySet } from '../api/football.js';
import { getSquad, getCaptain, calculatePoints } from '../state/store.js';
import {
  generateOpponent, getOpponentSquad, getH2HRecord, saveH2HResult,
  addH2HMatch, getH2HHistory, encodeSquadToCode, importFriendSquad,
} from '../state/h2h.js';
import { checkAndUnlockAchievements } from '../state/social.js';
import { showToast } from '../main.js';
import { animate, stagger } from 'motion';

export default async function h2hPage(container) {
  const squad = getSquad();
  const captainId = getCaptain();
  const record = getH2HRecord();
  let opponent = getOpponentSquad();

  container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">Head-to-Head</div>
      <h1 class="page__title">2v2 <span style="color:var(--gold)">Arena</span></h1>
      <p class="page__subtitle">Challenge your friends — share your squad code and battle it out</p>
    </div>

    <div class="h2h-record" style="opacity:0">
      <div class="h2h-record__item h2h-record__item--win">
        <div class="h2h-record__val">${record.wins}</div>
        <div class="h2h-record__lbl">Wins</div>
      </div>
      <div class="h2h-record__item h2h-record__item--draw">
        <div class="h2h-record__val">${record.draws}</div>
        <div class="h2h-record__lbl">Draws</div>
      </div>
      <div class="h2h-record__item h2h-record__item--loss">
        <div class="h2h-record__val">${record.losses}</div>
        <div class="h2h-record__lbl">Losses</div>
      </div>
    </div>

    ${squad.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state__icon">📋</div>
        <div class="empty-state__title">Draft your squad first</div>
        <p class="empty-state__text">Head to the <a href="#/draft">Draft Room</a> to build your 15-man squad before entering the arena.</p>
      </div>
    ` : `
      <!-- Share Code Section -->
      <div class="share-section" style="opacity:0">
        <div class="section-heading">
          <h2 class="section-heading__title">Your <span>Squad Code</span></h2>
          <div class="section-heading__line"></div>
        </div>
        <p style="color:var(--chalk-dim);font-size:0.85rem;margin-bottom:var(--space-md)">
          Send this code to a friend so they can import your squad and challenge you.
        </p>
        <div class="share-code-row">
          <input type="text" class="share-code-input" id="my-share-code" readonly value="Loading..." />
          <button class="btn btn--primary" id="copy-code">📋 Copy</button>
        </div>
      </div>

      <!-- Friend Import Section -->
      <div class="share-section" style="opacity:0">
        <div class="section-heading">
          <h2 class="section-heading__title">Import <span>Friend's Squad</span></h2>
          <div class="section-heading__line"></div>
        </div>
        <p style="color:var(--chalk-dim);font-size:0.85rem;margin-bottom:var(--space-md)">
          Paste your friend's share code below to load their squad as your opponent.
        </p>
        <div class="share-code-row">
          <input type="text" class="share-code-input" id="friend-code" placeholder="Paste friend's code here..." />
          <button class="btn btn--primary" id="import-friend">⚔ Challenge</button>
        </div>
      </div>

      <!-- OR divider -->
      <div class="h2h-divider">
        <div class="h2h-divider__line"></div>
        <span class="h2h-divider__text">OR</span>
        <div class="h2h-divider__line"></div>
      </div>

      <!-- AI Rival fallback -->
      <div class="h2h-actions" style="opacity:0">
        <button class="btn btn--outline" id="gen-rival">
          🤖 ${opponent && !opponent.isFriend ? 'New AI Rival' : 'Generate AI Rival'}
        </button>
        ${opponent ? '<button class="btn btn--primary" id="calc-scores">⚡ Calculate Scores</button>' : ''}
      </div>

      <div id="h2h-arena"></div>
      <div id="h2h-result"></div>
      <div id="h2h-history"></div>
    `}
  `;

  animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });
  animate('.h2h-record', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.1 });

  if (squad.length === 0) return;

  // Generate and display share code
  const myCode = encodeSquadToCode(squad, captainId, 'You');
  const codeInput = document.getElementById('my-share-code');
  if (codeInput) codeInput.value = myCode;

  animate('.share-section', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: stagger(0.1, { start: 0.15 }) });
  animate('.h2h-actions', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.4 });

  // Render existing opponent
  if (opponent) renderArena(container, squad, opponent);
  renderHistory(container);

  // Copy code button
  document.getElementById('copy-code')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      showToast('Squad code copied! Send it to your friend 🎯', 'success');
    } catch {
      // Fallback: select the input text
      codeInput?.select();
      showToast('Code selected — copy it manually (Ctrl+C)', 'info');
    }
  });

  // Import friend's squad
  document.getElementById('import-friend')?.addEventListener('click', () => {
    const code = document.getElementById('friend-code')?.value;
    if (!code || !code.trim()) {
      showToast('Paste your friend\'s share code first', 'error');
      return;
    }

    const result = importFriendSquad(code);
    if (!result.success) {
      showToast('Invalid code — ask your friend to re-copy it', 'error');
      return;
    }

    opponent = result.opponent;
    showToast(`${opponent.name}'s squad loaded! Hit Calculate Scores to battle ⚔`, 'success');
    renderArena(container, squad, opponent);

    // Show calc button if not already shown
    const actionsEl = container.querySelector('.h2h-actions');
    if (actionsEl && !document.getElementById('calc-scores')) {
      actionsEl.innerHTML = `
        <button class="btn btn--outline" id="gen-rival">🤖 Generate AI Rival</button>
        <button class="btn btn--primary" id="calc-scores">⚡ Calculate Scores</button>
      `;
      bindCalcButton(container, squad);
      bindRivalButton(container, squad);
    }
  });

  // AI rival button
  bindRivalButton(container, squad);
  bindCalcButton(container, squad);
}

function bindRivalButton(container, squad) {
  document.getElementById('gen-rival')?.addEventListener('click', async () => {
    if (!isApiKeySet()) { showToast('API key required to generate AI opponents', 'error'); return; }
    try {
      showToast('Generating AI rival...', 'info');
      const allPlayers = await fetchAllPlayers();
      const opponent = generateOpponent(allPlayers, squad);
      showToast(`${opponent.name} enters the arena!`, 'success');
      renderArena(container, squad, opponent);

      // Ensure calc button exists
      const actionsEl = container.querySelector('.h2h-actions');
      if (actionsEl && !document.getElementById('calc-scores')) {
        actionsEl.innerHTML = `
          <button class="btn btn--outline" id="gen-rival">🤖 New AI Rival</button>
          <button class="btn btn--primary" id="calc-scores">⚡ Calculate Scores</button>
        `;
        bindCalcButton(container, squad);
        bindRivalButton(container, squad);
      }
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  });
}

function bindCalcButton(container, squad) {
  document.getElementById('calc-scores')?.addEventListener('click', async () => {
    const opponent = getOpponentSquad();
    if (!opponent) { showToast('Import a friend or generate a rival first', 'error'); return; }
    if (!isApiKeySet()) { showToast('API key required for scoring', 'error'); return; }

    try {
      const comp = await fetchCompetition();
      const md = comp.currentSeason?.currentMatchday || 1;
      const matchData = await fetchMatches(md);
      const matches = matchData.matches || [];

      const yourScore = scoreSquad(squad, getCaptain(), matches);
      const oppScore = scoreSquad(opponent.squad, opponent.captainId, matches);

      let result;
      if (yourScore > oppScore) result = 'win';
      else if (yourScore === oppScore) result = 'draw';
      else result = 'loss';

      saveH2HResult(result);
      addH2HMatch({
        gameweek: md,
        rivalName: opponent.name,
        yourScore,
        oppScore,
        result,
        isFriend: !!opponent.isFriend,
      });

      const record = getH2HRecord();
      checkAndUnlockAchievements({ h2hRecord: record });

      renderResult(container, yourScore, oppScore, result, opponent.name, md);
      renderHistory(container);

      // Update record display
      const recordEl = container.querySelector('.h2h-record');
      if (recordEl) {
        recordEl.innerHTML = `
          <div class="h2h-record__item h2h-record__item--win">
            <div class="h2h-record__val">${record.wins}</div>
            <div class="h2h-record__lbl">Wins</div>
          </div>
          <div class="h2h-record__item h2h-record__item--draw">
            <div class="h2h-record__val">${record.draws}</div>
            <div class="h2h-record__lbl">Draws</div>
          </div>
          <div class="h2h-record__item h2h-record__item--loss">
            <div class="h2h-record__val">${record.losses}</div>
            <div class="h2h-record__lbl">Losses</div>
          </div>
        `;
      }

      const emoji = result === 'win' ? '🎉' : result === 'draw' ? '🤝' : '😤';
      showToast(`${result === 'win' ? 'Victory!' : result === 'draw' ? 'It\'s a draw!' : 'Defeated!'} ${emoji}`,
        result === 'win' ? 'success' : result === 'draw' ? 'info' : 'error');
    } catch (err) {
      showToast('Scoring failed: ' + err.message, 'error');
    }
  });
}

function scoreSquad(squad, captainId, matches) {
  let total = 0;
  const teamStats = {};
  const playerGoals = {};
  const playerAssists = {};

  for (const match of matches.filter(m => m.status === 'FINISHED')) {
    const homeId = match.homeTeam?.id;
    const awayId = match.awayTeam?.id;
    const hg = match.score?.fullTime?.home || 0;
    const ag = match.score?.fullTime?.away || 0;
    if (!teamStats[homeId]) teamStats[homeId] = { conceded: 0 };
    if (!teamStats[awayId]) teamStats[awayId] = { conceded: 0 };
    teamStats[homeId].conceded += ag;
    teamStats[awayId].conceded += hg;
    for (const g of match.goals || []) {
      if (g.scorer?.id) playerGoals[g.scorer.id] = (playerGoals[g.scorer.id] || 0) + 1;
      if (g.assist?.id) playerAssists[g.assist.id] = (playerAssists[g.assist.id] || 0) + 1;
    }
  }

  for (const p of squad) {
    const events = {
      goals: playerGoals[p.id] || 0,
      assists: playerAssists[p.id] || 0,
      cleanSheet: teamStats[p.teamId] ? teamStats[p.teamId].conceded === 0 : false,
      yellowCard: false,
      redCard: false,
    };
    total += calculatePoints(p.position, events, p.id === captainId);
  }
  return total;
}

function renderArena(container, squad, opponent) {
  const arenaEl = document.getElementById('h2h-arena');
  if (!arenaEl) return;

  const captainId = getCaptain();
  const opponentLabel = opponent.isFriend ? `👤 ${opponent.name}` : `🤖 ${opponent.name}`;
  const borderClass = opponent.isFriend ? 'arena__side--friend' : 'arena__side--rival';

  arenaEl.innerHTML = `
    <div class="arena">
      <div class="arena__side arena__side--you">
        <div class="arena__side-header">
          <div class="arena__side-label">Your Squad</div>
          <div class="arena__side-count">${squad.length} players</div>
        </div>
        <div class="arena__roster">
          ${squad.map(p => `
            <div class="arena__player">
              <span class="arena__player-pos arena__player-pos--${p.position?.toLowerCase()}">${p.position}</span>
              <span class="arena__player-name">${p.name}${p.id === captainId ? ' <span style="color:var(--gold)">©</span>' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="arena__vs">
        <div class="arena__vs-badge">VS</div>
        <div class="arena__rival-name">${opponent.isFriend ? '👤 Friend' : '🤖 AI'}</div>
      </div>

      <div class="arena__side ${borderClass}">
        <div class="arena__side-header">
          <div class="arena__side-label">${opponentLabel}</div>
          <div class="arena__side-count">${opponent.squad.length} players</div>
        </div>
        <div class="arena__roster">
          ${opponent.squad.map(p => `
            <div class="arena__player">
              <span class="arena__player-pos arena__player-pos--${p.position?.toLowerCase()}">${p.position}</span>
              <span class="arena__player-name">${p.name}${p.id === opponent.captainId ? ' <span style="color:var(--gold)">©</span>' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  animate('.arena__side', { opacity: [0, 1], x: [-20, 0] }, { duration: 0.4, delay: stagger(0.15) });
  animate('.arena__vs', { opacity: [0, 1], scale: [0.5, 1] }, { duration: 0.4, delay: 0.2 });
}

function renderResult(container, yourScore, oppScore, result, rivalName, gw) {
  const resultEl = document.getElementById('h2h-result');
  if (!resultEl) return;

  const color = result === 'win' ? 'var(--color-success)' : result === 'loss' ? 'var(--color-danger)' : 'var(--color-warning)';
  const label = result === 'win' ? 'VICTORY' : result === 'loss' ? 'DEFEAT' : 'DRAW';

  resultEl.innerHTML = `
    <div class="h2h-scoreboard" style="border-color:${color}">
      <div class="h2h-scoreboard__label" style="color:${color}">${label} — GW${gw}</div>
      <div class="h2h-scoreboard__scores">
        <div class="h2h-scoreboard__team">
          <div class="h2h-scoreboard__name">You</div>
          <div class="h2h-scoreboard__pts" style="color:${yourScore >= oppScore ? 'var(--gold)' : 'var(--chalk-dim)'}">${yourScore}</div>
        </div>
        <div class="h2h-scoreboard__sep">—</div>
        <div class="h2h-scoreboard__team">
          <div class="h2h-scoreboard__name">${rivalName}</div>
          <div class="h2h-scoreboard__pts" style="color:${oppScore >= yourScore ? 'var(--gold)' : 'var(--chalk-dim)'}">${oppScore}</div>
        </div>
      </div>
    </div>
  `;

  animate('.h2h-scoreboard', { opacity: [0, 1], scale: [0.9, 1] }, { duration: 0.5 });
}

function renderHistory(container) {
  const historyEl = document.getElementById('h2h-history');
  if (!historyEl) return;

  const history = getH2HHistory();
  if (history.length === 0) return;

  historyEl.innerHTML = `
    <div class="section-heading" style="margin-top:var(--space-2xl)">
      <h2 class="section-heading__title">Match <span>History</span></h2>
      <div class="section-heading__line"></div>
    </div>
    <div class="h2h-history">
      ${history.map(m => {
    const color = m.result === 'win' ? 'var(--color-success)' : m.result === 'loss' ? 'var(--color-danger)' : 'var(--color-warning)';
    const typeIcon = m.isFriend ? '👤' : '🤖';
    return `
          <div class="h2h-history__row">
            <div class="h2h-history__result" style="color:${color}">${m.result.toUpperCase()}</div>
            <div class="h2h-history__detail">
              <span>${typeIcon} GW${m.gameweek} vs ${m.rivalName}</span>
            </div>
            <div class="h2h-history__score">${m.yourScore} — ${m.oppScore}</div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}
