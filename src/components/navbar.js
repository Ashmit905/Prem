/**
 * navbar.js — Top navigation bar component
 */

import { navigate } from '../router.js';

const NAV_LINKS = [
    { label: 'Dashboard', path: '/', icon: '🏠' },
    { label: 'Draft', path: '/draft', icon: '📋' },
    { label: 'Gameweek', path: '/gameweek', icon: '⚽' },
    { label: 'Standings', path: '/standings', icon: '🏆' },
];

export function renderNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    nav.innerHTML = `
    <div class="navbar">
      <div class="navbar__brand" onclick="window.location.hash='/'">
        <span class="navbar__brand-icon">⚽</span>
        <span>PREM</span>
      </div>
      <button class="navbar__toggle" id="nav-toggle" aria-label="Toggle menu">☰</button>
      <ul class="navbar__links" id="nav-links">
        ${NAV_LINKS.map(
        (link) => `
          <li>
            <a class="navbar__link" href="#${link.path}" data-path="${link.path}">
              ${link.icon} ${link.label}
            </a>
          </li>
        `
    ).join('')}
      </ul>
    </div>
  `;

    // Mobile toggle
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    toggle?.addEventListener('click', () => {
        links?.classList.toggle('navbar__links--open');
    });

    // Close mobile menu on link click
    nav.querySelectorAll('.navbar__link').forEach((link) => {
        link.addEventListener('click', () => {
            links?.classList.remove('navbar__links--open');
        });
    });
}
