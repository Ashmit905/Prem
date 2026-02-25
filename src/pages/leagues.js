/**
 * leagues.js — Custom Leagues page
 * Create, join, and view league standings
 */

import { isFirebaseConfigured, getCurrentUser, signInWithGoogle } from '../firebase.js';
import { createLeague, joinLeague, getMyLeagues, getLeagueDetail, syncSquadToLeagues, leaveLeague } from '../state/leagues.js';
import { showToast } from '../main.js';
import { animate, stagger } from 'motion';

let currentView = 'list'; // list | detail | create
let selectedLeagueId = null;

export default async function leaguesPage(container) {
    const user = getCurrentUser();

    if (!isFirebaseConfigured()) {
        container.innerHTML = `
      <div class="page__header" style="opacity:0">
        <div class="page__eyebrow">Multiplayer</div>
        <h1 class="page__title">Custom <span style="color:var(--gold)">Leagues</span></h1>
        <p class="page__subtitle">Create a league, invite friends, compete on shared standings</p>
      </div>
      <div class="empty-state">
        <div class="empty-state__icon">🔧</div>
        <div class="empty-state__title">Firebase not configured</div>
        <p class="empty-state__text">Add your Firebase config to .env to enable leagues.<br>
        See the <a href="#/settings">Settings</a> page for setup instructions.</p>
      </div>
    `;
        animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });
        return;
    }

    if (!user) {
        container.innerHTML = `
      <div class="page__header" style="opacity:0">
        <div class="page__eyebrow">Multiplayer</div>
        <h1 class="page__title">Custom <span style="color:var(--gold)">Leagues</span></h1>
        <p class="page__subtitle">Create a league, invite friends, compete on shared standings</p>
      </div>
      <div class="empty-state">
        <div class="empty-state__icon">🔒</div>
        <div class="empty-state__title">Sign in to access leagues</div>
        <p class="empty-state__text">You need to be signed in with Google to create or join leagues.</p>
        <button class="btn btn--primary" id="login-for-leagues" style="margin-top:var(--space-lg)">
          Sign in with Google
        </button>
      </div>
    `;
        animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });

        document.getElementById('login-for-leagues')?.addEventListener('click', async () => {
            try {
                await signInWithGoogle();
                leaguesPage(container); // Re-render
            } catch (err) { showToast('Login failed: ' + err.message, 'error'); }
        });
        return;
    }

    // User is logged in — show leagues
    currentView = selectedLeagueId ? 'detail' : 'list';

    if (currentView === 'list') {
        await renderLeagueList(container, user);
    } else {
        await renderLeagueDetail(container, selectedLeagueId);
    }
}

