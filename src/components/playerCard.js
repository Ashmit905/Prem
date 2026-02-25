/**
 * playerCard.js — Reusable player card component
 */

import { isPlayerDrafted, isPositionFull, getCaptain } from '../state/store.js';

/**
 * Create a player card element
 * @param {object} player - Player data
 * @param {object} options - { showDraft, showRelease, showCaptain, onDraft, onRelease, onCaptain, points }
 */
export function createPlayerCard(player, options = {}) {
    const {
        showDraft = false,
        showRelease = false,
        showCaptain = false,
        onDraft,
        onRelease,
        onCaptain,
        points,
    } = options;

    const card = document.createElement('div');
    card.className = 'player-card';

    const posClass = `player-card__pos--${player.position?.toLowerCase() || 'mid'}`;
    const isDrafted = isPlayerDrafted(player.id);
    const isCaptain = getCaptain() === player.id;
    const posFull = isPositionFull(player.position);

    let actionsHTML = '';

    if (showDraft && !isDrafted) {
        actionsHTML += `
      <button class="btn btn--primary btn--sm draft-btn" 
              ${posFull ? 'disabled title="Position full"' : ''}>
        Draft
      </button>
    `;
    }

    if (showDraft && isDrafted) {
        actionsHTML += `<span class="btn btn--sm" style="color: var(--color-success); cursor: default;">✓ Drafted</span>`;
    }

    if (showRelease) {
        actionsHTML += `
      <button class="btn btn--danger btn--sm release-btn">
        ✕
      </button>
    `;
    }

    if (showCaptain) {
        actionsHTML += `
      <button class="btn btn--captain btn--sm captain-btn ${isCaptain ? 'active' : ''}">
        ${isCaptain ? '©' : 'C'}
      </button>
    `;
    }

    card.innerHTML = `
    <span class="player-card__pos ${posClass}">${player.position || 'MID'}</span>
    ${player.teamCrest ? `<img class="player-card__crest" src="${player.teamCrest}" alt="${player.teamName}" onerror="this.style.display='none'" />` : ''}
    <div class="player-card__info">
      <div class="player-card__name">${player.name}${isCaptain ? ' <span style="color:var(--color-warning);font-size:0.8rem;">©</span>' : ''}</div>
      <div class="player-card__team">${player.teamName || ''}${player.shirtNumber ? ` · #${player.shirtNumber}` : ''}</div>
    </div>
    ${points !== undefined ? `<div class="player-card__points">${points}</div>` : ''}
    <div class="player-card__actions">${actionsHTML}</div>
  `;

    // Event listeners
    const draftBtn = card.querySelector('.draft-btn');
    if (draftBtn && onDraft) {
        draftBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDraft(player);
        });
    }

    const releaseBtn = card.querySelector('.release-btn');
    if (releaseBtn && onRelease) {
        releaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onRelease(player);
        });
    }

    const captainBtn = card.querySelector('.captain-btn');
    if (captainBtn && onCaptain) {
        captainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onCaptain(player);
        });
    }

    return card;
}
