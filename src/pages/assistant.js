/**
 * assistant.js — AI Strategy Assistant page
 * Chat-style interface with analytical recommendations
 */

import { fetchCompetition, fetchMatches, fetchStandings, fetchAllPlayers, fetchAllMatches, isApiKeySet } from '../api/football.js';
import { getSquad, getCaptain, getTotalPoints } from '../state/store.js';
import { analyzeCaptainPick, analyzeDraftSuggestions, analyzeSquadGaps, analyzeFixtureDifficulty } from '../state/ai.js';
import { animate, stagger } from 'motion';

let chatMessages = [];

export default async function assistantPage(container) {
    chatMessages = [];

    container.innerHTML = `
    <div class="page__header" style="opacity:0">
      <div class="page__eyebrow">Strategy Engine</div>
      <h1 class="page__title">AI <span style="color:var(--gold)">Assistant</span></h1>
      <p class="page__subtitle">Data-driven analysis and personalized recommendations</p>
    </div>

    <div class="ai-chat" id="ai-chat">
      <div class="ai-chat__messages" id="chat-messages"></div>
      <div class="ai-chat__actions" id="chat-actions" style="opacity:0">
        <button class="ai-action-btn" data-action="squad">🔍 Analyze Squad</button>
        <button class="ai-action-btn" data-action="captain">© Captain Pick</button>
        <button class="ai-action-btn" data-action="draft">📋 Draft Tips</button>
        <button class="ai-action-btn" data-action="fixtures">📅 Fixture Difficulty</button>
        <button class="ai-action-btn" data-action="overview">📊 Full Overview</button>
      </div>
    </div>
  `;

    animate('.page__header', { opacity: [0, 1], y: [16, 0] }, { duration: 0.4 });

    // Opening message
    await addBotMessage('Hey boss! I\'m your strategy assistant. I analyze football data to help you make smarter decisions. What do you want to know?');

    animate('#chat-actions', { opacity: [0, 1], y: [10, 0] }, { duration: 0.35 });

    if (!isApiKeySet()) {
        await addBotMessage('⚡ Connect your API key in `.env` to unlock live analysis. Without it, I can only check your squad composition.', 'warning');
    }

    // Bind actions
    container.querySelectorAll('.ai-action-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAction(btn.dataset.action));
    });
}

async function handleAction(action) {
    const squad = getSquad();
    const captainId = getCaptain();

    switch (action) {
        case 'squad':
            addUserMessage('Analyze my squad');
            await analyzeSquad(squad);
            break;
        case 'captain':
            addUserMessage('Who should I captain?');
            await recommendCaptain(squad, captainId);
            break;
        case 'draft':
            addUserMessage('Give me draft suggestions');
            await suggestDraft(squad);
            break;
        case 'fixtures':
            addUserMessage('Show fixture difficulty');
            await showFixtures(squad);
            break;
        case 'overview':
            addUserMessage('Full overview');
            await fullOverview(squad, captainId);
            break;
    }
}

// ---- Analysis Functions ----

async function analyzeSquad(squad) {
    await showTyping();

    const analysis = analyzeSquadGaps(squad);

    let html = `<div class="ai-card ai-card--analysis">`;
    html += `<div class="ai-card__header">Squad Analysis</div>`;
    html += `<div class="ai-card__rating ai-card__rating--${analysis.overallRating}">${analysis.overallRating.toUpperCase()}</div>`;
    html += `<div class="ai-card__stat">${analysis.totalPlayers}/15 players drafted</div>`;

    if (analysis.gaps.length > 0) {
        html += `<div class="ai-card__section">Issues</div>`;
        for (const gap of analysis.gaps) {
            const icon = gap.severity === 'critical' ? '🔴' : '🟡';
            html += `<div class="ai-card__item">${icon} ${gap.message}</div>`;
        }
    }

    if (analysis.strengths.length > 0) {
        html += `<div class="ai-card__section">Strengths</div>`;
        for (const s of analysis.strengths) {
            html += `<div class="ai-card__item">🟢 ${s.message}</div>`;
        }
    }

    html += `</div>`;
    await addBotMessage(html, 'html');
}

async function recommendCaptain(squad, currentCaptainId) {
    if (squad.length === 0) {
        await addBotMessage('You need to draft players before I can recommend a captain. Head to the Draft Room!');
        return;
    }

    await showTyping();

    if (!isApiKeySet()) {
        await addBotMessage('I need API access to check fixtures and standings. Add your key to `.env` for captain recommendations.');
        return;
    }

    try {
        const comp = await fetchCompetition();
        const md = comp.currentSeason?.currentMatchday || 1;
        const [matchData, standingsData] = await Promise.all([
            fetchMatches(md),
            fetchStandings(),
        ]);

        const standings = standingsData.standings?.find(s => s.type === 'TOTAL')?.table || [];
        const result = analyzeCaptainPick(squad, standings, md, matchData.matches);

        if (!result.recommendation) {
            await addBotMessage('Couldn\'t generate a recommendation with current data.');
            return;
        }

        let html = `<div class="ai-card ai-card--captain">`;
        html += `<div class="ai-card__header">Captain Pick — GW${md}</div>`;
        html += `<div class="ai-card__highlight">`;
        html += `<div class="ai-card__player-name">${result.recommendation.name}</div>`;
        html += `<div class="ai-card__player-team">${result.recommendation.teamName} · ${result.recommendation.position}</div>`;
        html += `</div>`;
        html += `<div class="ai-card__reasoning">${result.reasoning}</div>`;

        if (result.top3?.length > 1) {
            html += `<div class="ai-card__section">Alternatives</div>`;
            for (let i = 1; i < result.top3.length; i++) {
                const alt = result.top3[i];
                html += `<div class="ai-card__item">${i + 1}. ${alt.player.name} (${alt.player.teamName}) — ${alt.reasoning}</div>`;
            }
        }

        html += `</div>`;
        await addBotMessage(html, 'html');
    } catch (err) {
        await addBotMessage(`Analysis failed: ${err.message}. Try again in a minute (API rate limits).`);
    }
}

