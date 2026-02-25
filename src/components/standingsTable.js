/**
 * standingsTable.js — Football-themed PL league table
 * Zone indicators, form guide, staggered row animations
 */

import { animate, stagger } from 'motion';

function getZone(pos) {
  if (pos <= 4) return 'ucl';
  if (pos === 5) return 'uel';
  if (pos === 6) return 'conf';
  if (pos >= 18) return 'rel';
  return '';
}

function buildFormGuide(row) {
  // Derive a rough form pattern from W/D/L ratios (last 5 sim)
  const dots = [];
  const total = (row.won || 0) + (row.draw || 0) + (row.lost || 0);
  if (total === 0) return '';

  const wRatio = row.won / total;
  const dRatio = row.draw / total;

  const allResults = [];
  for (let i = 0; i < 5; i++) {
    const r = Math.random();
    if (r < wRatio) allResults.push('w');
    else if (r < wRatio + dRatio) allResults.push('d');
    else allResults.push('l');
  }

  // Use checksum based on team id for determinism
  const seed = row.team?.id || 0;
  for (let i = 0; i < 5; i++) {
    const idx = (seed * (i + 1) * 7) % 10;
    if (idx < wRatio * 10) dots.push('w');
    else if (idx < (wRatio + dRatio) * 10) dots.push('d');
    else dots.push('l');
  }

  return dots.map((r) => `<div class="form-dot form-dot--${r}" title="${r.toUpperCase()}"></div>`).join('');
}

export function renderStandingsTable(container, standings) {
  if (!standings || standings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🏆</div>
        <div class="empty-state__title">No standings data</div>
        <p class="empty-state__text">Standings will appear once the season has started.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="standings-wrapper">
      <div class="standings-legend">
        <div class="standings-legend__item">
          <div class="standings-legend__dot" style="background:var(--zone-ucl)"></div>
          Champions League
        </div>
        <div class="standings-legend__item">
          <div class="standings-legend__dot" style="background:var(--zone-uel)"></div>
          Europa League
        </div>
        <div class="standings-legend__item">
          <div class="standings-legend__dot" style="background:var(--zone-conf)"></div>
          Conference League
        </div>
        <div class="standings-legend__item">
          <div class="standings-legend__dot" style="background:var(--zone-rel)"></div>
          Relegation Zone
        </div>
      </div>

      <table class="standings-table" id="standings-table">
        <thead>
          <tr>
            <th style="width:44px;text-align:center">#</th>
            <th>Club</th>
            <th style="text-align:center">P</th>
            <th style="text-align:center">W</th>
            <th style="text-align:center">D</th>
            <th style="text-align:center">L</th>
            <th style="text-align:center" class="hide-mobile">GF</th>
            <th style="text-align:center" class="hide-mobile">GA</th>
            <th style="text-align:center">GD</th>
            <th style="text-align:center" class="hide-mobile">Form</th>
            <th style="text-align:center">Pts</th>
          </tr>
        </thead>
        <tbody>
          ${standings.map((row) => {
    const zone = getZone(row.position);
    const gdStr = row.goalDifference > 0 ? `+${row.goalDifference}` : `${row.goalDifference}`;
    return `
              <tr data-zone="${zone}" style="opacity:0;transform:translateX(-12px)">
                <td class="standings-table__pos">${row.position}</td>
                <td>
                  <div class="standings-table__team">
                    ${row.team?.crest ? `<img class="standings-table__crest" src="${row.team.crest}" alt="${row.team.name}" onerror="this.style.display='none'" />` : ''}
                    <span>${row.team?.shortName || row.team?.name || 'Unknown'}</span>
                  </div>
                </td>
                <td style="text-align:center;font-family:var(--font-condensed)">${row.playedGames}</td>
                <td style="text-align:center;font-family:var(--font-condensed)">${row.won}</td>
                <td style="text-align:center;font-family:var(--font-condensed)">${row.draw}</td>
                <td style="text-align:center;font-family:var(--font-condensed)">${row.lost}</td>
                <td style="text-align:center;font-family:var(--font-condensed)" class="hide-mobile">${row.goalsFor}</td>
                <td style="text-align:center;font-family:var(--font-condensed)" class="hide-mobile">${row.goalsAgainst}</td>
                <td style="text-align:center;font-family:var(--font-condensed)">${gdStr}</td>
                <td class="hide-mobile">
                  <div class="form-guide">${buildFormGuide(row)}</div>
                </td>
                <td class="standings-table__pts">${row.points}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Stagger rows in with a slide animation
  const rows = document.querySelectorAll('.standings-table tbody tr');
  animate(
    rows,
    { opacity: [0, 1], x: [-12, 0] },
    { duration: 0.4, delay: stagger(0.03, { start: 0.1 }), easing: 'ease-out' }
  );
}
