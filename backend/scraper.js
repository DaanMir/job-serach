import axios from "axios";
import { SERP_LINKEDIN_QUERIES } from "./config.js";
import fetchWWR from "./scrapers/weworkremotely.js";
import fetchWellfound from "./scrapers/wellfound.js";
import fetchRemoteCo from "./scrapers/remote-co.js";
import fetchWorkingNomads from "./scrapers/workingnomads.js";
import fetchJobspresso from "./scrapers/jobspresso.js";
import fetchEuroRemoteJobs from "./scrapers/euroremotejobs.js";

const SERP_API_KEY = process.env.SERP_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;
const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APiFY_TOKEN;

// ─────────────────────────────────────────────
// FILTRO US-ONLY
// ─────────────────────────────────────────────
const US_ONLY_PATTERNS = [
  /\bUnited States only\b/i,
  /\bUS only\b/i,
  /\bUSA only\b/i,
  /\bU\.S\. only\b/i,
  /must be (authorized|eligible) to work in the (US|USA|United States)/i,
  /authorized to work in (the )?(US|USA|United States)/i,
  /US (work )?authorization required/i,
  /requires? (US|USA) (citizenship|residency)/i,
  /\bUS citizens? only\b/i,
  /\bdomestic (US|USA)\b/i,
  /located in the (US|USA|United States)/i,
  /must (reside|live|be based) in the (US|USA|United States)/i,
  /must be (located|located) in (the )?(US|USA)/i,
  /only (for|to) (US|USA) (citizens|residents)/i,
  /US-based (candidate|employee|person)/i,
  /require? (to be )?(located in |based in )?(US|USA)/i,
];

const US_STATES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
  "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
  "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
  "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire",
  "new jersey", "new mexico", "new york", "north carolina", "north dakota", "ohio", "oklahoma",
  "oregon", "pennsylvania", "rhode island", "south carolina", "south dakota", "tennessee",
  "texas", "utah", "vermont", "virginia", "washington", "west virginia", "wisconsin", "wyoming",
];

const US_CITIES = [
  "new york", "san francisco", "los angeles", "chicago", "houston", "phoenix", "philadelphia",
  "san antonio", "san diego", "dallas", "austin", "seattle", "denver", "boston", "atlanta",
  "miami", "portland", "detroit", "minneapolis", "tampa", "charlotte",
];

