import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://weworkremotely.com";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

// WWR tem RSS público — mais estável que scraping de HTML puro
export async function fetchWWR() {
  const feeds = [
    `${BASE_URL}/categories/remote-product-jobs.rss`,
    `${BASE_URL}/categories/remote-management-and-finance-jobs.rss`,
  ];

  const results = [];

  for (const feedUrl of feeds) {
    try {
      const res = await axios.get(feedUrl, { headers: HEADERS, timeout: 10000 });
      const $ = cheerio.load(res.data, { xmlMode: true });

      $("item").each((_, el) => {
        const $el = $(el);
        const rawTitle = $el.find("title").first().text().trim();
        const link = $el.find("link").text().trim();
        const pubDate = $el.find("pubDate").text().trim();
        const description = $el.find("description").text()
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 3000);

        // RSS title format: "Company: Job Title at Company"
        const atMatch = rawTitle.match(/^(.+?)\s+at\s+(.+)$/i);
        const colonMatch = rawTitle.match(/^([^:]+):\s+(.+)$/);
        let title = rawTitle;
        let company = "Unknown";

        if (atMatch) {
          title = atMatch[1].trim();
          company = atMatch[2].trim();
        } else if (colonMatch) {
          company = colonMatch[1].trim();
          title = colonMatch[2].trim();
        }

        if (!title || !link) return;

        results.push({
          id: `wwr_${Buffer.from(link).toString("base64").substring(0, 20)}`,
          source: "WeWorkRemotely",
          title,
          company,
          location: "Remote / Worldwide",
          url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
          description,
          salary: null,
          publishedAt: pubDate || null,
        });
      });

      console.log(`  WWR (${feedUrl.split("/").slice(-1)[0].replace(".rss", "")}): ${results.length} total jobs so far`);
    } catch (e) {
      console.error(`WWR error for ${feedUrl}:`, e.message);
    }

    await new Promise((r) => setTimeout(r, 1200));
  }

  // Dedup por URL
  const seen = new Set();
  return results.filter((j) => {
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });
}

export default fetchWWR;
