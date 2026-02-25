/**
 * router.js — Simple hash-based SPA router
 */

const routes = {};
let currentCleanup = null;

/**
 * Register a route
 * @param {string} path - Hash path (e.g. '/', '/draft')
 * @param {Function} handler - Async function(container) that renders the page, optionally returns a cleanup function
 */
export function route(path, handler) {
    routes[path] = handler;
}

/**
 * Navigate to a hash path
 */
export function navigate(path) {
    window.location.hash = path;
}

/**
 * Start the router — listens for hashchange
 */
export function startRouter() {
    async function handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const path = hash.split('?')[0];
        const handler = routes[path] || routes['/'];

        const container = document.getElementById('page-content');
        if (!container) return;

        // Cleanup previous page
        if (currentCleanup && typeof currentCleanup === 'function') {
            currentCleanup();
        }

        container.innerHTML = '';
        container.className = 'page';

        if (handler) {
            currentCleanup = await handler(container);
        }

        // Update active nav link
        document.querySelectorAll('.navbar__link').forEach((link) => {
            const linkPath = link.getAttribute('href')?.replace('#', '') || '/';
            link.classList.toggle('navbar__link--active', linkPath === path);
        });
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}