export function isUSOnly(job) {
  const title = (job.title || "").toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const loc = (job.location || "").toLowerCase();
  const text = `${title} ${desc} ${loc}`;

  for (const pattern of US_ONLY_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  const hasRemoteOrWorldwide = /remote|worldwide|global|anywhere|eu|europe/i.test(loc);
  if (!hasRemoteOrWorldwide) {
    for (const state of US_STATES) {
      if (loc.includes(state)) return true;
    }
    for (const city of US_CITIES) {
      if (loc.includes(city)) return true;
    }
    if (/\bUSA\b|\bUS\b|^United States$/.test(loc) && !/europe|eu|global|worldwide|remote/i.test(loc)) {
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────
// DEDUP HELPERS
// ─────────────────────────────────────────────

function normalizeTitleForDedup(title = "") {
  return title
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*[-–]\s*(remote|worldwide|global|eu|europe|uk|usa|germany|france|spain|ireland|portugal|italy|netherlands)[^-–]*/gi, "")
    .trim();
}

function normalizeForId(title = "", company = "") {
  const normalizedTitle = title
    .toLowerCase()
    .replace(/\s*[-–]\s*(crypto|web3|ai|ml|fintech|b2b|saas|remote|europe|eu|uk|usa|global)[^-–]*/gi, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  const normalizedCompany = company.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  return `${normalizedTitle}_${normalizedCompany}`;
}

// ─────────────────────────────────────────────
// URL VALIDATION
// ─────────────────────────────────────────────

async function checkUrl(url) {
  if (!url) return "dead";
  try {
    const res = await axios.head(url, {
      timeout: 6000,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobScout/1.0)" },
      validateStatus: () => true,
    });
    if (res.status === 405) {
      const getRes = await axios.get(url, {
        timeout: 6000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JobScout/1.0)" },
        validateStatus: () => true,
        responseType: "stream",
      });
      getRes.data?.destroy?.();
      return getRes.status === 404 || getRes.status === 410 ? "dead" : "ok";
    }
    return res.status === 404 || res.status === 410 ? "dead" : "ok";
  } catch {
    return "dead";
  }
}

async function validateJobUrls(jobs, sourceName) {
  const CONCURRENCY = 5;
  const results = new Map();
  const queue = [...jobs];
  const inFlight = [];

  async function processNext() {
    if (queue.length === 0) return;
    const job = queue.shift();
    const status = await checkUrl(job.url);
    results.set(job.id, status);
  }

  for (let i = 0; i < Math.min(CONCURRENCY, jobs.length); i++) {
    inFlight.push(processNext());
  }
  while (queue.length > 0) {
    await Promise.race(inFlight);
    inFlight.push(processNext());
  }
  await Promise.all(inFlight);

  const dead = jobs.filter((j) => results.get(j.id) === "dead");
  if (dead.length > 0) {
    console.log(`  🔗 [url-check] ${dead.length} dead link(s) filtered from ${sourceName}:`);
    dead.forEach((j) => console.log(`    ✗ ${j.title} @ ${j.company} — ${j.url}`));
  }
  return jobs.filter((j) => results.get(j.id) !== "dead");
}

// ─────────────────────────────────────────────
// SCRAPER HEALTH WRAPPER
// ─────────────────────────────────────────────
async function runScraper(name, fn) {
  try {
    const results = await fn();
    const count = Array.isArray(results) ? results.length : 0;
    return {
      jobs: results || [],
      health: { source: name, status: count > 0 ? "ok" : "empty", count, error: null },
    };
  } catch (err) {
    console.error(`[scraper:${name}] error:`, err.message);
    return {
      jobs: [],
      health: { source: name, status: "error", count: 0, error: err.message },
    };
  }
}

// ─────────────────────────────────────────────
// REMOTIVE
// ─────────────────────────────────────────────
export async function fetchRemotive() {
  const results = [];
  const categories = ["product", "management"];
  for (const cat of categories) {
    try {
      const res = await axios.get(`https://remotive.com/api/remote-jobs?category=${cat}&limit=50`);
      const jobs = res.data?.jobs || [];
      for (const job of jobs) {
        results.push({
          id: `remotive_${job.id}`,
          source: "Remotive",
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || "Remote",
          url: job.url,
          description: job.description?.replace(/<[^>]*>/g, " ").substring(0, 3000),
          salary: job.salary || null,
          publishedAt: job.publication_date,
        });
      }
    } catch (e) {
      console.error("Remotive error:", e.message);
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// HIMALAYAS
// ─────────────────────────────────────────────
export async function fetchHimalayas() {
  const results = [];
  try {
    const res = await axios.get(
      "https://himalayas.app/jobs/api?q=product+manager&limit=50",
      { headers: { Accept: "application/json" } }
    );
    const jobs = res.data?.jobs || [];
    for (const job of jobs) {
      results.push({
        id: `himalayas_${job.slug || job.id}`,
        source: "Himalayas",
        title: job.title,
        company: job.company?.name || job.companyName,
        location: job.locationRestrictions?.join(", ") || "Remote",
        url: `https://himalayas.app/jobs/${job.slug}`,
        description: job.description?.replace(/<[^>]*>/g, " ").substring(0, 3000),
        salary: job.salary || null,
        publishedAt: job.createdAt,
      });
    }
  } catch (e) {
    console.error("Himalayas error:", e.message);
  }
  return results;
}

// ─────────────────────────────────────────────
// LINKEDIN via Apify
// Replaces linkedin-jobs-api npm package.
// Actor: apify/linkedin-jobs-scraper
// Free tier: $5/month → ~12.500 vagas/mês
// Docs: https://apify.com/apify/linkedin-jobs-scraper
// ─────────────────────────────────────────────

const LINKEDIN_QUERIES = [
  { keywords: "Senior Product Manager AI LLM",     location: "Europe",    remote: true },
  { keywords: "Head of Product AI fintech",          location: "Europe",    remote: true },
  { keywords: "Technical Product Manager AI agents", location: "Europe",    remote: true },
  { keywords: "Lead Product Manager enterprise B2B", location: "Worldwide", remote: true },
  { keywords: "Principal Product Manager AI ML",     location: "Europe",    remote: true },
  { keywords: "Senior PM LLM open finance payments", location: "Europe",    remote: true },
];

export async function fetchLinkedInViaApify() {
  if (!APIFY_TOKEN) {
    console.warn("⚠️  APIFY_TOKEN not set — LinkedIn scraping disabled. Add token to .env to enable.");
    return [];
  }

  // Build Apify Actor input — one entry per search query
  // Actor: apify/linkedin-jobs-scraper
  // https://apify.com/apify/linkedin-jobs-scraper
  const input = {
    queries: LINKEDIN_QUERIES.map((q) => ({
      query: q.keywords,
      location: q.location,
    })),
    // Filters applied via Actor params
    experienceLevel: ["SENIOR", "DIRECTOR", "EXECUTIVE"],
    workType: ["REMOTE"],
    publishedAt: "PAST_MONTH",
    maxResults: 25,
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
  };

  try {
    console.log("  🔵 Starting Apify LinkedIn Actor run...");

    // Start the Actor run synchronously (waits for completion)
    const runRes = await axios.post(
      "https://api.apify.com/v2/acts/apify~linkedin-jobs-scraper/runs?waitForFinish=120",
      input,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APIFY_TOKEN}`,
        },
        timeout: 135_000, // 2min 15s — matches waitForFinish + buffer
      }
    );

    const run = runRes.data?.data;
    if (!run?.defaultDatasetId) {
      console.error("Apify run did not return a dataset ID", runRes.data);
      return [];
    }

    console.log(`  ✅ Apify run ${run.id} finished — fetching results from dataset...`);

    // Fetch results from the dataset
    const dataRes = await axios.get(
      `https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true&format=json`,
      { headers: { Authorization: `Bearer ${APIFY_TOKEN}` }, timeout: 30_000 }
    );

    const items = dataRes.data || [];
    console.log(`  📦 Apify returned ${items.length} LinkedIn jobs`);

    const results = [];
    for (const item of items) {
      // Apify linkedin-jobs-scraper output shape:
      // { id, title, company, location, url, description, salary, postedAt, ... }
      const title = item.title || item.positionName || "";
      const company = item.company || item.companyName || "";
      const url = item.jobUrl || item.url || "";
      if (!title || !url) continue;

      const stableKey = normalizeForId(title, company);
      const id = `linkedin_apify_${Buffer.from(stableKey).toString("base64").substring(0, 32)}`;

      results.push({
        id,
        source: "LinkedIn",
        title,
        company,
        location: item.location || "Remote",
        url,
        description: item.description?.substring(0, 3000) || "",
        salary: item.salary || null,
        publishedAt: item.postedAt || item.publishedAt || null,
      });
    }

    return results;
  } catch (e) {
    if (e.response?.status === 402) {
      console.error("Apify: free credits exhausted for this month. LinkedIn scraping skipped.");
    } else if (e.code === "ECONNABORTED" || e.message?.includes("timeout")) {
      console.error("Apify: Actor run timed out. Try again or increase waitForFinish.");
    } else {
      console.error("Apify LinkedIn error:", e.response?.data || e.message);
    }
    return [];
  }
}

// ─────────────────────────────────────────────
// JD enrichment via JSearch (LinkedIn only)
// Only called if a LinkedIn job still has no description
// after Apify (Apify normally returns full JDs)
// ─────────────────────────────────────────────
const TARGET_TITLE_KEYWORDS = [
  "product manager", "head of product", "vp of product",
  "director of product", "principal pm", "lead pm", "group pm",
  "technical pm", "ai pm", "product owner",
];

function isRelevantTitle(title = "") {
  return TARGET_TITLE_KEYWORDS.some((kw) => title.toLowerCase().includes(kw));
}

export async function enrichLinkedInJDs(linkedInJobs) {
  if (!JSEARCH_API_KEY) return linkedInJobs;

  const toEnrich = linkedInJobs.filter(
    (j) => isRelevantTitle(j.title) && (!j.description || j.description.length < 100) && j.url
  );

  if (toEnrich.length === 0) return linkedInJobs;
  console.log(`  🔍 Enriching ${toEnrich.length} LinkedIn jobs with JSearch (Apify already provided the rest)...`);

  const enriched = new Map();
  for (const job of toEnrich) {
    try {
      const jobIdMatch = job.url.match(/\/jobs\/view\/(\d+)/);
      if (!jobIdMatch) continue;

      const res = await axios.get("https://jsearch.p.rapidapi.com/job-details", {
        params: { job_id: `${jobIdMatch[1]}_${encodeURIComponent(job.company || "")}` },
        headers: {
          "X-RapidAPI-Key": JSEARCH_API_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        timeout: 8000,
      });

      const details = res.data?.data?.[0];
      if (details?.job_description) {
        enriched.set(job.id, details.job_description.substring(0, 3000));
      }
    } catch {
      // Silencioso
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  return linkedInJobs.map((job) =>
    enriched.has(job.id) ? { ...job, description: enriched.get(job.id) } : job
  );
}

// ─────────────────────────────────────────────
// JSEARCH
// ─────────────────────────────────────────────
export async function fetchJSearch() {
  if (!JSEARCH_API_KEY) {
    console.warn("JSEARCH_API_KEY not set, skipping JSearch");
    return [];
  }

  const results = [];
  const queries = [
    "Senior Product Manager AI remote Europe",
    "Head of Product LLM fintech remote",
    "Technical Product Manager AI agents remote EU",
    "Lead Product Manager enterprise B2B remote",
    "Principal Product Manager AI ML remote",
    "Group Product Manager fintech payments remote Europe",
  ];

  for (const query of queries) {
    try {
      const res = await axios.get("https://jsearch.p.rapidapi.com/search", {
        params: {
          query,
          page: "1",
          num_pages: "1",
          date_posted: "month",
          remote_jobs_only: "true",
          employment_types: "FULLTIME,CONTRACTOR",
        },
        headers: {
          "X-RapidAPI-Key": JSEARCH_API_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });

      const jobs = res.data?.data || [];
      for (const job of jobs) {
        results.push({
          id: `jsearch_${job.job_id?.substring(0, 20) || Math.random().toString(36).substring(7)}`,
          source: `JSearch (${job.job_publisher || "Indeed/LinkedIn"})`,
          title: job.job_title,
          company: job.employer_name,
          location: job.job_city ? `${job.job_city}, ${job.job_country}` : job.job_country || "Remote",
          url: job.job_apply_link || job.job_google_link,
          description: job.job_description?.substring(0, 3000) || "",
          salary: job.job_min_salary
            ? `${job.job_salary_currency || "€"}${job.job_min_salary}–${job.job_max_salary} ${job.job_salary_period || ""}`
            : null,
          publishedAt: job.job_posted_at_datetime_utc || null,
        });
      }
    } catch (e) {
      console.error("JSearch error:", e.message);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

// ─────────────────────────────────────────────
// SERPAPI
// ─────────────────────────────────────────────
export async function fetchViaSerpApi() {
  if (!SERP_API_KEY) {
    console.warn("SERP_API_KEY not set, skipping SerpAPI");
    return [];
  }
  const results = [];
  const queries = SERP_LINKEDIN_QUERIES.slice(0, 2);
  for (const query of queries) {
    try {
      const res = await axios.get("https://serpapi.com/search", {
        params: { engine: "google_jobs", q: query, hl: "en", gl: "us", api_key: SERP_API_KEY },
      });
      const jobs = res.data?.jobs_results || [];
      for (const job of jobs) {
        results.push({
          id: `serp_${Buffer.from(`${job.title}_${job.company_name}`).toString("base64").substring(0, 20)}`,
          source: "Google Jobs (SerpAPI)",
          title: job.title,
          company: job.company_name,
          location: job.location || "Remote",
          url: job.related_links?.[0]?.link || job.share_link || "",
          description: job.description?.substring(0, 3000) || "",
          salary: job.detected_extensions?.salary || null,
          publishedAt: job.detected_extensions?.posted_at || null,
        });
      }
    } catch (e) {
      console.error("SerpAPI error:", e.message);
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// GOOGLE CUSTOM SEARCH
// ─────────────────────────────────────────────
export async function fetchViaGoogleCustomSearch() {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.warn("GOOGLE_API_KEY or GOOGLE_CX not set, skipping Google fallback");
    return [];
  }
  const results = [];
  const queries = [
    "site:wellfound.com Senior Product Manager AI remote Europe",
    "site:weworkremotely.com Product Manager AI ML remote",
    "site:euremotejobs.com Senior PM fintech remote",
  ];
  for (const query of queries) {
    try {
      const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
        params: { key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: query, num: 10 },
      });
      const items = res.data?.items || [];
      for (const item of items) {
        results.push({
          id: `google_${Buffer.from(item.link).toString("base64").substring(0, 20)}`,
          source: "Google Custom Search",
          title: item.title?.replace(/\s*[-|].*$/, "").trim(),
          company: item.pagemap?.organization?.[0]?.name || extractCompany(item.snippet),
          location: "Remote",
          url: item.link,
          description: item.snippet || "",
          salary: null,
          publishedAt: null,
        });
      }
    } catch (e) {
      console.error("Google Custom Search error:", e.message);
    }
  }
  return results;
}

function extractCompany(snippet = "") {
  const match = snippet.match(/at ([A-Z][a-zA-Z\s]+?)[\s,.|]/);
  return match?.[1]?.trim() || "Unknown";
}

// ─────────────────────────────────────────────
// AGREGADOR PRINCIPAL
// ─────────────────────────────────────────────
export async function fetchAllJobs() {
  console.log("🔍 Fetching jobs from all sources...");

  const [
    remotive, himalayas, linkedIn, jsearch, serp, google,
    wwr, wellfound, remoteCo, workingNomads, jobspresso, euroRemote,
  ] = await Promise.allSettled([
    runScraper("Remotive",       fetchRemotive),
    runScraper("Himalayas",      fetchHimalayas),
    runScraper("LinkedIn",       fetchLinkedInViaApify),
    runScraper("JSearch",        fetchJSearch),
    runScraper("SerpAPI",        fetchViaSerpApi),
    runScraper("Google",         fetchViaGoogleCustomSearch),
    runScraper("WeWorkRemotely", fetchWWR),
    runScraper("Wellfound",      fetchWellfound),
    runScraper("Remote.co",      fetchRemoteCo),
    runScraper("WorkingNomads",  fetchWorkingNomads),
    runScraper("Jobspresso",     fetchJobspresso),
    runScraper("EuroRemoteJobs", fetchEuroRemoteJobs),
  ]);

  // Collect health per source
  const scraperHealth = {};
  for (const result of [remotive, himalayas, linkedIn, jsearch, serp, google, wwr, wellfound, remoteCo, workingNomads, jobspresso, euroRemote]) {
    if (result.status === "fulfilled") {
      const h = result.value.health;
      scraperHealth[h.source] = { status: h.status, count: h.count, error: h.error };
    }
  }

  // Enrich LinkedIn jobs that still lack a description (Apify usually returns full JDs)
  const linkedInJobs = linkedIn.status === "fulfilled" ? linkedIn.value.jobs : [];
  const linkedInEnriched = await enrichLinkedInJDs(linkedInJobs);

  // URL validation for sources that build synthetic URLs from slugs.
  // LinkedIn (Apify), Remotive, JSearch, SerpAPI, Google are skipped —
  // their URLs come directly from the data source.
  console.log("🔗 Validating URLs for slug-based sources...");
  const [himaJobs, wwrJobs, wellfoundJobs, remoteCoJobs, workingNomadsJobs, jobspressoJobs, euroRemoteJobs] =
    await Promise.all([
      himalayas.value?.jobs?.length     ? validateJobUrls(himalayas.value.jobs,     "Himalayas")     : Promise.resolve([]),
      wwr.value?.jobs?.length           ? validateJobUrls(wwr.value.jobs,           "WeWorkRemotely") : Promise.resolve([]),
      wellfound.value?.jobs?.length     ? validateJobUrls(wellfound.value.jobs,     "Wellfound")      : Promise.resolve([]),
      remoteCo.value?.jobs?.length      ? validateJobUrls(remoteCo.value.jobs,      "Remote.co")      : Promise.resolve([]),
      workingNomads.value?.jobs?.length ? validateJobUrls(workingNomads.value.jobs, "WorkingNomads")  : Promise.resolve([]),
      jobspresso.value?.jobs?.length    ? validateJobUrls(jobspresso.value.jobs,    "Jobspresso")     : Promise.resolve([]),
      euroRemote.value?.jobs?.length    ? validateJobUrls(euroRemote.value.jobs,    "EuroRemoteJobs") : Promise.resolve([]),
    ]);

  const sourceSummary = {};
  for (const [key, val] of Object.entries(scraperHealth)) {
    sourceSummary[key] = val.count;
  }
  console.log("📊 Jobs per source (before URL filter):", sourceSummary);

  const all = [
    ...(remotive.value?.jobs  || []),
    ...himaJobs,
    ...linkedInEnriched,
    ...(jsearch.value?.jobs   || []),
    ...(serp.value?.jobs      || []),
    ...(google.value?.jobs    || []),
    ...wwrJobs,
    ...wellfoundJobs,
    ...remoteCoJobs,
    ...workingNomadsJobs,
    ...jobspressoJobs,
    ...euroRemoteJobs,
  ];

  // Dedup por título-base + empresa
  const seen = new Set();
  const unique = all.filter((job) => {
    const titleBase = normalizeTitleForDedup(job.title);
    const key = `${titleBase}_${(job.company || "").toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const nonUS = unique.filter((job) => {
    if (isUSOnly(job)) {
      console.log(`  🚫 US-only filtered: "${job.title}" at ${job.company} (${job.location})`);
      return false;
    }
    return true;
  });
  console.log(`  ✂️  US-only filter: ${unique.length} → ${nonUS.length} jobs`);
  console.log(`✅ Total unique jobs fetched: ${nonUS.length}`);

  if (scraperHealth["LinkedIn"]) {
    scraperHealth["LinkedIn"].count = linkedInEnriched.length;
  }

  return { jobs: nonUS, scraperHealth };
}
