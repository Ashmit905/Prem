/**
 * standings.js — Premier League standings page
 */

import { fetchStandings, isApiKeySet } from '../api/football.js';
import { renderStandingsTable } from '../components/standingsTable.js';

export default async function standingsPage(container) {
    container.innerHTML = `
    <div class="page__header">
      <h1 class="page__title">Standings</h1>
      <p class="page__subtitle">Premier League table — 2024/25 season</p>
    </div>
    <div id="standings-container">
      <div class="shimmer shimmer-block" style="height:400px;"></div>
    </div>
  `;

    if (!isApiKeySet()) {
        document.getElementById('standings-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📡</div>
        <div class="empty-state__title">API key required</div>
        <p class="empty-state__text">Add your football-data.org key to <code>.env</code> to view Premier League standings.</p>
      </div>
    `;
        return;
    }

    try {
        const data = await fetchStandings();
        const standingsContainer = document.getElementById('standings-container');
        if (!standingsContainer) return;

        // Find the TOTAL standings (not home/away split)
        const totalStandings = data.standings?.find((s) => s.type === 'TOTAL');

        if (totalStandings && totalStandings.table) {
            renderStandingsTable(standingsContainer, totalStandings.table);
        } else {
            standingsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🏆</div>
          <div class="empty-state__title">No standings data available</div>
          <p class="empty-state__text">The season may not have started yet.</p>
        </div>
      `;
        }
    } catch (err) {
        console.error('Standings error:', err);
        document.getElementById('standings-container').innerHTML = `
      <div class="card" style="border-color:var(--color-danger);">
        <p style="color:var(--color-danger);">Failed to load standings: ${err.message}</p>
      </div>
    `;
    }
}
