/**
 * draft.js — Football-themed Draft Room page
 * Player browser with position filters + squad sidebar
 */

import { fetchAllPlayers, isApiKeySet } from '../api/football.js';
import { draftPlayer, releasePlayer, getSquad, isPlayerDrafted } from '../state/store.js';
import { createPlayerCard } from '../components/playerCard.js';
import { renderSquadPanel } from '../components/squadPanel.js';
import { showToast } from '../main.js';
import { animate, stagger } from 'motion';

let allPlayers = [];
let currentFilter = 'ALL';
let searchQuery = '';

export default async function draftPage(container) {
  container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">Squad Management</div>
      <h1 class="page__title">Draft <span style="color:var(--gold)">Room</span></h1>
      <p class="page__subtitle">Build your 15-man squad — 2 GK · 5 DEF · 5 MID · 3 FWD</p>
    </div>

    <div class="draft-layout">
      <div>
        <div class="filters" style="opacity:0" id="draft-filters">
          <div class="filters__group">
            <button class="filters__btn filters__btn--active" data-pos="ALL">All</button>
            <button class="filters__btn" data-pos="GK">GK</button>
            <button class="filters__btn" data-pos="DEF">DEF</button>
            <button class="filters__btn" data-pos="MID">MID</button>
            <button class="filters__btn" data-pos="FWD">FWD</button>
          </div>
          <input
            type="text"
            class="filters__search"
            placeholder="Search by name or club..."
            id="player-search"
            autocomplete="off"
          />
        </div>

        <div id="player-list" class="player-list">
          ${isApiKeySet()
      ? Array(6).fill('<div class="shimmer-card"></div>').join('')
      : ''
    }
        </div>
        <div id="player-count" style="text-align:center;color:var(--chalk-muted);font-family:var(--font-condensed);font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;margin-top:var(--space-md);"></div>
      </div>

      <div id="squad-sidebar"></div>
    </div>
  `;

  // Animate header + filters in
  animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });
  animate('#draft-filters', { opacity: [0, 1], y: [10, 0] }, { duration: 0.4, delay: 0.1 });

  // Set up position filters
  container.querySelectorAll('.filters__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filters__btn').forEach((b) => b.classList.remove('filters__btn--active'));
      btn.classList.add('filters__btn--active');
      currentFilter = btn.dataset.pos;
      renderPlayers(true);
    });
  });

  // Search
  const searchInput = document.getElementById('player-search');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderPlayers(false);
  });

  // Load players
  if (isApiKeySet()) {
    try {
      allPlayers = await fetchAllPlayers();
      renderPlayers(true);
    } catch (err) {
      document.getElementById('player-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚡</div>
          <div class="empty-state__title">Failed to load players</div>
          <p class="empty-state__text">${err.message}</p>
        </div>
      `;
    }
  } else {
    document.getElementById('player-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📡</div>
        <div class="empty-state__title">API key required</div>
        <p class="empty-state__text">Add your football-data.org key to <code style="background:var(--bg-secondary);padding:2px 5px;border-radius:3px;">.env</code> to load players.</p>
      </div>
    `;
  }

  refreshSquadPanel();

  function renderPlayers(animate_in = true) {
    const listEl = document.getElementById('player-list');
    const countEl = document.getElementById('player-count');
    if (!listEl) return;

    let filtered = allPlayers;

    if (currentFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.position === currentFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery) ||
          p.teamName.toLowerCase().includes(searchQuery)
      );
    }

    filtered.sort((a, b) => {
      const aDrafted = isPlayerDrafted(a.id) ? 1 : 0;
      const bDrafted = isPlayerDrafted(b.id) ? 1 : 0;
      if (aDrafted !== bDrafted) return aDrafted - bDrafted;
      return a.name.localeCompare(b.name);
    });

    listEl.innerHTML = '';

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <div class="empty-state__title">No players found</div>
          <p class="empty-state__text">Try adjusting your filters or search.</p>
        </div>
      `;
      if (countEl) countEl.textContent = '';
      return;
    }

    const displayed = filtered.slice(0, 100);
    const cards = [];
    for (const player of displayed) {
      const card = createPlayerCard(player, {
        showDraft: true,
        onDraft: (p) => handleDraft(p),
      });
      listEl.appendChild(card);
      cards.push(card);
    }

    if (animate_in && cards.length) {
      animate(
        cards,
        { opacity: [0, 1], y: [10, 0] },
        { duration: 0.3, delay: stagger(0.025, { start: 0 }), easing: 'ease-out' }
      );
    }

    if (countEl) {
      countEl.textContent = `Showing ${displayed.length} of ${filtered.length} players`;
    }
  }

  function handleDraft(player) {
    const result = draftPlayer(player);
    if (result.success) {
      showToast(`${player.name} drafted!`, 'success');
      renderPlayers(false);
      refreshSquadPanel();
    } else {
      showToast(result.error || 'Draft failed', 'error');
    }
  }

  function handleRelease(playerId) {
    const player = getSquad().find((p) => p.id === playerId);
    releasePlayer(playerId);
    showToast(`${player?.name || 'Player'} released`, 'info');
    renderPlayers(false);
    refreshSquadPanel();
  }

  function refreshSquadPanel() {
    const sidebar = document.getElementById('squad-sidebar');
    if (sidebar) {
      renderSquadPanel(sidebar, { onRelease: handleRelease });
    }
  }
}
