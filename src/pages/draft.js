/**
 * draft.js — Draft Room page
 * Browse PL players, filter by position, search by name, draft to your squad
 */

import { fetchAllPlayers, isApiKeySet } from '../api/football.js';
import { draftPlayer, releasePlayer, getSquad, isPlayerDrafted } from '../state/store.js';
import { createPlayerCard } from '../components/playerCard.js';
import { renderSquadPanel } from '../components/squadPanel.js';
import { showToast } from '../main.js';

let allPlayers = [];
let currentFilter = 'ALL';
let searchQuery = '';

export default async function draftPage(container) {
    container.innerHTML = `
    <div class="page__header">
      <h1 class="page__title">Draft Room</h1>
      <p class="page__subtitle">Build your squad — 2 GK, 5 DEF, 5 MID, 3 FWD (15 total)</p>
    </div>

    <div class="draft-layout">
      <div>
        <div class="filters">
          <div class="filters__group">
            <button class="filters__btn filters__btn--active" data-pos="ALL">All</button>
            <button class="filters__btn" data-pos="GK">GK</button>
            <button class="filters__btn" data-pos="DEF">DEF</button>
            <button class="filters__btn" data-pos="MID">MID</button>
            <button class="filters__btn" data-pos="FWD">FWD</button>
          </div>
          <input type="text" class="filters__search" placeholder="Search players..." id="player-search" />
        </div>
        <div id="player-list" class="player-list">
          ${isApiKeySet() ? '<div class="shimmer shimmer-card"></div><div class="shimmer shimmer-card"></div><div class="shimmer shimmer-card"></div><div class="shimmer shimmer-card"></div><div class="shimmer shimmer-card"></div>' : ''}
        </div>
        <div id="player-count" style="text-align:center;color:var(--text-muted);font-size:0.8rem;margin-top:var(--space-md);"></div>
      </div>
      <div id="squad-sidebar"></div>
    </div>
  `;

    // Set up filters
    container.querySelectorAll('.filters__btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.filters__btn').forEach((b) => b.classList.remove('filters__btn--active'));
            btn.classList.add('filters__btn--active');
            currentFilter = btn.dataset.pos;
            renderPlayers();
        });
    });

    // Search
    const searchInput = document.getElementById('player-search');
    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderPlayers();
    });

    // Load players
    if (isApiKeySet()) {
        try {
            allPlayers = await fetchAllPlayers();
            renderPlayers();
        } catch (err) {
            document.getElementById('player-list').innerHTML = `
        <div class="card" style="border-color:var(--color-danger);">
          <p style="color:var(--color-danger);">Failed to load players: ${err.message}</p>
        </div>
      `;
        }
    } else {
        document.getElementById('player-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📡</div>
        <div class="empty-state__title">API key required</div>
        <p class="empty-state__text">Add your football-data.org key to <code>.env</code> to load Premier League players.</p>
      </div>
    `;
    }

    // Render squad sidebar
    refreshSquadPanel();

    function renderPlayers() {
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

        // Sort: undrafted first, then alphabetical
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
          <p class="empty-state__text">Try adjusting your filters or search query.</p>
        </div>
      `;
            if (countEl) countEl.textContent = '';
            return;
        }

        // Show first 100 for performance
        const displayed = filtered.slice(0, 100);
        for (const player of displayed) {
            const card = createPlayerCard(player, {
                showDraft: true,
                onDraft: (p) => handleDraft(p),
            });
            listEl.appendChild(card);
        }

        if (countEl) {
            countEl.textContent = `Showing ${displayed.length} of ${filtered.length} players`;
        }
    }

    function handleDraft(player) {
        const result = draftPlayer(player);
        if (result.success) {
            showToast(`${player.name} drafted! ⚡`, 'success');
            renderPlayers();
            refreshSquadPanel();
        } else {
            showToast(result.error || 'Draft failed', 'error');
        }
    }

    function handleRelease(playerId) {
        const player = getSquad().find((p) => p.id === playerId);
        releasePlayer(playerId);
        showToast(`${player?.name || 'Player'} released`, 'info');
        renderPlayers();
        refreshSquadPanel();
    }

    function refreshSquadPanel() {
        const sidebar = document.getElementById('squad-sidebar');
        if (sidebar) {
            renderSquadPanel(sidebar, {
                onRelease: handleRelease,
            });
        }
    }
}
