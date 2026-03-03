import axios from "axios";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
};

// WorkingNomads — API JSON pública, sem autenticação
// https://www.workingnomads.com/api/exposed_jobs/
export async function fetchWorkingNomads() {
    const categories = ["product", "management"];
    const results = [];

    for (const category of categories) {
        try {
            const res = await axios.get("https://www.workingnomads.com/api/exposed_jobs/", {
                params: { category },
                headers: HEADERS,
                timeout: 12000,
            });

            const jobs = res.data || [];
            for (const job of jobs) {
                const description = [job.description, job.short_description]
                    .filter(Boolean)
                    .join(" ")
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .substring(0, 3000);

                results.push({
                    id: `workingnomads_${job.id || Buffer.from((job.title || "") + (job.company_name || "")).toString("base64").substring(0, 16)}`,
                    source: "WorkingNomads",
                    title: job.title || "",
                    company: job.company_name || "Unknown",
                    location: job.location || "Remote / Worldwide",
                    url: job.url || job.apply_url || "",
                    description,
                    salary: job.salary || null,
                    publishedAt: job.pub_date || job.created || null,
                });
            }

            console.log(`  WorkingNomads (${category}): ${jobs.length} jobs`);
        } catch (e) {
            console.error(`WorkingNomads error for category ${category}:`, e.message);
        }

        await new Promise((r) => setTimeout(r, 800));
    }

    // Dedup por URL
    const seen = new Set();
    return results.filter((j) => {
        if (!j.url || seen.has(j.url)) return false;
        seen.add(j.url);
        return true;
    });
}

export default fetchWorkingNomads;
