/**
 * playerCard.js — Football-themed player card
 * Position badge, jersey-style layout, Motion One hover
 */

import { isPlayerDrafted, isPositionFull, getCaptain } from '../state/store.js';
import { animate } from 'motion';

const POS_COLORS = {
  GK: { bg: 'rgba(245,197,24,0.15)', color: '#f5c518' },
  DEF: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  MID: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  FWD: { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
};

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

  const pos = player.position || 'MID';
  const posStyle = POS_COLORS[pos] || POS_COLORS.MID;
  const isDrafted = isPlayerDrafted(player.id);
  const isCaptain = getCaptain() === player.id;
  const posFull = isPositionFull(player.position);

  let actionsHTML = '';

  if (showDraft && !isDrafted) {
    actionsHTML += `
      <button class="btn btn--primary btn--sm draft-btn" ${posFull ? 'disabled title="Position full"' : ''}>
        + Draft
      </button>
    `;
  }

  if (showDraft && isDrafted) {
    actionsHTML += `<span style="font-family:var(--font-condensed);font-size:0.72rem;font-weight:700;color:var(--color-success);letter-spacing:0.06em;">✓ ADDED</span>`;
  }

  if (showRelease) {
    actionsHTML += `
      <button class="btn btn--danger btn--sm release-btn" title="Release player">✕</button>
    `;
  }

  if (showCaptain) {
    actionsHTML += `
      <button class="btn btn--captain btn--sm captain-btn ${isCaptain ? 'active' : ''}" title="Set as captain">
        ${isCaptain ? '© CAP' : 'C'}
      </button>
    `;
  }

  card.innerHTML = `
    <div class="player-card__pos-badge" style="background:${posStyle.bg};color:${posStyle.color}">
      ${pos}
    </div>
    ${player.teamCrest ? `<img class="player-card__crest" src="${player.teamCrest}" alt="${player.teamName}" onerror="this.style.display='none'" />` : ''}
    <div class="player-card__info">
      <div class="player-card__name">
        ${player.name}${isCaptain ? ' <span style="color:var(--gold);font-size:0.75rem;font-family:var(--font-condensed);font-weight:900;">© C</span>' : ''}
      </div>
      <div class="player-card__team">
        ${player.teamName || ''}${player.shirtNumber ? ` · #${player.shirtNumber}` : ''}
      </div>
    </div>
    ${points !== undefined ? `<div class="player-card__points">${points}</div>` : ''}
    <div class="player-card__actions">${actionsHTML}</div>
  `;

  // Subtle hover animation
  card.addEventListener('mouseenter', () => {
    animate(card, { x: [null, 3] }, { duration: 0.15 });
  });
  card.addEventListener('mouseleave', () => {
    animate(card, { x: [null, 0] }, { duration: 0.15 });
  });

  // Event listeners
  const draftBtn = card.querySelector('.draft-btn');
  if (draftBtn && onDraft) {
    draftBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      animate(draftBtn, { scale: [1, 0.9, 1] }, { duration: 0.2 });
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
      animate(captainBtn, { scale: [1, 1.15, 1] }, { duration: 0.25, easing: [0.34, 1.56, 0.64, 1] });
      onCaptain(player);
    });
  }

  return card;
}
