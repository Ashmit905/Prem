/**
 * dashboard.js — Landing page / Dashboard
 */

import { fetchCompetition, fetchMatches, isApiKeySet } from '../api/football.js';
import { getSquad, getTotalPoints, getCaptain } from '../state/store.js';

export default async function dashboardPage(container) {
    const squad = getSquad();
    const totalPoints = getTotalPoints();
    const captainId = getCaptain();
    const captainPlayer = squad.find((p) => p.id === captainId);

    // Initial render with loading state
    container.innerHTML = `
    <div class="page__header">
      <h1 class="page__title">Dashboard</h1>
      <p class="page__subtitle">Your Premier League fantasy overview</p>
    </div>

    ${!isApiKeySet()
            ? `
      <div class="card" style="margin-bottom: var(--space-xl); border-color: var(--color-warning); background: rgba(245, 158, 11, 0.05);">
        <h3 style="color: var(--color-warning); margin-bottom: var(--space-sm);">⚠️ API Key Not Set</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: var(--space-sm);">
          To load real Premier League data, add your free API key to <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">.env</code>:
        </p>
        <code style="background:var(--bg-secondary);padding:var(--space-sm) var(--space-md);border-radius:6px;display:block;font-size:0.85rem;">
          VITE_API_KEY=your_key_here
        </code>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: var(--space-sm);">
          Get a free key at <a href="https://www.football-data.org/client/register" target="_blank">football-data.org</a> (10 req/min)
        </p>
      </div>
    `
            : ''
        }

    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-card__value">${squad.length}</div>
        <div class="stat-card__label">Players Drafted</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__value">${totalPoints}</div>
        <div class="stat-card__label">Total Points</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__value">${captainPlayer ? captainPlayer.name.split(' ').pop() : '—'}</div>
        <div class="stat-card__label">Captain</div>
      </div>
      <div class="card stat-card" id="gw-stat">
        <div class="stat-card__value">—</div>
        <div class="stat-card__label">Current Gameweek</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card dash-card" onclick="window.location.hash='/draft'">
        <div class="dash-card__icon">📋</div>
        <div class="dash-card__title">Draft Room</div>
        <div class="dash-card__desc">Browse and draft Premier League players to build your squad. Filter by position and search by name.</div>
      </div>
      <div class="card dash-card" onclick="window.location.hash='/gameweek'">
        <div class="dash-card__icon">⚽</div>
        <div class="dash-card__title">Gameweek</div>
        <div class="dash-card__desc">View matchday fixtures, track your players' scores, and set your captain for double points.</div>
      </div>
      <div class="card dash-card" onclick="window.location.hash='/standings'">
        <div class="dash-card__icon">🏆</div>
        <div class="dash-card__title">Standings</div>
        <div class="dash-card__desc">Live Premier League table with all 20 teams. See who's fighting for the title and who's in the drop zone.</div>
      </div>
    </div>

    <div id="dash-matches" style="margin-top: var(--space-xl);">
      <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:var(--space-md);">Current Fixtures</h2>
      <div class="shimmer shimmer-block"></div>
    </div>
  `;

    // Load competition info + current fixtures
    if (isApiKeySet()) {
        try {
            const comp = await fetchCompetition();
            const currentMatchday = comp.currentSeason?.currentMatchday || 1;

            // Update GW stat
            const gwStat = document.getElementById('gw-stat');
            if (gwStat) {
                gwStat.innerHTML = `
          <div class="stat-card__value">${currentMatchday}</div>
          <div class="stat-card__label">Current Gameweek</div>
        `;
            }

            // Load matches
            const matchData = await fetchMatches(currentMatchday);
            const matchesContainer = document.getElementById('dash-matches');
            if (matchesContainer && matchData.matches) {
                matchesContainer.innerHTML = `
          <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:var(--space-md);">Gameweek ${currentMatchday} Fixtures</h2>
          <div class="matches-grid">
            ${matchData.matches
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
                    ${m.status === 'IN_PLAY' ? '● LIVE' : m.status === 'FINISHED' ? 'FT' : formatDate(m.utcDate)}
                  </div>
                </div>
                <div class="match-card__team">
                  ${m.awayTeam?.crest ? `<img class="match-card__crest" src="${m.awayTeam.crest}" alt="${m.awayTeam.shortName}" onerror="this.style.display='none'" />` : ''}
                  <div class="match-card__team-name">${m.awayTeam?.shortName || m.awayTeam?.name || '?'}</div>
                </div>
              </div>
            `
                        )
                        .join('')}
          </div>
        `;
            }
        } catch (err) {
            console.error('Dashboard API error:', err);
            const matchesContainer = document.getElementById('dash-matches');
            if (matchesContainer) {
                matchesContainer.innerHTML = `
          <div class="card" style="border-color: var(--color-danger);">
            <p style="color:var(--color-danger)">Failed to load data: ${err.message}</p>
          </div>
        `;
            }
        }
    } else {
        const matchesContainer = document.getElementById('dash-matches');
        if (matchesContainer) {
            matchesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📡</div>
          <div class="empty-state__title">Connect to see live fixtures</div>
          <p class="empty-state__text">Add your API key to load real Premier League data.</p>
        </div>
      `;
        }
    }
}

function formatDate(utcDate) {
    if (!utcDate) return '';
    const d = new Date(utcDate);
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
