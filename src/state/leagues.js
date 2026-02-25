/**
 * leagues.js — Custom Leagues state management via Firestore
 * Create leagues, join via invite code, shared standings
 */

import { db, getCurrentUser } from '../firebase.js';
import {
    collection, doc, setDoc, getDoc, getDocs, updateDoc,
    query, where, arrayUnion, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { getSquad, getCaptain, getTotalPoints } from './store.js';

/**
 * Generate a 6-character invite code
 */
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,1,0 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/**
 * Create a new league
 */
export async function createLeague(name, description = '') {
    const user = getCurrentUser();
    if (!user) throw new Error('Must be logged in to create a league');
    if (!db) throw new Error('Firebase not configured');

    const inviteCode = generateInviteCode();
    const leagueId = `league_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const leagueRef = doc(db, 'leagues', leagueId);

    const leagueData = {
        name,
        description,
        inviteCode,
        createdBy: user.uid,
        createdByName: user.displayName || 'Unknown',
        memberUids: [user.uid],
        createdAt: Date.now(),
    };

    await setDoc(leagueRef, leagueData);

    // Add creator as first member
    const memberRef = doc(db, 'leagues', leagueId, 'members', user.uid);
    await setDoc(memberRef, {
        uid: user.uid,
        displayName: user.displayName || 'Unknown',
        photoURL: user.photoURL || '',
        squad: getSquad(),
        captainId: getCaptain(),
        totalPoints: getTotalPoints(),
        joinedAt: Date.now(),
    });

    return { leagueId, inviteCode, ...leagueData };
}

/**
 * Join a league by invite code
 */
export async function joinLeague(code) {
    const user = getCurrentUser();
    if (!user) throw new Error('Must be logged in to join a league');
    if (!db) throw new Error('Firebase not configured');

    // Find league by invite code
    const leaguesRef = collection(db, 'leagues');
    const q = query(leaguesRef, where('inviteCode', '==', code.toUpperCase().trim()));
    const snap = await getDocs(q);

    if (snap.empty) {
        return { success: false, error: 'Invalid invite code' };
    }

    const leagueDoc = snap.docs[0];
    const leagueId = leagueDoc.id;
    const leagueData = leagueDoc.data();

    // Check if already a member
    if (leagueData.memberUids?.includes(user.uid)) {
        return { success: false, error: 'You\'re already in this league' };
    }

    // Add to members
    await updateDoc(doc(db, 'leagues', leagueId), {
        memberUids: arrayUnion(user.uid),
    });

    // Add member document
    const memberRef = doc(db, 'leagues', leagueId, 'members', user.uid);
    await setDoc(memberRef, {
        uid: user.uid,
        displayName: user.displayName || 'Unknown',
        photoURL: user.photoURL || '',
        squad: getSquad(),
        captainId: getCaptain(),
        totalPoints: getTotalPoints(),
        joinedAt: Date.now(),
    });

    return { success: true, leagueName: leagueData.name, leagueId };
}

/**
 * Get all leagues the current user is in
 */
export async function getMyLeagues() {
    const user = getCurrentUser();
    if (!user || !db) return [];

    const leaguesRef = collection(db, 'leagues');
    const q = query(leaguesRef, where('memberUids', 'array-contains', user.uid));
    const snap = await getDocs(q);

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get league details with all members
 */
export async function getLeagueDetail(leagueId) {
    if (!db) return null;

    const leagueRef = doc(db, 'leagues', leagueId);
    const leagueDoc = await getDoc(leagueRef);
    if (!leagueDoc.exists()) return null;

    const membersRef = collection(db, 'leagues', leagueId, 'members');
    const membersSnap = await getDocs(membersRef);
    const members = membersSnap.docs
        .map(d => d.data())
        .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    return {
        id: leagueId,
        ...leagueDoc.data(),
        members,
    };
}

/**
 * Sync current user's squad/points to all their leagues
 */
export async function syncSquadToLeagues() {
    const user = getCurrentUser();
    if (!user || !db) return;

    const leagues = await getMyLeagues();
    const updates = {
        squad: getSquad(),
        captainId: getCaptain(),
        totalPoints: getTotalPoints(),
        lastSync: Date.now(),
    };

    await Promise.all(
        leagues.map(league =>
            updateDoc(doc(db, 'leagues', league.id, 'members', user.uid), updates)
        )
    );
}

/**
 * Leave a league
 */
export async function leaveLeague(leagueId) {
    const user = getCurrentUser();
    if (!user || !db) return;

    // Remove member document
    await deleteDoc(doc(db, 'leagues', leagueId, 'members', user.uid));

    // Remove from memberUids array
    const leagueRef = doc(db, 'leagues', leagueId);
    const leagueDoc = await getDoc(leagueRef);
    if (leagueDoc.exists()) {
        const data = leagueDoc.data();
        const newMembers = (data.memberUids || []).filter(uid => uid !== user.uid);
        if (newMembers.length === 0) {
            // Delete league if no members left
            await deleteDoc(leagueRef);
        } else {
            await updateDoc(leagueRef, { memberUids: newMembers });
        }
    }
}
