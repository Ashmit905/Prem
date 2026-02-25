/**
 * standingsTable.js — PL league table component
 */

/**
 * Render a standings table
 * @param {HTMLElement} container
 * @param {Array} standings - Array of team standings
 */
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
    <div class="card card--no-hover" style="padding: 0; overflow: hidden;">
      <table class="standings-table">
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Team</th>
            <th style="text-align:center">P</th>
            <th style="text-align:center">W</th>
            <th style="text-align:center">D</th>
            <th style="text-align:center">L</th>
            <th style="text-align:center" class="hide-mobile">GF</th>
            <th style="text-align:center" class="hide-mobile">GA</th>
            <th style="text-align:center">GD</th>
            <th style="text-align:center">Pts</th>
          </tr>
        </thead>
        <tbody>
          ${standings
            .map(
                (row) => `
            <tr>
              <td class="standings-table__pos">${row.position}</td>
              <td>
                <div class="standings-table__team">
                  ${row.team?.crest ? `<img class="standings-table__crest" src="${row.team.crest}" alt="${row.team.name}" onerror="this.style.display='none'" />` : ''}
                  <span>${row.team?.shortName || row.team?.name || 'Unknown'}</span>
                </div>
              </td>
              <td style="text-align:center">${row.playedGames}</td>
              <td style="text-align:center">${row.won}</td>
              <td style="text-align:center">${row.draw}</td>
              <td style="text-align:center">${row.lost}</td>
              <td style="text-align:center" class="hide-mobile">${row.goalsFor}</td>
              <td style="text-align:center" class="hide-mobile">${row.goalsAgainst}</td>
              <td style="text-align:center">${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}</td>
              <td style="text-align:center" class="standings-table__pts">${row.points}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}
