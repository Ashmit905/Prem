/**
 * dashboard.js — Football-themed landing page
 * Hero stat blocks + nav cards + fixture strips
 */

import { fetchCompetition, fetchMatches, isApiKeySet, detectCurrentMatchday } from '../api/football.js';
import { getSquad, getTotalPoints, getCaptain } from '../state/store.js';
import { animate, stagger } from 'motion';

export default async function dashboardPage(container) {
  const squad = getSquad();
  const totalPoints = getTotalPoints();
  const captainId = getCaptain();
  const captainPlayer = squad.find((p) => p.id === captainId);

  container.innerHTML = `
    ${!isApiKeySet() ? `
      <div class="api-banner" data-motion>
        <div class="api-banner__icon">⚡</div>
        <div>
          <div class="api-banner__title">Connect Live Data</div>
          <div class="api-banner__text">
            Add your free API key to <code class="api-banner__code">.env</code> as
            <code class="api-banner__code">VITE_API_KEY=your_key</code> — get one free at
            <a href="https://www.football-data.org/client/register" target="_blank">football-data.org</a>
          </div>
        </div>
      </div>
    ` : ''}

    <div class="page__header" data-motion>
      <div class="page__eyebrow">Fantasy Football</div>
      <h1 class="page__title">Your Season<br>At A Glance</h1>
    </div>

    <div class="dash-hero">
      <div class="stat-block" data-motion>
        <div class="stat-block__label">Squad Size</div>
        <div class="stat-block__value">${squad.length}</div>
        <div class="stat-block__context">of 15 players drafted</div>
      </div>
      <div class="stat-block" data-motion>
        <div class="stat-block__label">Total Points</div>
        <div class="stat-block__value">${totalPoints}</div>
        <div class="stat-block__context">season total</div>
      </div>
      <div class="stat-block" data-motion>
        <div class="stat-block__label">Captain</div>
        <div class="stat-block__value" style="font-size:1.6rem; padding-top:0.4rem;">
          ${captainPlayer ? captainPlayer.name.split(' ').pop() : '—'}
        </div>
        <div class="stat-block__context">${captainPlayer ? captainPlayer.teamName || 'Unknown club' : 'No captain set'}</div>
      </div>
      <div class="stat-block" id="gw-stat" data-motion>
        <div class="stat-block__label">Gameweek</div>
        <div class="stat-block__value">—</div>
        <div class="stat-block__context">current matchday</div>
      </div>
    </div>

    <div class="section-heading" data-motion>
      <h2 class="section-heading__title">Quick <span>Access</span></h2>
      <div class="section-heading__line"></div>
    </div>

    <div class="dash-nav-grid">
      <div class="dash-nav-card" data-motion onclick="window.location.hash='/draft'">
        <div class="dash-nav-card__number">01</div>
        <div class="dash-nav-card__icon">📋</div>
        <div class="dash-nav-card__title">Draft Room</div>
        <div class="dash-nav-card__desc">
          Browse 500+ players. Filter by position, search by name, and build your 15-man squad.
        </div>
        <div class="dash-nav-card__arrow">Enter Draft Room →</div>
      </div>

      <div class="dash-nav-card" data-motion onclick="window.location.hash='/gameweek'">
        <div class="dash-nav-card__number">02</div>
        <div class="dash-nav-card__icon">⚽</div>
        <div class="dash-nav-card__title">Gameweek</div>
        <div class="dash-nav-card__desc">
          Track fixtures across every matchday. See how your players score and set your captain for 2× points.
        </div>
        <div class="dash-nav-card__arrow">View Gameweek →</div>
      </div>

      <div class="dash-nav-card" data-motion onclick="window.location.hash='/standings'">
        <div class="dash-nav-card__number">03</div>
        <div class="dash-nav-card__icon">🏆</div>
        <div class="dash-nav-card__title">Standings</div>
        <div class="dash-nav-card__desc">
          Live league table with all 20 clubs. Champions League spots, relegation battles — all of it.
        </div>
        <div class="dash-nav-card__arrow">See Table →</div>
      </div>
    </div>

    <div id="dash-matches">
      <div class="section-heading" data-motion>
        <h2 class="section-heading__title">Current <span>Fixtures</span></h2>
        <div class="section-heading__line"></div>
      </div>
      <div class="shimmer-block"></div>
      <div class="shimmer-block"></div>
    </div>
  `;

  // Staggered entrance animation
  animate(
    '[data-motion]',
    { opacity: [0, 1], y: [20, 0] },
    { duration: 0.5, delay: stagger(0.07), easing: 'ease-out' }
  );

  // Load live data
  if (isApiKeySet()) {
    try {
      const comp = await fetchCompetition();
      const currentMatchday = await detectCurrentMatchday();

      const gwStat = document.getElementById('gw-stat');
      if (gwStat) {
        gwStat.innerHTML = `
          <div class="stat-block__label">Gameweek</div>
          <div class="stat-block__value">${currentMatchday}</div>
          <div class="stat-block__context">current matchday</div>
        `;
        animate(gwStat, { scale: [0.92, 1], opacity: [0, 1] }, { duration: 0.4 });
      }

      const matchData = await fetchMatches(currentMatchday);
      const matchesContainer = document.getElementById('dash-matches');
      if (matchesContainer && matchData.matches) {
        matchesContainer.innerHTML = `
          <div class="section-heading">
            <h2 class="section-heading__title">GW${currentMatchday} <span>Fixtures</span></h2>
            <div class="section-heading__line"></div>
          </div>
          <div class="matches-grid">
            ${matchData.matches.map((m) => renderFixtureCard(m)).join('')}
          </div>
        `;
        animate(
          '#dash-matches .fixture-card, #dash-matches .match-card',
          { opacity: [0, 1], y: [16, 0] },
          { duration: 0.4, delay: stagger(0.05), easing: 'ease-out' }
        );
      }
    } catch (err) {
      console.error('Dashboard API error:', err);
      const matchesContainer = document.getElementById('dash-matches');
      if (matchesContainer) {
        matchesContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">⚡</div>
            <div class="empty-state__title">Connection issue</div>
            <p class="empty-state__text">${err.message}</p>
          </div>
        `;
      }
    }
  } else {
    const matchesContainer = document.getElementById('dash-matches');
    if (matchesContainer) {
      matchesContainer.innerHTML = `
        <div class="section-heading">
          <h2 class="section-heading__title">Current <span>Fixtures</span></h2>
          <div class="section-heading__line"></div>
        </div>
        <div class="empty-state">
          <div class="empty-state__icon">📡</div>
          <div class="empty-state__title">Connect to see live fixtures</div>
          <p class="empty-state__text">Add your API key to load real league data.</p>
        </div>
      `;
    }
  }
}

function renderFixtureCard(m) {
  const isLive = m.status === 'IN_PLAY';
  const isFinished = m.status === 'FINISHED';
  const scoreStr = (isLive || isFinished)
    ? `<span>${m.score?.fullTime?.home ?? '?'}</span><span class="fixture-card__score-sep"> : </span><span>${m.score?.fullTime?.away ?? '?'}</span>`
    : `<span style="font-size:1.2rem;color:var(--chalk-muted)">vs</span>`;
  const statusStr = isLive ? 'LIVE' : isFinished ? 'FT' : formatDate(m.utcDate);
  return `
    <div class="fixture-card">
      <div class="fixture-card__header">
        <span class="fixture-card__competition">Football</span>
        <span class="fixture-card__status ${isLive ? 'fixture-card__status--live' : ''}">
          ${statusStr}
        </span>
      </div>
      <div class="fixture-card__body">
        <div class="fixture-card__team fixture-card__team--home">
          ${m.homeTeam?.crest ? `<img class="fixture-card__crest" src="${m.homeTeam.crest}" alt="" onerror="this.style.display='none'" />` : ''}
          <div class="fixture-card__team-name">${m.homeTeam?.shortName || m.homeTeam?.name || '?'}</div>
        </div>
        <div class="fixture-card__score">
          <div class="fixture-card__score-value">${scoreStr}</div>
          <div class="fixture-card__score-label">
            ${isLive ? '● Live' : isFinished ? 'Full Time' : 'Upcoming'}
          </div>
        </div>
        <div class="fixture-card__team fixture-card__team--away">
          ${m.awayTeam?.crest ? `<img class="fixture-card__crest" src="${m.awayTeam.crest}" alt="" onerror="this.style.display='none'" />` : ''}
          <div class="fixture-card__team-name">${m.awayTeam?.shortName || m.awayTeam?.name || '?'}</div>
        </div>
      </div>
    </div>
  `;
}

function formatDate(utcDate) {
  if (!utcDate) return '';
  const d = new Date(utcDate);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