async function renderLeagueList(container, user) {
    container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">Multiplayer</div>
      <h1 class="page__title">Custom <span style="color:var(--gold)">Leagues</span></h1>
      <p class="page__subtitle">Create a league, invite friends, compete on shared standings</p>
    </div>

    <div class="league-actions" style="opacity:0">
      <button class="btn btn--primary" id="create-league-btn">➕ Create League</button>
      <button class="btn btn--outline" id="sync-squads-btn">🔄 Sync My Squad</button>
    </div>

    <!-- Join Section -->
    <div class="share-section" style="opacity:0">
      <div class="section-heading">
        <h2 class="section-heading__title">Join <span>a League</span></h2>
        <div class="section-heading__line"></div>
      </div>
      <div class="share-code-row">
        <input type="text" class="share-code-input" id="join-code" placeholder="Enter 6-character invite code..." maxlength="6" style="text-transform:uppercase" />
        <button class="btn btn--primary" id="join-league-btn">Join</button>
      </div>
    </div>

    <div class="section-heading" style="opacity:0">
      <h2 class="section-heading__title">My <span>Leagues</span></h2>
      <div class="section-heading__line"></div>
    </div>

    <div id="leagues-list">
      <div class="loading-state" style="text-align:center;padding:var(--space-xl)">
        <div class="loading-spinner"></div>
      </div>
    </div>

    <!-- Create League Modal -->
    <div id="create-league-form" class="league-create-form" style="display:none">
      <div class="section-heading">
        <h2 class="section-heading__title">Create <span>New League</span></h2>
        <div class="section-heading__line"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--space-md)">
        <input type="text" class="share-code-input" id="league-name-input" placeholder="League name" maxlength="40" />
        <input type="text" class="share-code-input" id="league-desc-input" placeholder="Description (optional)" maxlength="100" />
        <div style="display:flex;gap:var(--space-md)">
          <button class="btn btn--primary" id="confirm-create">Create</button>
          <button class="btn btn--outline" id="cancel-create">Cancel</button>
        </div>
      </div>
    </div>
  `;

    animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });
    animate('.league-actions', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.1 });
    animate('.share-section', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.15 });
    animate('.section-heading', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: stagger(0.08, { start: 0.2 }) });

    // Load leagues
    try {
        const leagues = await getMyLeagues();
        const listEl = document.getElementById('leagues-list');

        if (leagues.length === 0) {
            listEl.innerHTML = `
        <div class="empty-state" style="padding:var(--space-xl)">
          <div class="empty-state__icon">🏟</div>
          <div class="empty-state__title">No leagues yet</div>
          <p class="empty-state__text">Create a league or join one with an invite code above.</p>
        </div>
      `;
        } else {
            listEl.innerHTML = `
        <div class="league-list">
          ${leagues.map(league => `
            <div class="league-card" data-id="${league.id}">
              <div class="league-card__info">
                <div class="league-card__name">${league.name}</div>
                <div class="league-card__meta">
                  ${league.memberUids?.length || 0} members · Code: <strong>${league.inviteCode}</strong>
                </div>
                ${league.description ? `<div class="league-card__desc">${league.description}</div>` : ''}
              </div>
              <button class="btn btn--outline btn--sm league-view-btn" data-id="${league.id}">View</button>
            </div>
          `).join('')}
        </div>
      `;

            // View league click handlers
            listEl.querySelectorAll('.league-view-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    selectedLeagueId = btn.dataset.id;
                    renderLeagueDetail(container, selectedLeagueId);
                });
            });

            animate('.league-card', { opacity: [0, 1], y: [10, 0] }, { duration: 0.3, delay: stagger(0.06) });
        }
    } catch (err) {
        document.getElementById('leagues-list').innerHTML = `
      <p style="color:var(--color-danger);text-align:center;padding:var(--space-lg)">Failed to load: ${err.message}</p>
    `;
    }

    // Create league toggle
    document.getElementById('create-league-btn')?.addEventListener('click', () => {
        const form = document.getElementById('create-league-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        animate(form, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3 });
    });

    document.getElementById('cancel-create')?.addEventListener('click', () => {
        document.getElementById('create-league-form').style.display = 'none';
    });

    document.getElementById('confirm-create')?.addEventListener('click', async () => {
        const name = document.getElementById('league-name-input')?.value?.trim();
        if (!name) { showToast('Enter a league name', 'error'); return; }

        try {
            const result = await createLeague(name, document.getElementById('league-desc-input')?.value?.trim());
            showToast(`League "${name}" created! Invite code: ${result.inviteCode}`, 'success');
            renderLeagueList(container, user);
        } catch (err) { showToast('Failed: ' + err.message, 'error'); }
    });

    // Join league
    document.getElementById('join-league-btn')?.addEventListener('click', async () => {
        const code = document.getElementById('join-code')?.value?.trim();
        if (!code || code.length < 4) { showToast('Enter a valid invite code', 'error'); return; }

        try {
            const result = await joinLeague(code);
            if (result.success) {
                showToast(`Joined "${result.leagueName}"! 🎉`, 'success');
                renderLeagueList(container, user);
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) { showToast('Failed: ' + err.message, 'error'); }
    });

    // Sync squads
    document.getElementById('sync-squads-btn')?.addEventListener('click', async () => {
        try {
            await syncSquadToLeagues();
            showToast('Squad synced to all leagues ✓', 'success');
        } catch (err) { showToast('Sync failed: ' + err.message, 'error'); }
    });
}

async function renderLeagueDetail(container, leagueId) {
    container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">League Detail</div>
      <h1 class="page__title" id="league-title">Loading...</h1>
    </div>
    <div id="league-detail-content">
      <div class="loading-state" style="text-align:center;padding:var(--space-2xl)">
        <div class="loading-spinner"></div>
      </div>
    </div>
  `;

    animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });

    try {
        const league = await getLeagueDetail(leagueId);
        if (!league) {
            document.getElementById('league-detail-content').innerHTML = `
        <div class="empty-state"><div class="empty-state__title">League not found</div></div>
      `;
            return;
        }

        const user = getCurrentUser();
        document.getElementById('league-title').innerHTML = `${league.name} <span style="color:var(--gold)">Standings</span>`;

        document.getElementById('league-detail-content').innerHTML = `
      <div class="league-actions" style="opacity:0">
        <button class="btn btn--outline" id="back-to-leagues">← Back</button>
        <button class="btn btn--outline" id="copy-invite">📋 Copy Invite: ${league.inviteCode}</button>
        <button class="btn btn--outline" id="leave-league" style="color:var(--color-danger)">Leave League</button>
      </div>

      <div class="league-info-bar" style="opacity:0">
        <div class="news-overview__item">
          <div class="stat-block__label">Members</div>
          <div class="stat-block__value">${league.members?.length || 0}</div>
        </div>
        <div class="news-overview__item">
          <div class="stat-block__label">Invite Code</div>
          <div class="stat-block__value" style="font-size:1rem;letter-spacing:0.2em">${league.inviteCode}</div>
        </div>
        <div class="news-overview__item">
          <div class="stat-block__label">Created By</div>
          <div class="stat-block__value" style="font-size:0.9rem">${league.createdByName}</div>
        </div>
      </div>

      <div class="section-heading" style="opacity:0">
        <h2 class="section-heading__title">League <span>Standings</span></h2>
        <div class="section-heading__line"></div>
      </div>

      <div class="league-standings" style="opacity:0">
        ${(league.members || []).map((member, i) => `
          <div class="league-member-row ${member.uid === user?.uid ? 'league-member-row--you' : ''}">
            <div class="league-member-row__rank">${i + 1}</div>
            ${member.photoURL ? `<img class="league-member-row__avatar" src="${member.photoURL}" alt="" />` : '<div class="league-member-row__avatar-placeholder">👤</div>'}
            <div class="league-member-row__info">
              <div class="league-member-row__name">${member.displayName}${member.uid === user?.uid ? ' (You)' : ''}</div>
              <div class="league-member-row__squad">${(member.squad || []).length} players drafted</div>
            </div>
            <div class="league-member-row__pts">${member.totalPoints || 0} pts</div>
          </div>
        `).join('')}
      </div>
    `;

        animate('.league-actions', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.1 });
        animate('.league-info-bar', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.15 });
        animate('.section-heading', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.2 });
        animate('.league-standings', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.25 });

        // Back button
        document.getElementById('back-to-leagues')?.addEventListener('click', () => {
            selectedLeagueId = null;
            leaguesPage(container);
        });

        // Copy invite
        document.getElementById('copy-invite')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(league.inviteCode);
                showToast('Invite code copied!', 'success');
            } catch { showToast(`Invite code: ${league.inviteCode}`, 'info'); }
        });

        // Leave league
        document.getElementById('leave-league')?.addEventListener('click', async () => {
            if (!confirm('Leave this league? This cannot be undone.')) return;
            try {
                await leaveLeague(leagueId);
                showToast('Left the league', 'info');
                selectedLeagueId = null;
                leaguesPage(container);
            } catch (err) { showToast('Failed: ' + err.message, 'error'); }
        });

    } catch (err) {
        document.getElementById('league-detail-content').innerHTML = `
      <p style="color:var(--color-danger);text-align:center">Error: ${err.message}</p>
    `;
    }
}
