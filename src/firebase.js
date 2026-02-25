/**
 * firebase.js — Firebase app initialization
 * Reads config from Vite env vars
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Pull config from Vite env vars
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only init if config is available
let app = null;
let auth = null;
let db = null;

export function isFirebaseConfigured() {
    return !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
}

if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
}

export { auth, db };

// ---- Auth Helpers ----

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google popup
 */
export async function signInWithGoogle() {
    if (!auth) throw new Error('Firebase not configured');
    const result = await signInWithPopup(auth, googleProvider);

    // Sync user profile to Firestore
    const user = result.user;
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: Date.now(),
        });
    }

    return user;
}

/**
 * Sign out
 */
export async function signOut() {
    if (!auth) return;
    await fbSignOut(auth);
}

/**
 * Get current user (null if not logged in)
 */
export function getCurrentUser() {
    return auth?.currentUser || null;
}

/**
 * Listen for auth state changes
 */
export function onAuthChange(callback) {
    if (!auth) {
        callback(null);
        return () => { };
    }
    return onAuthStateChanged(auth, callback);
}
