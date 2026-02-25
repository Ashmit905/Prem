/**
 * settings.js — Settings & Scoring Rules page
 * Custom scoring table editor with per-event per-position controls
 */

import { getScoringRules, getDefaultRules, updateRule, resetRules, EVENT_NAMES, POSITIONS } from '../state/settings.js';
import { showToast } from '../main.js';
import { animate, stagger } from 'motion';

export default async function settingsPage(container) {
    let rules = getScoringRules();
    const defaults = getDefaultRules();

    container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">Configuration</div>
      <h1 class="page__title">Settings <span style="color:var(--gold)">& Rules</span></h1>
      <p class="page__subtitle">Customize your league scoring — every point value is editable</p>
    </div>

    <div class="settings-actions" style="opacity:0">
      <button class="btn btn--outline" id="reset-rules">🔄 Reset to Defaults</button>
    </div>

    <div class="section-heading" style="opacity:0">
      <h2 class="section-heading__title">Scoring <span>Table</span></h2>
      <div class="section-heading__line"></div>
    </div>
    <p class="settings-desc" style="opacity:0">
      Points awarded per event, by position. Click any value to edit. Changes are saved instantly.
    </p>

    <div class="scoring-table-wrap" style="opacity:0">
      <table class="scoring-table" id="scoring-table">
        <thead>
          <tr>
            <th class="scoring-table__event">Event</th>
            ${POSITIONS.map(pos => `<th class="scoring-table__pos">${pos}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${Object.keys(EVENT_NAMES).map(event => `
            <tr class="scoring-table__row" data-event="${event}">
              <td class="scoring-table__event-name">
                <span class="scoring-table__event-icon">${getEventIcon(event)}</span>
                ${EVENT_NAMES[event]}
              </td>
              ${POSITIONS.map(pos => `
                <td class="scoring-table__cell">
                  <input type="number" 
                    class="scoring-input" 
                    data-event="${event}" 
                    data-pos="${pos}" 
                    value="${rules[event]?.[pos] ?? 0}" 
                    min="-10" max="20" step="1"
                  />
                  ${getDefaultBadge(rules[event]?.[pos], defaults[event]?.[pos])}
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section-heading" style="margin-top:var(--space-2xl);opacity:0">
      <h2 class="section-heading__title">How <span>Scoring Works</span></h2>
      <div class="section-heading__line"></div>
    </div>

    <div class="scoring-explainer" style="opacity:0">
      <div class="explainer-card">
        <div class="explainer-card__icon">⚽</div>
        <div class="explainer-card__title">Goals</div>
        <div class="explainer-card__text">Defenders & keepers earn more for goals (harder to score). Forwards earn the least per goal.</div>
      </div>
      <div class="explainer-card">
        <div class="explainer-card__icon">🅰️</div>
        <div class="explainer-card__title">Assists</div>
        <div class="explainer-card__text">Equal across all positions by default. Reward playmaking regardless of role.</div>
      </div>
      <div class="explainer-card">
        <div class="explainer-card__icon">🛡️</div>
        <div class="explainer-card__title">Clean Sheets</div>
        <div class="explainer-card__text">Goalkeepers and defenders get the biggest reward. Midfielders get a small bonus. Forwards get nothing.</div>
      </div>
      <div class="explainer-card">
        <div class="explainer-card__icon">🟨</div>
        <div class="explainer-card__title">Cards</div>
        <div class="explainer-card__text">Yellow cards deduct 1pt, reds deduct 3pts. Discipline matters.</div>
      </div>
      <div class="explainer-card">
        <div class="explainer-card__icon">👟</div>
        <div class="explainer-card__title">Appearance</div>
        <div class="explainer-card__text">Every player who plays earns appearance points. Rewards consistent selection.</div>
      </div>
      <div class="explainer-card">
        <div class="explainer-card__icon">©️</div>
        <div class="explainer-card__title">Captain</div>
        <div class="explainer-card__text">Your captain earns <strong>double points</strong> for everything. Choose wisely each gameweek.</div>
      </div>
    </div>
  `;

    // Animations
    animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });
    animate('.settings-actions', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: 0.1 });
    animate('.section-heading', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: stagger(0.1, { start: 0.15 }) });
    animate('.settings-desc', { opacity: [0, 1] }, { duration: 0.3, delay: 0.2 });
    animate('.scoring-table-wrap', { opacity: [0, 1], y: [10, 0] }, { duration: 0.4, delay: 0.25 });
    animate('.scoring-explainer', { opacity: [0, 1], y: [10, 0] }, { duration: 0.4, delay: 0.35 });

    // Input change handlers
    container.querySelectorAll('.scoring-input').forEach(input => {
        input.addEventListener('change', () => {
            const event = input.dataset.event;
            const pos = input.dataset.pos;
            const value = parseInt(input.value) || 0;
            rules = updateRule(event, pos, value);

            // Update badge
            const cell = input.parentElement;
            const existingBadge = cell.querySelector('.scoring-badge');
            if (existingBadge) existingBadge.remove();
            cell.insertAdjacentHTML('beforeend', getDefaultBadge(value, defaults[event]?.[pos]));

            showToast(`${EVENT_NAMES[event]} for ${pos}: ${value}pts`, 'success');
        });
    });

    // Reset button
    document.getElementById('reset-rules')?.addEventListener('click', () => {
        rules = resetRules();
        // Update all inputs
        container.querySelectorAll('.scoring-input').forEach(input => {
            const event = input.dataset.event;
            const pos = input.dataset.pos;
            input.value = rules[event]?.[pos] ?? 0;
            // Remove badges
            const badge = input.parentElement.querySelector('.scoring-badge');
            if (badge) badge.remove();
        });
        showToast('Scoring rules reset to defaults', 'success');
    });
}

function getEventIcon(event) {
    const icons = {
        goal: '⚽',
        assist: '🅰️',
        cleanSheet: '🛡️',
        yellowCard: '🟨',
        redCard: '🟥',
        appearance: '👟',
    };
    return icons[event] || '•';
}

function getDefaultBadge(current, defaultVal) {
    if (current === defaultVal || current === undefined) return '';
    return `<span class="scoring-badge">${current > defaultVal ? '↑' : '↓'}</span>`;
}
