# TDC Matchmaker Pro 💛

An internal matchmaking CRM dashboard built for The Date Crew matchmakers.

## Live Demo

🔗 [Live on Vercel](#) _(Add URL after deployment)_

**Demo Credentials:**
- Email: `admin@tdc.com`
- Password: `password123`

---

## Features

### Core
- 🔐 **Firebase Authentication** — secure login for matchmakers
- 👤 **200 Customer Profiles** — 100 male + 100 female with full Indian matchmaking data
- 📊 **Dashboard** — KPI cards, activity feed, quick filters
- 📋 **Customer List** — searchable, filterable, sortable table
- 🗂️ **Detailed Profiles** — 5 data sections covering Personal, Education, Professional, Family, and Preferences

### Matching Engine
- ⚖️ **Male criteria**: Age(20), Income(15), Height(15), Kids(20), Religion(10), City(10), Education(10)
- ⚖️ **Female criteria**: Profession(20), Values(20), Relocation(15), Education(15), Kids(15), Languages(10), Lifestyle(5)
- 🎯 **Top 10 matches** per customer

### AI Features (Groq · Llama 3.3 70B)
- ✨ **Why This Match?** — AI explanation of compatibility
- 🏷️ **AI Labels** — Excellent / High Potential / Good / Average Match
- 📨 **Intro Generator** — personalized introduction messages
- 🚩 **Red Flag Detector** — potential compatibility concerns

### Journey Tracking
- **8 stages**: New → Verified → Match Suggested → Match Sent → Interested → Meeting Scheduled → In Discussion → Closed
- Status badges, visual progress tracker, activity timeline

### Notes System
- ✏️ Add, edit, delete matchmaker notes per customer
- Timestamps and author tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Auth | Firebase Auth |
| Database | Firebase Firestore |
| AI | Groq API · Llama 3.3 70B |
| API Layer | Vercel Serverless Functions |
| Hosting | Vercel |

---

## Architecture

```
React Frontend (Vite)
       │
       ├── Firebase Auth (login/session)
       ├── Firebase Firestore (customers, notes, matches, activities)
       └── Vercel Functions (/api/*)
               │
               └── Groq API (Llama 3.3 70B)
```

---

## Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `customers` | All customer profiles |
| `notes` | Matchmaker notes per customer |
| `matches` | Sent match records |
| `activities` | Activity log per customer |
| `users` | Matchmaker accounts |

---

## Local Setup

```bash
# 1. Clone and install
git clone <repo>
cd tdc-matchmaker
npm install

# 2. Environment variables
# Create .env and add your Firebase + Groq keys (see .env.example)

# 3. Run dev server
npm run dev

# 4. Seed the database
# Navigate to http://localhost:5173/seed and click "Seed Database"
# (Do this only once!)

# 5. Open the app
# http://localhost:5173
# Login: admin@tdc.com / password123
```

---

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/match-analysis` | AI match explanation |
| `POST /api/generate-intro` | Personalized intro message |
| `POST /api/profile-summary` | AI profile summary |
| `POST /api/red-flags` | Red flag detection |

---

## Matching Logic

### Male seeking Female
Weighted criteria (total = 100 pts):
- **Age (20pts)**: Female ideally 0–5 years younger
- **Income (15pts)**: Female earns less than male
- **Height (15pts)**: Female shorter than male
- **Want Kids (20pts)**: Exact match or "Open"
- **Religion (10pts)**: Same religion preferred
- **City (10pts)**: Same city = full points; same country = partial
- **Education (10pts)**: Compatible education levels

### Female seeking Male
Weighted criteria (total = 100 pts):
- **Profession/Income (20pts)**: Male at equal or higher income bracket
- **Values (20pts)**: Religion + kids preference alignment
- **Relocation (15pts)**: Matching openness to relocate
- **Education (15pts)**: Compatible education levels
- **Kids Preference (15pts)**: Shared family planning views
- **Languages (10pts)**: Common languages spoken
- **Lifestyle (5pts)**: Diet, smoking, drinking alignment

---

## Why Firebase?

- **Real-time & scalable**: Firestore handles 200+ profiles with instant reads
- **Auth built-in**: Firebase Auth removes the need for a custom auth server
- **Serverless**: Zero infrastructure to manage
- **Free tier**: Generous free limits for a project of this scale

## Why Vercel Functions?

- **Secure**: Groq API key never exposed to the browser
- **Co-located**: API and frontend deploy from the same repo
- **No Express needed**: Simple serverless handlers for each endpoint

## Why Groq?

- **Speed**: Llama 3.3 70B responses in < 2 seconds
- **Quality**: Best-in-class open model for nuanced matchmaking explanations
- **Free tier**: Sufficient for demo/evaluation usage

---

## Assumptions

1. All profiles are Indian (matchmaking platform context)
2. Income is in INR
3. Matchmakers are the only users (no customer-facing features)
4. Demo credentials are pre-configured in Firebase Auth
5. Seed data uses random but realistic Indian names, cities, and professions

---

*Built for The Date Crew assignment — internal matchmaking CRM.*
