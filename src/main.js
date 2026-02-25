/**
 * main.js — App bootstrap
 * Wires up the router, navbar, and toast system
 */

import './style.css';
import { route, startRouter } from './router.js';
import { renderNavbar } from './components/navbar.js';
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

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ---- Init ----
function init() {
    // Render navbar
    renderNavbar();

    // Register routes
    route('/', dashboardPage);
    route('/draft', draftPage);
    route('/gameweek', gameweekPage);
    route('/standings', standingsPage);

    // Start router
    startRouter();
}

// Boot
init();
