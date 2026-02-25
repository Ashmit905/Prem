/**
 * squadPanel.js — Sidebar showing the user's drafted squad
 */

import { getSquad, getPositionCounts, getCaptain, POSITION_LIMITS, MAX_SQUAD_SIZE } from '../state/store.js';

/**
 * Render the squad panel
 * @param {HTMLElement} container
 * @param {object} options - { onRelease, onCaptain }
 */
export function renderSquadPanel(container, options = {}) {
    const squad = getSquad();
    const counts = getPositionCounts();
    const captainId = getCaptain();

    const positions = ['GK', 'DEF', 'MID', 'FWD'];

    container.innerHTML = `
    <div class="card squad-panel">
      <div class="squad-panel__header">
        <h3 class="squad-panel__title">Your Squad</h3>
        <span class="squad-panel__count">${squad.length}/${MAX_SQUAD_SIZE}</span>
      </div>
      ${positions
            .map((pos) => {
                const posPlayers = squad.filter((p) => p.position === pos);
                const limit = POSITION_LIMITS[pos];
                return `
            <div class="squad-panel__section">
              <div class="squad-panel__section-title">${pos} (${posPlayers.length}/${limit})</div>
              ${posPlayers.length === 0
                        ? `<div class="squad-panel__empty">No ${pos} drafted</div>`
                        : posPlayers
                            .map(
                                (p) => `
                  <div class="squad-player" data-id="${p.id}">
                    ${p.teamCrest ? `<img src="${p.teamCrest}" alt="" width="20" height="20" style="object-fit:contain" onerror="this.style.display='none'" />` : ''}
                    <span class="squad-player__name">${p.name}</span>
                    ${captainId === p.id ? '<span class="squad-player__captain">©</span>' : ''}
                    ${options.onCaptain
                                        ? `<button class="btn btn--captain btn--sm captain-btn ${captainId === p.id ? 'active' : ''}" data-player-id="${p.id}" style="padding:2px 6px;font-size:0.7rem;">${captainId === p.id ? '©' : 'C'}</button>`
                                        : ''
                                    }
                    ${options.onRelease
                                        ? `<button class="btn btn--danger btn--sm release-btn" data-player-id="${p.id}" style="padding:2px 6px;font-size:0.7rem;">✕</button>`
                                        : ''
                                    }
                  </div>
                `
                            )
                            .join('')
                    }
            </div>
          `;
            })
            .join('')}
    </div>
  `;

    // Event listeners
    if (options.onRelease) {
        container.querySelectorAll('.release-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.playerId);
                options.onRelease(id);
            });
        });
    }

    if (options.onCaptain) {
        container.querySelectorAll('.captain-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.playerId);
                options.onCaptain(id);
            });
        });
    }
}