async function suggestDraft(squad) {
    if (!isApiKeySet()) {
        await addBotMessage('I need live data to make draft suggestions. Add your API key first!');
        return;
    }

    await showTyping();

    try {
        const [allPlayers, standingsData] = await Promise.all([
            fetchAllPlayers(),
            fetchStandings(),
        ]);

        const standings = standingsData.standings?.find(s => s.type === 'TOTAL')?.table || [];
        const result = analyzeDraftSuggestions(squad, allPlayers, standings);

        let html = `<div class="ai-card ai-card--draft">`;
        html += `<div class="ai-card__header">Draft Suggestions</div>`;

        if (Object.keys(result.openPositions).length > 0) {
            html += `<div class="ai-card__section">Open slots</div>`;
            for (const [pos, count] of Object.entries(result.openPositions)) {
                html += `<div class="ai-card__item">• ${pos}: ${count} slot${count > 1 ? 's' : ''} available</div>`;
            }
        }

        html += `<div class="ai-card__section">Top picks</div>`;
        for (const s of result.suggestions) {
            html += `<div class="ai-card__player">`;
            html += `<span class="ai-card__pos ai-card__pos--${s.player.position?.toLowerCase()}">${s.player.position}</span>`;
            html += `<span class="ai-card__player-name">${s.player.name}</span>`;
            html += `<span class="ai-card__player-team">${s.player.teamName}</span>`;
            html += `</div>`;
            html += `<div class="ai-card__item-sub">${s.reason}</div>`;
        }

        html += `</div>`;
        await addBotMessage(html, 'html');
    } catch (err) {
        await addBotMessage(`Failed: ${err.message}`);
    }
}

async function showFixtures(squad) {
    if (squad.length === 0) {
        await addBotMessage('Draft players first so I can check their upcoming fixtures!');
        return;
    }

    if (!isApiKeySet()) {
        await addBotMessage('I need API access to check fixture difficulty.');
        return;
    }

    await showTyping();

    try {
        const [standingsData, allMatches] = await Promise.all([
            fetchStandings(),
            fetchAllMatches(),
        ]);

        const standings = standingsData.standings?.find(s => s.type === 'TOTAL')?.table || [];
        const teamIds = [...new Set(squad.map(p => p.teamId))];

        let html = `<div class="ai-card ai-card--fixtures">`;
        html += `<div class="ai-card__header">Fixture Difficulty</div>`;

        for (const teamId of teamIds.slice(0, 5)) {
            const teamName = squad.find(p => p.teamId === teamId)?.teamName || 'Unknown';
            const fixtures = analyzeFixtureDifficulty(teamId, standings, allMatches.matches || []);

            html += `<div class="ai-card__section">${teamName}</div>`;
            html += `<div class="ai-card__fixture-row">`;
            for (const f of fixtures) {
                const bg = f.difficulty === 'easy' ? 'var(--color-success)' : f.difficulty === 'hard' ? 'var(--color-danger)' : 'var(--color-warning)';
                html += `<div class="ai-card__fixture-block" style="background:${bg}22;border-color:${bg}">`;
                html += `<div style="font-weight:700;font-size:0.75rem;">${f.opponent}</div>`;
                html += `<div style="font-size:0.6rem;color:var(--chalk-dim)">${f.isHome ? 'H' : 'A'} · GW${f.matchday}</div>`;
                html += `</div>`;
            }
            html += `</div>`;
        }

        html += `</div>`;
        await addBotMessage(html, 'html');
    } catch (err) {
        await addBotMessage(`Failed: ${err.message}`);
    }
}

async function fullOverview(squad, captainId) {
    addUserMessage('Give me the full rundown');
    await analyzeSquad(squad);
    await recommendCaptain(squad, captainId);
}

// ---- Chat Helpers ----

function addUserMessage(text) {
    chatMessages.push({ role: 'user', text });
    const el = document.getElementById('chat-messages');
    if (!el) return;

    const msg = document.createElement('div');
    msg.className = 'ai-msg ai-msg--user';
    msg.textContent = text;
    el.appendChild(msg);
    el.scrollTop = el.scrollHeight;
    animate(msg, { opacity: [0, 1], x: [20, 0] }, { duration: 0.2 });
}

async function addBotMessage(content, type = 'text') {
    chatMessages.push({ role: 'bot', content });
    const el = document.getElementById('chat-messages');
    if (!el) return;

    const msg = document.createElement('div');
    msg.className = 'ai-msg ai-msg--bot';

    if (type === 'html') {
        msg.innerHTML = content;
    } else if (type === 'warning') {
        msg.innerHTML = `<div style="color:var(--color-warning)">${content}</div>`;
    } else {
        msg.textContent = content;
    }

    el.appendChild(msg);
    el.scrollTop = el.scrollHeight;
    animate(msg, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3 });
}

async function showTyping() {
    const el = document.getElementById('chat-messages');
    if (!el) return;

    const typing = document.createElement('div');
    typing.className = 'ai-msg ai-msg--bot ai-typing';
    typing.innerHTML = '<span class="ai-typing__dot"></span><span class="ai-typing__dot"></span><span class="ai-typing__dot"></span>';
    el.appendChild(typing);
    el.scrollTop = el.scrollHeight;

    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
    typing.remove();
}
