import axios from "axios";
import * as cheerio from "cheerio";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
};

// Jobspresso — RSS WordPress público, vagas remote curadas
export async function fetchJobspresso() {
    const feeds = [
        "https://jobspresso.co/feed/?post_type=job_listing&job_category=product",
        "https://jobspresso.co/feed/?post_type=job_listing",
    ];

    const results = [];

    for (const feedUrl of feeds) {
        try {
            const res = await axios.get(feedUrl, { headers: HEADERS, timeout: 12000 });
            const $ = cheerio.load(res.data, { xmlMode: true });

            $("item").each((_, el) => {
                const $el = $(el);
                const title = $el.find("title").first().text()
                    .replace(/<!\[CDATA\[|\]\]>/g, "")
                    .trim();
                const link = $el.find("link").text().trim() || $el.find("guid").text().trim();
                const pubDate = $el.find("pubDate").text().trim();

                // Jobspresso usa campos customizados do WP Job Manager
                const company = $el.find("job_listing_company, company").text().trim()
                    || $el.find("dc\\:creator, creator").text().trim()
                    || "Unknown";

                const location = $el.find("job_listing_location, location").text().trim()
                    || "Remote";

                const description = $el.find("description, content\\:encoded").first().text()
                    .replace(/<!\[CDATA\[|\]\]>/g, "")
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .substring(0, 3000);

                if (!title || !link) return;

                results.push({
                    id: `jobspresso_${Buffer.from(link).toString("base64").substring(0, 20)}`,
                    source: "Jobspresso",
                    title,
                    company,
                    location,
                    url: link.startsWith("http") ? link : `https://jobspresso.co${link}`,
                    description,
                    salary: null,
                    publishedAt: pubDate || null,
                });
            });

            console.log(`  Jobspresso: ${results.length} total jobs so far`);
        } catch (e) {
            console.error(`Jobspresso error for ${feedUrl}:`, e.message);
        }

        await new Promise((r) => setTimeout(r, 1000));
    }

    // Dedup por URL
    const seen = new Set();
    return results.filter((j) => {
        if (seen.has(j.url)) return false;
        seen.add(j.url);
        return true;
    });
}

export default fetchJobspresso;
