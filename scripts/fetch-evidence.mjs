// Pre-fetch Tavily evidence for the investigated companies and cache it under data/evidence.
// Usage: node scripts/fetch-evidence.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = (readFileSync(join(root, ".env"), "utf8").match(/^TAVILY_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!KEY) throw new Error("TAVILY_API_KEY missing from .env");

const OFFICIAL = ["treasury.gov", "home.treasury.gov", "ofac.treasury.gov", "cbp.gov", "dhs.gov", "federalregister.gov", "bis.gov", "gov.uk", "state.gov", "ustr.gov", "congress.gov", "europa.eu"];
const NEWS = ["reuters.com", "lloydslist.com", "tradewindsnews.com", "ft.com", "bbc.com", "apnews.com", "nytimes.com", "wsj.com", "bloomberg.com"];
const RESEARCH = ["shu.ac.uk", "shura.shu.ac.uk", "c4ads.org", "opensanctions.org", "aspi.org.au", "hrw.org", "amnesty.org", "thebureauinvestigates.com"];

const COMPANIES = {
  sovcomflot: {
    names: ["sovcomflot", "scf"],
    selfDomains: ["scf-group.ru", "scf-group.com"],
    queries: [
      { topic: "sanctions", q: "Sovcomflot OFAC sanctions designation", include: [...OFFICIAL, ...NEWS] },
      { topic: "ownership", q: "\"Sovcomflot (UK)\" sanctioned London subsidiary", include: [...OFFICIAL, ...NEWS, "opensanctions.org"] },
      { topic: "evasion", q: "Sovcomflot shadow fleet tankers sanctions evasion", include: NEWS, time_range: "year" },
    ],
  },
  chenguang: {
    names: ["chenguang"],
    selfDomains: ["chenguang.com.cn", "cn-cg.com"],
    queries: [
      { topic: "forced_labor", q: "\"Chenguang Biotech\" UFLPA Entity List", include: [...OFFICIAL, ...RESEARCH] },
      { topic: "forced_labor", q: "Chenguang Biotech Xinjiang forced labor paprika", include: [...RESEARCH, ...NEWS] },
      { topic: "supply_chain", q: "Chenguang Biotech paprika oleoresin supply chain Xinjiang spice", include: [] },
    ],
  },
  xpcc: {
    names: ["xinjiang production and construction corps", "xpcc", "bingtuan"],
    selfDomains: ["bingtuan.gov.cn"],
    queries: [
      { topic: "sanctions", q: "Xinjiang Production and Construction Corps OFAC Global Magnitsky sanctions", include: [...OFFICIAL, ...NEWS] },
      { topic: "forced_labor", q: "XPCC cotton Withhold Release Order CBP", include: [...OFFICIAL, ...NEWS] },
      { topic: "forced_labor", q: "Xinjiang Production and Construction Corps forced labor cotton supply chain brands", include: [...RESEARCH, ...NEWS] },
    ],
  },
};

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const kindOf = (h, self) =>
  self.some((d) => h.endsWith(d)) ? "company_says" :
  OFFICIAL.some((d) => h.endsWith(d)) ? "official" :
  RESEARCH.some((d) => h.endsWith(d)) ? "research" :
  NEWS.some((d) => h.endsWith(d)) ? "news" : "other";

mkdirSync(join(root, "data", "evidence"), { recursive: true });
for (const [slug, c] of Object.entries(COMPANIES)) {
  const out = { company: slug, fetched_at: new Date().toISOString(), results: [] };
  const seen = new Set();
  for (const q of c.queries) {
    const body = { query: q.q, search_depth: "advanced", max_results: 6 };
    if (q.include.length) body.include_domains = q.include;
    if (q.time_range) body.time_range = q.time_range;
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    for (const r of d.results || []) {
      if (seen.has(r.url)) continue;
      const text = `${r.title} ${r.content}`.toLowerCase();
      const mentions = c.names.some((n) => text.includes(n));
      if (!mentions) continue; // keep only results that name the company
      seen.add(r.url);
      const h = host(r.url);
      out.results.push({
        topic: q.topic, query: q.q, title: r.title, url: r.url, source: h,
        kind: kindOf(h, c.selfDomains), published: r.published_date || null,
        score: r.score, snippet: r.content.replace(/\s+/g, " ").slice(0, 400),
      });
    }
  }
  writeFileSync(join(root, "data", "evidence", `${slug}.json`), JSON.stringify(out, null, 2));
  const kinds = out.results.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
  console.log(`${slug}: ${out.results.length} results`, JSON.stringify(kinds));
  for (const r of out.results) console.log(`  [${r.kind}] ${r.title.slice(0, 80)} | ${r.source}`);
}
