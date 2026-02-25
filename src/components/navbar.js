/**
 * navbar.js — Football-themed navigation
 * Bold Syne wordmark + gold sliding underline indicator
 */

import { navigate } from '../router.js';
import { animate, stagger } from 'motion';

const NAV_LINKS = [
  { label: 'Home', path: '/', icon: '▣' },
  { label: 'Draft', path: '/draft', icon: '◈' },
  { label: 'Gameweek', path: '/gameweek', icon: '◉' },
  { label: 'Standings', path: '/standings', icon: '◆' },
  { label: 'Arena', path: '/h2h', icon: '⚔' },
  { label: 'AI', path: '/assistant', icon: '🤖' },
  { label: 'Social', path: '/social', icon: '🏆' },
];

export function renderNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  nav.innerHTML = `
    <div class="navbar" id="main-navbar">
      <a class="navbar__brand" href="#/" onclick="event.preventDefault(); window.location.hash='/'">
        <div class="navbar__badge">⚽</div>
        <div class="navbar__wordmark">
          <span class="navbar__title">PREM</span>
          <span class="navbar__sub">Fantasy PL</span>
        </div>
      </a>

      <button class="navbar__toggle" id="nav-toggle" aria-label="Toggle menu">
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="2" rx="1" fill="currentColor"/>
          <rect y="6" width="14" height="2" rx="1" fill="currentColor"/>
          <rect y="12" width="20" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>

      <ul class="navbar__links" id="nav-links">
        ${NAV_LINKS.map((link) => `
          <li>
            <a class="navbar__link" href="#${link.path}" data-path="${link.path}">
              ${link.label}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  // Animate navbar entrance
  animate(
    '.navbar__badge',
    { scale: [0.5, 1], opacity: [0, 1] },
    { duration: 0.5, easing: [0.34, 1.56, 0.64, 1] }
  );

  animate(
    '.navbar__wordmark',
    { opacity: [0, 1], x: [-12, 0] },
    { duration: 0.4, delay: 0.1 }
  );

  animate(
    '.navbar__link',
    { opacity: [0, 1], y: [-8, 0] },
    { duration: 0.35, delay: stagger(0.06, { start: 0.2 }) }
  );

  // Mobile toggle
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  toggle?.addEventListener('click', () => {
    links?.classList.toggle('navbar__links--open');
  });

  // Close mobile on link click
  nav.querySelectorAll('.navbar__link').forEach((link) => {
    link.addEventListener('click', () => {
      links?.classList.remove('navbar__links--open');
    });
  });

  // Scroll-aware navbar
  let scrolled = false;
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('main-navbar');
    if (!navbar) return;
    if (window.scrollY > 30 && !scrolled) {
      navbar.classList.add('navbar--scrolled');
      scrolled = true;
    } else if (window.scrollY <= 30 && scrolled) {
      navbar.classList.remove('navbar--scrolled');
      scrolled = false;
    }
  }, { passive: true });
}

/**
 * Update active nav link (called by router)
 */
export function updateActiveLink(path) {
  document.querySelectorAll('.navbar__link').forEach((link) => {
    const linkPath = link.getAttribute('data-path') || '/';
    link.classList.toggle('navbar__link--active', linkPath === path);
  });
}
