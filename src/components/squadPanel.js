/**
 * squadPanel.js — Football-themed squad sidebar
 * Match programme aesthetic with position sections
 */

import { getSquad, getPositionCounts, getCaptain, POSITION_LIMITS, MAX_SQUAD_SIZE } from '../state/store.js';
import { animate, stagger } from 'motion';

const POS_COLORS = {
  GK: '#f5c518',
  DEF: '#60a5fa',
  MID: '#4ade80',
  FWD: '#f87171',
};

export function renderSquadPanel(container, options = {}) {
  const squad = getSquad();
  const captainId = getCaptain();
  const positions = ['GK', 'DEF', 'MID', 'FWD'];
  const filledCount = squad.length;
  const pctFull = Math.round((filledCount / MAX_SQUAD_SIZE) * 100);

  container.innerHTML = `
    <div class="card squad-panel" style="border-top:3px solid var(--gold);">
      <div class="squad-panel__header">
        <h3 class="squad-panel__title">Your Squad</h3>
        <span class="squad-panel__count">${filledCount}/${MAX_SQUAD_SIZE}</span>
      </div>

      <!-- Progress bar -->
      <div style="height:3px;background:var(--border-color);border-radius:2px;margin-bottom:var(--space-lg);overflow:hidden;">
        <div id="squad-progress-bar" style="height:100%;width:0%;background:var(--gold);border-radius:2px;transition:width 0.6s ease;"></div>
      </div>

      ${positions.map((pos) => {
    const posPlayers = squad.filter((p) => p.position === pos);
    const limit = POSITION_LIMITS[pos];
    const color = POS_COLORS[pos] || 'var(--chalk-dim)';

    return `
          <div class="squad-panel__section">
            <div class="squad-panel__section-title" style="color:${color}">
              ${pos} (${posPlayers.length}/${limit})
            </div>
            ${posPlayers.length === 0
        ? `<div class="squad-panel__empty">No ${pos} drafted yet</div>`
        : posPlayers.map((p) => `
                <div class="squad-player" data-id="${p.id}">
                  ${p.teamCrest
            ? `<img src="${p.teamCrest}" alt="" width="18" height="18" style="object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'" />`
            : `<div style="width:18px;height:18px;border-radius:50%;background:${color};opacity:0.3;flex-shrink:0;"></div>`
          }
                  <span class="squad-player__name">${p.name}</span>
                  ${captainId === p.id ? '<span class="squad-player__captain">© C</span>' : ''}
                  ${options.onCaptain
            ? `<button class="btn btn--captain btn--sm captain-btn ${captainId === p.id ? 'active' : ''}" data-player-id="${p.id}" style="padding:3px 7px;font-size:0.68rem;margin-left:auto;">${captainId === p.id ? '©' : 'C'}</button>`
            : ''
          }
                  ${options.onRelease
            ? `<button class="btn btn--danger btn--sm release-btn" data-player-id="${p.id}" style="padding:3px 7px;font-size:0.68rem;">✕</button>`
            : ''
          }
                </div>
              `).join('')
      }
          </div>
        `;
  }).join('')}

      ${filledCount === MAX_SQUAD_SIZE ? `
        <div style="text-align:center;margin-top:var(--space-md);padding:var(--space-sm);background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:var(--radius-sm);">
          <span style="font-family:var(--font-condensed);font-size:0.78rem;font-weight:700;letter-spacing:0.1em;color:var(--color-success);">✓ SQUAD COMPLETE</span>
        </div>
      ` : ''}
    </div>
  `;

  // Animate progress bar fill
  requestAnimationFrame(() => {
    const bar = document.getElementById('squad-progress-bar');
    if (bar) bar.style.width = `${pctFull}%`;
  });

  // Stagger squad player rows
  const playerRows = container.querySelectorAll('.squad-player');
  if (playerRows.length) {
    animate(
      playerRows,
      { opacity: [0, 1], x: [8, 0] },
      { duration: 0.3, delay: stagger(0.04), easing: 'ease-out' }
    );
  }

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
