import { chromium } from "playwright";

const SEARCH_URLS = [
  "https://wellfound.com/jobs?role=Product+Manager&remote=true&locationTag=Europe",
  "https://wellfound.com/jobs?role=Head+of+Product&remote=true",
  "https://wellfound.com/jobs?role=Technical+Product+Manager&remote=true",
];

export async function fetchWellfound() {
  const results = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    // Bloqueia imagens e fontes para ser mais rápido
    await context.route("**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf}", (route) =>
      route.abort()
    );

    for (const searchUrl of SEARCH_URLS) {
      const page = await context.newPage();

      try {
        console.log(`  Wellfound: scraping ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });

        // Espera cards de vagas carregarem
        await page.waitForSelector('[data-test="JobListing"], .job-listing, [class*="JobListing"]', {
          timeout: 15000,
        }).catch(() => {}); // não falha se não encontrar

        // Scroll para carregar mais vagas
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 800));
          await page.waitForTimeout(1000);
        }

        // Extrai via __NEXT_DATA__ (GraphQL Apollo state — mais confiável que HTML parsing)
        const nextData = await page.evaluate(() => {
          const el = document.getElementById("__NEXT_DATA__");
          if (el) {
            try { return JSON.parse(el.textContent); } catch { return null; }
          }
          return null;
        });

        if (nextData) {
          const jobs = extractJobsFromNextData(nextData);
          results.push(...jobs);
          console.log(`  Wellfound NEXT_DATA: +${jobs.length} jobs from ${searchUrl}`);
        } else {
          // Fallback: DOM parsing
          const jobs = await page.evaluate(() => {
            const cards = document.querySelectorAll(
              '[data-test="JobListing"], [class*="job-"], [class*="JobCard"]'
            );
            return Array.from(cards).map((card) => ({
              title: card.querySelector("h2, h3, [class*='title']")?.textContent?.trim() || "",
              company: card.querySelector("[class*='company'], [class*='Company']")?.textContent?.trim() || "",
              location: card.querySelector("[class*='location'], [class*='Location']")?.textContent?.trim() || "Remote",
              url: card.querySelector("a")?.href || "",
              salary: card.querySelector("[class*='salary'], [class*='compensation']")?.textContent?.trim() || null,
            }));
          });

          for (const job of jobs) {
            if (!job.title || !job.url) continue;
            results.push({
              id: `wellfound_${Buffer.from(job.url).toString("base64").substring(0, 20)}`,
              source: "Wellfound",
              title: job.title,
              company: job.company,
              location: job.location || "Remote",
              url: job.url,
              description: "",
              salary: job.salary,
              publishedAt: null,
            });
          }
          console.log(`  Wellfound DOM fallback: +${jobs.length} jobs`);
        }
      } catch (e) {
        console.error(`Wellfound error for ${searchUrl}:`, e.message);
      } finally {
        await page.close();
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    await context.close();
  } catch (e) {
    console.error("Wellfound browser error:", e.message);
  } finally {
    if (browser) await browser.close();
  }

  // Dedup por URL
  const seen = new Set();
  const unique = results.filter((j) => {
    if (!j.url || seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });

  console.log(`  Wellfound total: ${unique.length} unique jobs`);
  return unique;
}

// Extrai vagas do __NEXT_DATA__ (Apollo GraphQL state)
function extractJobsFromNextData(data) {
  const results = [];
  try {
    // Navega pela árvore de dados do Apollo
    const apolloState = data?.props?.pageProps?.apolloState
      || data?.props?.pageProps?.__APOLLO_STATE__
      || {};

    for (const [key, value] of Object.entries(apolloState)) {
      // Procura nodes de JobListing
      if (
        key.startsWith("JobListing:") ||
        (typeof value === "object" && value?.__typename === "JobListing")
      ) {
        const job = value;
        const titleStr = job.title || job.jobTitle || "";
        const companyRef = job.startup || job.company;
        const companyName =
          (typeof companyRef === "object" ? companyRef?.name : null) ||
          apolloState[companyRef?.__ref]?.name ||
          "Unknown";

        const slug = job.slug || job.jobSlug || "";
        const url = slug
          ? `https://wellfound.com/jobs/${slug}`
          : job.jobUrl || "";

        const compensation = job.compensation || job.salary || null;

        if (!titleStr || !url) continue;

        results.push({
          id: `wellfound_${Buffer.from(url).toString("base64").substring(0, 20)}`,
          source: "Wellfound",
          title: titleStr,
          company: companyName,
          location: job.locationNames?.join(", ") || (job.remote ? "Remote" : "Remote"),
          url,
          description: job.description?.replace(/<[^>]*>/g, " ").substring(0, 3000) || "",
          salary: compensation,
          publishedAt: job.liveStartAt || null,
        });
      }
    }
  } catch (e) {
    console.error("Error parsing NEXT_DATA:", e.message);
  }
  return results;
}

export default fetchWellfound;
