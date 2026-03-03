import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://euremotejobs.com";
// FIX 8: Headers mais completos para evitar 403 (Cloudflare/bot protection)
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
};

// EuroRemoteJobs — foco em vagas remote para EU timezone
// Usa WP Job Manager, estrutura HTML padrão
export async function fetchEuroRemoteJobs() {
    // REMOVIDO: /job-category/management/ que dava 404
    const pages = [
        `${BASE_URL}/job-category/product/`,
        `${BASE_URL}/jobs/`,
    ];

    const results = [];

    for (const pageUrl of pages) {
        try {
            const res = await axios.get(pageUrl, { headers: HEADERS, timeout: 15000 });
            const $ = cheerio.load(res.data);

            // WP Job Manager usa <ul class="job_listings"> com <li class="job_listing">
            const jobCards = $(".job_listing, .job-listing, article.type-job, .jobs-list-item");

            jobCards.each((_, el) => {
                const $el = $(el);

                const titleEl = $el.find("h3 a, h2 a, .job-title a, .position a").first();
                const title = titleEl.text().trim();
                const url = titleEl.attr("href") || $el.find("a").first().attr("href") || "";

                const company = $el.find(".company strong, .company-name, .job-company, [class*='company']").first().text().trim()
                    || "Unknown";

                const location = $el.find(".location, .job-location, [class*='location']").first().text().trim()
                    || "EU Remote";

                const description = $el.find(".job-description, .job_description, p").first().text()
                    .replace(/\s+/g, " ")
                    .trim()
                    .substring(0, 1000);

                const publishedAt = $el.find("time").attr("datetime")
                    || $el.find(".date, .job-date").text().trim()
                    || null;

                if (!title || !url) return;

                results.push({
                    id: `euroremote_${Buffer.from(url).toString("base64").substring(0, 20)}`,
                    source: "EuroRemoteJobs",
                    title,
                    company,
                    location: location || "EU Remote",
                    url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
                    description,
                    salary: null,
                    publishedAt,
                });
            });

            console.log(`  EuroRemoteJobs (${pageUrl.split("/").slice(-2, -1)[0]}): ${results.length} total jobs so far`);
        } catch (e) {
            console.error(`EuroRemoteJobs error for ${pageUrl}:`, e.message);
        }

        await new Promise((r) => setTimeout(r, 1500));
    }

    // Dedup por URL
    const seen = new Set();
    return results.filter((j) => {
        if (seen.has(j.url)) return false;
        seen.add(j.url);
        return true;
    });
}

export default fetchEuroRemoteJobs;
