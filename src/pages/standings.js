/**
 * standings.js — Football-themed standings page
 */

import { fetchStandings, isApiKeySet } from '../api/football.js';
import { renderStandingsTable } from '../components/standingsTable.js';
import { animate } from 'motion';

export default async function standingsPage(container) {
  container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">2025/26 Season</div>
      <h1 class="page__title">Premier League<br><span style="color:var(--gold)">Table</span></h1>
      <p class="page__subtitle">Live standings — all 20 clubs</p>
    </div>
    <div id="standings-container">
      <div class="shimmer-block" style="height:60px;margin-bottom:8px;"></div>
      <div class="shimmer-block" style="height:44px;margin-bottom:6px;"></div>
      <div class="shimmer-block" style="height:44px;margin-bottom:6px;"></div>
      <div class="shimmer-block" style="height:44px;margin-bottom:6px;"></div>
      <div class="shimmer-block" style="height:44px;margin-bottom:6px;"></div>
    </div>
  `;

  animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.45, easing: 'ease-out' });

  if (!isApiKeySet()) {
    document.getElementById('standings-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📡</div>
        <div class="empty-state__title">API key required</div>
        <p class="empty-state__text">Add your football-data.org key to <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:3px">.env</code> to view live standings.</p>
      </div>
    `;
    return;
  }

  try {
    const data = await fetchStandings();
    const standingsContainer = document.getElementById('standings-container');
    if (!standingsContainer) return;

    const totalStandings = data.standings?.find((s) => s.type === 'TOTAL');

    if (totalStandings && totalStandings.table) {
      renderStandingsTable(standingsContainer, totalStandings.table);
    } else {
      standingsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🏆</div>
          <div class="empty-state__title">No standings data yet</div>
          <p class="empty-state__text">The season may not have started.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Standings error:', err);
    document.getElementById('standings-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚡</div>
        <div class="empty-state__title">Failed to load standings</div>
        <p class="empty-state__text">${err.message}</p>
      </div>
    `;
  }
}
