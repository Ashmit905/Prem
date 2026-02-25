/**
 * main.js — App bootstrap
 */

import './style.css';
import { route, startRouter } from './router.js';
import { renderNavbar, updateActiveLink } from './components/navbar.js';
import dashboardPage from './pages/dashboard.js';
import draftPage from './pages/draft.js';
import gameweekPage from './pages/gameweek.js';
import standingsPage from './pages/standings.js';

// ---- Toast System ----
let toastContainer = null;

export function showToast(message, type = 'info') {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Slide in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(110%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

// ---- Init ----
function init() {
    renderNavbar();

    route('/', dashboardPage);
    route('/draft', draftPage);
    route('/gameweek', gameweekPage);
    route('/standings', standingsPage);

    // Start router with navbar active link callback
    startRouter((path) => {
        updateActiveLink(path);
    });
}

init();
