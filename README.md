# 🔍 Job Scout — AI-Powered Job Screener for Product Managers

Local job screening system for Product Manager positions with hybrid AI scoring (deterministic + Groq LLaMA 3.1).

## Quick Setup

### First time
```bash
# Backend
cd backend
npm install
npx playwright install chromium
cp .env.example .env
# Edit .env with your API keys
node server.js

# Frontend (new terminal)
cd frontend
npm install
npm start
```

### Already installed
```bash
# Pull latest changes first
git pull

# Backend
cd backend
node server.js

# Frontend (new terminal)
cd frontend
npm start
```

Opens at **http://localhost:3000**

---

## Job Sources

| Source | Method | Limit | Key Required |
|--------|--------|-------|--------------|
| Remotive | Public API | Unlimited | ❌ |
| Himalayas | Public API | Unlimited | ❌ |
| **LinkedIn Direct** | npm public scraping | Unlimited | ❌ |
| **WeWorkRemotely** | RSS scraper | Unlimited | ❌ |
| **Wellfound** | Playwright scraper | Unlimited | ❌ |
| **Jobspresso** | Custom scraper | Unlimited | ❌ |
| **WorkingNomads** | Custom scraper | Unlimited | ❌ |
| **EuroRemoteJobs** | Custom scraper | Unlimited | ❌ |
| **JSearch** (LinkedIn + Indeed + Glassdoor) | RapidAPI | 200 req/month free | ✅ JSEARCH_API_KEY |
| SerpAPI (Google Jobs) | API | 100 req/month free | ✅ SERP_API_KEY |

> LinkedIn jobs without JD are automatically enriched via JSearch `job-details` endpoint — only for relevant titles, to preserve the monthly quota.

---

## Getting API Keys

| Key | Where |
|-----|-------|
| `GROQ_API_KEY` | https://console.groq.com |
| `JSEARCH_API_KEY` | https://rapidapi.com → search "JSearch by OpenWeb Ninja" → Subscribe Free |
| `SERP_API_KEY` | https://serpapi.com (backup) |

---

## How Scoring Works

Scoring is hybrid — two independent layers:

**Layer 1 — Deterministic base score (code, no LLM)**
The code scans the job title, description, and location for verifiable signals and sums points:
- Domain keywords: LLM, MCP, AI Agents, Open Finance, Fintech, Payments, Enterprise B2B, Observability, Azure
- Title match: Head of Product, Senior PM, Technical PM, Principal PM, etc.
- Location: EU-based (+15), Worldwide (+8), EU timezone (+10)
- Salary informed (+5), seniority explicit in title (+5)
- Cap: 75 points

**Layer 2 — LLM quality bonus (Groq, 0-25 points)**
The LLM receives the already-calculated base score and evaluates only what code cannot:
- Actual product/problem domain fit
- Company stage and growth potential
- Role complexity and leadership scope
- Red flags not caught by keywords

**Final score = baseScore + qualityBonus (max 100)**

**Recommendation thresholds (calculated by code, not LLM):**
- ≥ 75 → STRONG FIT
- ≥ 55 → GOOD FIT
- ≥ 35 → CONSIDER
- < 35 → SKIP

---

## Automatic Filters

Applied before scoring — no tokens spent:
- **Junior/Associate/Intern** titles → SKIP
- **On-site / office-only** roles → SKIP (checks title, location, and description)
- **US-only** roles → removed before scoring (checks patterns like "US only", "must be authorized to work in the US", US states and cities in location)

---

## How to Use

1. **Run Scan** — fetches jobs from all sources, filters US-only and on-site, scores each job
2. View **ranking** sorted by score — each card shows baseScore + qualityBonus breakdown
3. Expand a job to see highlights, matched skills, red flags, and summary
4. Click **Mark as Applied** on jobs you apply to
5. Track status in **Applications** tab (applied → interview → offer / rejected)
6. **History** tab loads any previous scan with saved job descriptions

---

## Customize Criteria

Edit **`backend/config.js`** to adjust:
- Accepted / blocked job titles
- Priority skills
- Minimum salary range
- Deal breakers
- Search queries

Edit **`backend/scorer.js`** → `DOMAIN_KEYWORDS` and `TITLE_SCORES` to change keyword weights.

---

## Architecture

- **Backend**: Node.js + Express API (port 3001)
- **Frontend**: React (port 3000, proxied to backend)
- **AI Scoring**: Hybrid — deterministic keyword scoring + Groq LLaMA 3.1-8b-instant quality bonus
- **Storage**: Local JSON file (`data.json`)
- **Scraping**: Public APIs, RSS feeds, Playwright (Wellfound), custom scrapers
