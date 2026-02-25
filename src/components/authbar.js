/**
 * authbar.js — Login/logout UI component for the navbar
 * Shows Google avatar + name when logged in, sign-in button when not
 */

import { isFirebaseConfigured, signInWithGoogle, signOut, onAuthChange } from '../firebase.js';

export function renderAuthBar() {
    if (!isFirebaseConfigured()) return;

    const authEl = document.createElement('div');
    authEl.className = 'auth-bar';
    authEl.id = 'auth-bar';

    // Insert into navbar
    const navbar = document.getElementById('main-navbar');
    if (navbar) {
        navbar.appendChild(authEl);
    }

    // Listen for auth changes
    onAuthChange(user => {
        if (user) {
            authEl.innerHTML = `
        <div class="auth-bar__user">
          ${user.photoURL ? `<img class="auth-bar__avatar" src="${user.photoURL}" alt="" />` : ''}
          <span class="auth-bar__name">${user.displayName?.split(' ')[0] || 'User'}</span>
          <button class="auth-bar__btn auth-bar__btn--out" id="auth-sign-out" title="Sign out">✕</button>
        </div>
      `;
            document.getElementById('auth-sign-out')?.addEventListener('click', async () => {
                await signOut();
            });
        } else {
            authEl.innerHTML = `
        <button class="auth-bar__btn auth-bar__btn--in" id="auth-sign-in">
          Sign In
        </button>
      `;
            document.getElementById('auth-sign-in')?.addEventListener('click', async () => {
                try {
                    await signInWithGoogle();
                } catch (err) {
                    console.error('Sign-in failed:', err);
                }
            });
        }
    });
}
