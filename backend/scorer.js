import Groq from "groq-sdk";
import axios from "axios";
import { PROFILE } from "./config.js";

// Tenta buscar a JD completa da página da vaga (LinkedIn e outros)
async function fetchJobDescription(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    const html = res.data || "";
    // Extrai texto limpo removendo tags HTML
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Procura pela seção de job description (heurística)
    const descMatch = text.match(/(?:about the (?:role|job|position)|responsibilities|what you.ll do|job description|role overview)(.{200,3000})/i);
    return descMatch ? descMatch[0].substring(0, 2500) : text.substring(0, 2500);
  } catch {
    return null;
  }
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert job screening AI for a Senior Product Manager. Your job is to score jobs accurately and differentiate clearly between strong fits and weak fits.

Candidate profile:
- 5+ years Senior PM, $3MM+ business impact
- Built $2M enterprise monitoring platform at NTT Data
- Improved Mastercard LLM accuracy 74%→97% (Brazil, UK, Australia)
- Expert in: AI/ML products, LLM/MCP/AI Agents, Open Finance, Fintech, Enterprise B2B, APIs, Microservices, Azure
- Based in Italy (EU timezone), dual Italian/Brazilian citizenship
- Languages: Portuguese (native), English (fluent), Italian (B1)
- Target: remote-first roles in EU timezone or worldwide
- Salary: €600-700/day contract, €90k+ permanent

SCORING RULES — apply strictly:
- ON-SITE or OFFICE REQUIRED jobs: score 0, recommendation SKIP, redFlag "On-site required"
- Jobs outside EU timezone with no remote flexibility: score max 30
- Junior/Associate/Entry-level titles: score 0, recommendation SKIP
- Strong AI/ML + fintech + senior PM match with full remote: score 75-95
- Good PM match but missing AI/fintech focus: score 50-70
- PM role but wrong domain (e.g. retail, gaming, HR): score 30-50
- Non-PM roles that slipped through: score 0-20, recommendation SKIP

DIFFERENTIATE scores meaningfully — do not cluster everything at 50-65. Use the full 0-100 range.

You MUST respond ONLY with valid JSON, no markdown, no explanation.`;

const USER_PROMPT = (job) => {
  const hasDescription = job.description && job.description.length > 100;
  const descSection = hasDescription
    ? `Job Description:\n${job.description.substring(0, 2500)}`
    : `Job Description: Not available — score based on title, company, location, and salary context. For senior PM roles at reputable companies, assume a reasonable baseline score of 50-65.`;

  return `Analyze this job and score it for the candidate profile.

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary || "Not specified"}
Source: ${job.source}

${descSection}

IMPORTANT: If the job requires on-site presence, is office-only, or explicitly says "no remote" → score MUST be 0 and recommendation MUST be SKIP.
Check the description carefully for on-site requirements even if location says "Remote" (some jobs say hybrid or require relocation).

Return ONLY this JSON structure:
{
  "score": <0-100 integer>,
  "recommendation": "<STRONG_FIT | GOOD_FIT | CONSIDER | SKIP>",
  "matchedSkills": ["skill1", "skill2"],
  "highlights": ["key point 1", "key point 2", "key point 3"],
  "redFlags": ["flag1"] or [],
  "salaryAssessment": "<ABOVE_TARGET | AT_TARGET | BELOW_TARGET | UNKNOWN>",
  "locationAssessment": "<EU_BASED | EU_TIMEZONE | WORLDWIDE | ON_SITE>",
  "seniorityMatch": "<PERFECT | GOOD | OVERQUALIFIED | UNDERQUALIFIED>",
  "summary": "<2 sentence summary of why this is or isn't a good fit>"
}`;
};

// Retry com backoff exponencial para rate limit (429)
async function scoreWithRetry(job, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const chat = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: USER_PROMPT(job) },
        ],
        temperature: 0.1,
        max_tokens: 600,
      });

      const raw = chat.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);

      return {
        ...job,
        ...parsed,
        scored: true,
      };
    } catch (e) {
      const isRateLimit = e?.status === 429 || e?.message?.includes("rate limit") || e?.message?.includes("429");
      const isLastAttempt = attempt === maxRetries;

      if (isRateLimit && !isLastAttempt) {
        // Backoff exponencial: 5s, 10s, 20s
        const waitMs = 5000 * Math.pow(2, attempt - 1);
        console.warn(`  ⏳ Rate limit hit for "${job.title}" — waiting ${waitMs / 1000}s (attempt ${attempt}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      console.error(`Scoring error for "${job.title}":`, e.message);
      return {
        ...job,
        score: 0,
        recommendation: "SKIP",
        summary: "Scoring failed: " + e.message,
        scored: false,
      };
    }
  }
  return null;
}

