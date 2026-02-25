/**
 * social.js — Social & Gamified Interface page
 * Achievements, trash talk, predictions, season journal
 */

import { fetchMatches, fetchCompetition, fetchTeams, isApiKeySet } from '../api/football.js';
import { getSquad, getCaptain, getTotalPoints, getGameweekScores } from '../state/store.js';
import { getH2HRecord } from '../state/h2h.js';
import {
  ACHIEVEMENT_DEFS, getAchievements, checkAndUnlockAchievements, unlockAchievement,
  generateTrashTalk, getPredictions, savePrediction, getPredictionStats,
  getJournal, addJournalEntry,
} from '../state/social.js';
import { showToast } from '../main.js';
import { animate, stagger } from 'motion';

let activeTab = 'achievements';

export default async function socialPage(container) {
  // Auto-check achievements on page load
  checkAndUnlockAchievements({
    squad: getSquad(),
    captainId: getCaptain(),
    totalPoints: getTotalPoints(),
    h2hRecord: getH2HRecord(),
  });

  container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">Community</div>
      <h1 class="page__title">Social <span style="color:var(--gold)">Hub</span></h1>
      <p class="page__subtitle">Achievements, banter, and bragging rights</p>
    </div>

    <div class="social-tabs" style="opacity:0">
      <button class="social-tab social-tab--active" data-tab="achievements">🏆 Achievements</button>
      <button class="social-tab" data-tab="trashtalk">🗣️ Banter</button>
      <button class="social-tab" data-tab="predictions">🔮 Predictions</button>
      <button class="social-tab" data-tab="journal">📖 Journal</button>
    </div>

    <div id="social-content"></div>
  `;

  animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });
  animate('.social-tabs', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.1 });

  // Tab switching
  container.querySelectorAll('.social-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.social-tab').forEach(t => t.classList.remove('social-tab--active'));
      tab.classList.add('social-tab--active');
      activeTab = tab.dataset.tab;
      renderTab(container);
    });
  });

  renderTab(container);
}

function renderTab(container) {
  const contentEl = document.getElementById('social-content');
  if (!contentEl) return;

  switch (activeTab) {
    case 'achievements': renderAchievements(contentEl); break;
    case 'trashtalk': renderTrashTalk(contentEl); break;
    case 'predictions': renderPredictions(contentEl, container); break;
    case 'journal': renderJournal(contentEl); break;
  }
}

// ---- Achievements ----

function renderAchievements(el) {
  const unlocked = getAchievements();
  const total = ACHIEVEMENT_DEFS.length;
  const count = Object.keys(unlocked).length;
  const categories = ['draft', 'scoring', 'h2h', 'social'];

  let html = `
    <div class="achievements-header">
      <div class="achievements-progress">
        <div class="achievements-progress__bar" style="width:${(count / total) * 100}%"></div>
      </div>
      <div class="achievements-progress__text">${count}/${total} unlocked</div>
    </div>
  `;

  for (const cat of categories) {
    const catAchs = ACHIEVEMENT_DEFS.filter(a => a.category === cat);
    const catName = { draft: 'Draft', scoring: 'Scoring', h2h: 'Arena', social: 'Social' }[cat];

    html += `<div class="section-heading"><h2 class="section-heading__title">${catName} <span>Badges</span></h2><div class="section-heading__line"></div></div>`;
    html += `<div class="achievement-grid">`;

    for (const ach of catAchs) {
      const isUnlocked = !!unlocked[ach.id];
      html += `
        <div class="achievement-card ${isUnlocked ? 'achievement-card--unlocked' : ''}">
          <div class="achievement-card__icon">${ach.icon}</div>
          <div class="achievement-card__info">
            <div class="achievement-card__name">${ach.name}</div>
            <div class="achievement-card__desc">${ach.desc}</div>
          </div>
          ${isUnlocked ? '<div class="achievement-card__check">✓</div>' : ''}
        </div>
      `;
    }

    html += `</div>`;
  }

  el.innerHTML = html;
  animate('.achievement-card', { opacity: [0, 1], y: [10, 0] }, { duration: 0.3, delay: stagger(0.04) });
}

// ---- Trash Talk ----

function renderTrashTalk(el) {
  el.innerHTML = `
    <div class="banter-section">
      <div class="section-heading">
        <h2 class="section-heading__title">Trash <span>Talk</span></h2>
        <div class="section-heading__line"></div>
      </div>
      <p style="color:var(--chalk-dim);font-size:0.88rem;margin-bottom:var(--space-lg)">
        Generate banter to taunt rival fans. Pick a team and let it fly.
      </p>
      <div class="banter-input-row">
        <input type="text" class="filters__search" id="banter-team" placeholder="Type a team name..." style="flex:1" />
        <button class="btn btn--primary" id="gen-banter">Generate 🗣️</button>
      </div>
      <div id="banter-output" class="banter-output"></div>
    </div>
  `;

  document.getElementById('gen-banter')?.addEventListener('click', () => {
    const team = document.getElementById('banter-team')?.value || 'Arsenal';
    if (!team.trim()) return;

    const outputEl = document.getElementById('banter-output');
    if (!outputEl) return;

    const msg = generateTrashTalk(team.trim());

    const card = document.createElement('div');
    card.className = 'banter-card';
    card.innerHTML = `
      <div class="banter-card__msg">"${msg}"</div>
      <div class="banter-card__target">to ${team.trim()} fans</div>
    `;
    outputEl.prepend(card);
    animate(card, { opacity: [0, 1], x: [-20, 0] }, { duration: 0.3 });

    // Unlock achievement
    if (unlockAchievement('trash_talk')) {
      showToast('Achievement unlocked: Banter King! 🗣️', 'success');
    }
  });
}

// ---- Predictions ----

function renderPredictions(el, container) {
  const stats = getPredictionStats();
  const predictions = getPredictions().slice(0, 10);

  el.innerHTML = `
    <div class="section-heading">
      <h2 class="section-heading__title">Match <span>Predictions</span></h2>
      <div class="section-heading__line"></div>
    </div>

    <div class="prediction-stats">
      <div class="stat-block" style="flex:1">
        <div class="stat-block__label">Accuracy</div>
        <div class="stat-block__value">${stats.accuracy}%</div>
        <div class="stat-block__context">${stats.correct}/${stats.total} correct</div>
      </div>
    </div>

    <div class="prediction-form" style="margin:var(--space-xl) 0">
      <p style="color:var(--chalk-dim);font-size:0.88rem;margin-bottom:var(--space-md)">
        Predict the next match result. Enter team names and your predicted score.
      </p>
      <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;align-items:center">
        <input type="text" class="filters__search" id="pred-home" placeholder="Home team" style="flex:1;min-width:120px" />
        <input type="number" class="filters__search" id="pred-home-score" placeholder="0" style="width:50px;text-align:center" min="0" />
        <span style="color:var(--chalk-muted);font-weight:700">vs</span>
        <input type="number" class="filters__search" id="pred-away-score" placeholder="0" style="width:50px;text-align:center" min="0" />
        <input type="text" class="filters__search" id="pred-away" placeholder="Away team" style="flex:1;min-width:120px" />
        <button class="btn btn--primary" id="save-pred">Save</button>
      </div>
    </div>

    ${predictions.length > 0 ? `
      <div class="prediction-list">
        ${predictions.map(p => `
          <div class="prediction-row">
            <div>${p.homeTeam || '?'} ${p.homeScore ?? '?'} - ${p.awayScore ?? '?'} ${p.awayTeam || '?'}</div>
            <div style="font-size:0.72rem;color:var(--chalk-muted)">${new Date(p.createdAt).toLocaleDateString()}</div>
          </div>
        `).join('')}
      </div>
    ` : '<p style="color:var(--chalk-muted);text-align:center;padding:var(--space-xl)">No predictions yet. Make your first call above!</p>'}
  `;

  document.getElementById('save-pred')?.addEventListener('click', () => {
    const home = document.getElementById('pred-home')?.value;
    const away = document.getElementById('pred-away')?.value;
    const hs = parseInt(document.getElementById('pred-home-score')?.value) || 0;
    const as = parseInt(document.getElementById('pred-away-score')?.value) || 0;

    if (!home || !away) {
      showToast('Enter both team names', 'error');
      return;
    }

    savePrediction({ homeTeam: home, awayTeam: away, homeScore: hs, awayScore: as });
    showToast('Prediction saved!', 'success');
    renderPredictions(el, container);
  });
}

// ---- Journal ----

function renderJournal(el) {
  const journal = getJournal();

  if (journal.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📖</div>
        <div class="empty-state__title">Your season story starts here</div>
        <p class="empty-state__text">As you play — draft, score, compete — key moments will be recorded in your journal automatically.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="section-heading">
      <h2 class="section-heading__title">Season <span>Journal</span></h2>
      <div class="section-heading__line"></div>
    </div>
    <div class="journal-timeline">
      ${journal.map(entry => `
        <div class="journal-entry">
          <div class="journal-entry__dot"></div>
          <div class="journal-entry__content">
            <div class="journal-entry__title">${entry.title}</div>
            <div class="journal-entry__text">${entry.text}</div>
            <div class="journal-entry__time">${new Date(entry.timestamp).toLocaleDateString()}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  animate('.journal-entry', { opacity: [0, 1], x: [-10, 0] }, { duration: 0.3, delay: stagger(0.06) });
}
