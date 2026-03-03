import axios from "axios";
import * as cheerio from "cheerio";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
};

// Remote.co — DESABILITADO devido a timeouts persistentes
// WeWorkRemotely + Wellfound já cobrem essas vagas
export async function fetchRemoteCo() {
    console.log("⚠️ Remote.co disabled (persistent timeouts)");
    return [];
}

export default fetchRemoteCo;