export async function scoreJob(job) {
  // Pre-filter: bloqueio por título
  const titleLower = job.title?.toLowerCase() || "";
  const isBlocked = PROFILE.dealBreakers.some((term) =>
    titleLower.includes(term.toLowerCase())
  );
  if (isBlocked) {
    return {
      ...job,
      score: 0,
      recommendation: "SKIP",
      matchedSkills: [],
      highlights: [],
      redFlags: ["Title contains deal-breaker term"],
      salaryAssessment: "UNKNOWN",
      locationAssessment: "UNKNOWN",
      seniorityMatch: "UNDERQUALIFIED",
      summary: "Automatically filtered: junior or blocked title.",
      scored: true,
    };
  }

  // Pre-filter: verifica se é vaga de PM (title check)
  const isPM = PROFILE.targetTitles.some((t) =>
    titleLower.includes(t.toLowerCase().split(" ").slice(-1)[0])
  );
  if (!isPM && !titleLower.includes("product")) {
    return null; // descarta vagas irrelevantes sem gastar tokens
  }

  // Pre-filter: bloqueia vagas on-site por localização/descrição
  const locationLower = (job.location || "").toLowerCase();
  const descLower = (job.description || "").toLowerCase();
  const onSiteTerms = ["on-site", "onsite", "on site", "office only", "in-office", "must be in office", "no remote", "not remote"];
  const isOnSite = onSiteTerms.some((t) => locationLower.includes(t) || descLower.includes(t));
  if (isOnSite) {
    return {
      ...job,
      score: 0,
      recommendation: "SKIP",
      matchedSkills: [],
      highlights: [],
      redFlags: ["On-site or office-only role"],
      salaryAssessment: "UNKNOWN",
      locationAssessment: "ON_SITE",
      seniorityMatch: "UNKNOWN",
      summary: "Automatically filtered: on-site or office-only position.",
      scored: true,
    };
  }

  // Se não tem descrição, tenta buscar da página da vaga
  let enrichedJob = { ...job };
  if ((!job.description || job.description.length < 100) && job.url) {
    const fetchedDesc = await fetchJobDescription(job.url);
    if (fetchedDesc && fetchedDesc.length > 100) {
      enrichedJob.description = fetchedDesc;
      console.log(`  📄 Fetched JD for "${job.title}" at ${job.company}`);
    }
  }

  // Chama com retry para rate limit
  return await scoreWithRetry(enrichedJob);
}

export async function scoreAllJobs(jobs) {
  console.log(`🤖 Scoring ${jobs.length} jobs with Groq...`);
  const scored = [];

  // Processa em batches menores com delay maior para evitar rate limit
  const batchSize = 3;
  const batchDelay = 4000;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(scoreJob));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value !== null) {
        scored.push(r.value);
      }
    }
    if (i + batchSize < jobs.length) {
      console.log(`  ⏳ Batch done, waiting ${batchDelay / 1000}s before next...`);
      await new Promise((r) => setTimeout(r, batchDelay));
    }
  }

  // Filtra SKIPs e ordena por score
  const filtered = scored
    .filter((j) => j.recommendation !== "SKIP" && j.score > 20)
    .sort((a, b) => b.score - a.score);

  console.log(`✅ ${filtered.length} relevant jobs after scoring`);
  return filtered;
}
