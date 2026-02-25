# ⚽ Kickoff — Fantasy Football

A full-featured fantasy football web app with live Premier League data, custom leagues, AI strategy tools, and a head-to-head arena.

**[Live Demo →](https://kickofffantasy.vercel.app)**

---

## Features

### 🏟 Core Fantasy
- **Draft Room** — Browse 500+ real players, filter by position, build your 15-man squad
- **Gameweek Scoring** — Points calculated from real match data (goals, assists, clean sheets, cards)
- **Captain Pick** — Your captain earns double points every gameweek
- **League Standings** — Live table with all 20 clubs

### ⚔ Head-to-Head Arena
- **Friend vs Friend** — Share your squad code, import a friend's squad, battle on the same gameweek
- **AI Rivals** — Solo play against randomly generated opponents
- **Match History** — Win/draw/loss record tracked across sessions

### 🤖 AI Strategy Assistant
- Chat-style interface with quick action buttons
- Captain recommendations based on fixture difficulty
- Draft suggestions from strong undrafted teams
- Squad gap analysis and composition ratings

### 📰 Football News
- Real-time articles from **BBC Sport**, **ESPN FC**, and **Sky Sports**
- Source filtering tabs
- Thumbnails, descriptions, and time-ago timestamps

### 🏆 Social Hub
- 14 unlockable achievements across Draft, Scoring, Arena, and Social categories
- Match predictions tracker
- Trash talk generator
- Auto-generated season journal

### 🏟 Custom Leagues
- Create leagues with unique 6-character invite codes
- Friends join via invite code
- Shared standings ranked by total points
- Sync your squad to all leagues with one click

### ⚙ Settings & Custom Rules
- Fully editable scoring table (goals, assists, clean sheets, cards × position)
- Changes apply across all scoring in the app
- Reset to defaults anytime

### 🔐 Authentication
- Google sign-in via Firebase Auth
- User profiles synced to Firestore
- Required for leagues, optional for everything else

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla JS + Vite |
| Styling | Custom CSS (dark theme, no frameworks) |
| Animations | Motion (Framer Motion for vanilla JS) |
| Data | [football-data.org](https://www.football-data.org/) API |
| News | BBC Sport / ESPN / Sky Sports RSS feeds |
| Auth | Firebase Authentication (Google) |
| Database | Cloud Firestore |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A free [football-data.org](https://www.football-data.org/) API key
- (Optional) A [Firebase](https://console.firebase.google.com) project for auth & leagues

### Setup

```bash
git clone https://github.com/Ashmit905/Prem.git
cd Prem/Prem
npm install
```

Create a `.env` file:

```env
VITE_API_KEY=your_football_data_api_key

# Optional — for Google login & leagues
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Run locally

```bash
npm run dev
```

### Deploy to Vercel

```bash
npx vercel
```

Add your env vars in the Vercel dashboard under Project Settings → Environment Variables.

---

## Project Structure

```
src/
├── api/            # football-data.org API wrapper
├── components/     # Navbar, auth bar, reusable UI
├── pages/          # Route pages (dashboard, draft, gameweek, etc.)
├── state/          # State management (localStorage + Firestore)
├── firebase.js     # Firebase init & auth helpers
├── router.js       # Hash-based SPA router
├── main.js         # App bootstrap & route registration
└── style.css       # Complete design system
```

---

## License

MIT
