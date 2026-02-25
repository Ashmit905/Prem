/**
 * router.js — Simple hash-based SPA router
 */

const routes = {};
let currentCleanup = null;

export function route(path, handler) {
    routes[path] = handler;
}

export function navigate(path) {
    window.location.hash = path;
}

export function startRouter(onRouteChange) {
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

        // Notify caller (navbar) of route change
        if (onRouteChange) onRouteChange(path);
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}
