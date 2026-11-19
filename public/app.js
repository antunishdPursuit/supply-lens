// Supply Lens: page routing, step-by-step case stories on a map, saved web evidence and a footnoted sources page.
(async function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const getJSON = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? u : null); // only render http(s) links from third-party data
  const onDomain = (h, d) => h === d || h.endsWith("." + d);
  const cleanText = (s) => String(s || "").replace(/[#*_`>|]+/g, " ").replace(/\s+/g, " ").trim();

  // ---------------- Data ----------------
  const [tvSov, tvCg, tvXp, saCg, saXp, evSov, evCg, evXp] = await Promise.all([
    "data/tradeverifyd/sovcomflot.json", "data/tradeverifyd/chenguang.json", "data/tradeverifyd/xpcc.json",
    "data/sayari/chenguang.json", "data/sayari/xpcc.json",
    "data/evidence/sovcomflot.json", "data/evidence/chenguang.json", "data/evidence/xpcc.json",
  ].map(getJSON));
  const EV = { sovcomflot: evSov, chenguang: evCg, xpcc: evXp };
  const notMerged = (d) => !/BIS/.test(d.list); // Chenguang's BIS entries belong to Beijing Tsingke Biotech
  const sovSubs = tvSov?.subsidiaries || [];
  const count = (arr, f) => (arr || []).filter(f).length;
  const NAMES = { US: "United States", GB: "United Kingdom", EU: "European Union", CH: "Switzerland", CA: "Canada", AU: "Australia", NZ: "New Zealand", UA: "Ukraine", MC: "Monaco" };
  const sovIssuers = (() => {
    const m = new Map();
    (tvSov?.designations || []).forEach((d) => { const c = d.issuer_country; if (!NAMES[c]) return; const prev = m.get(c); if (!prev || (d.date && (!prev || d.date < prev))) m.set(c, d.date || prev || null); });
    return [...m].map(([c, date]) => ({ c, name: NAMES[c], date })).sort((a, b) => (a.date || "9") < (b.date || "9") ? -1 : 1);
  })();
  // Counts come from the cached files; "n/a" shows if a file failed to load (a real 0 is kept as 0).
  const NA = "n/a";
  const N = {
    cgFl: saCg ? count(saCg.risk_factors, (r) => r.category === "Forced labor") : NA,
    sovIss: tvSov ? sovIssuers.length : NA,
    sovZero: tvSov ? count(sovSubs, (s) => s.annotation_count === 0) : NA,
    sovTotal: tvSov ? tvSov.subsidiaries_total ?? sovSubs.length : NA,
    xpSubs: tvXp?.subsidiaries_total ?? NA,
    xpRf: saXp?.risk_factors?.length ?? NA,
    xpOfficial: evXp ? count(evXp.results, (r) => r.kind === "official") : NA,
  };

  // ---------------- Claims (footnotes) ----------------
  const KIND_ORDER = ["official", "research", "news", "other", "company_says", "provider"];
  const KIND_LABEL = { official: "official", research: "research", news: "news", other: "other", company_says: "company says", provider: "data record" };
  const kindOf = (k) => (KIND_LABEL[k] ? k : "other"); // allowlist: kinds become CSS classes
  const fixTitle = (r) => { const t = cleanText(r.title).replace(/^\d+\s+/, ""); return t.length > 3 ? t : `${r.source || host(r.url)} page`; };
  const fmtET = (iso) => { const d = new Date(iso); return isNaN(d) ? "19 Nov 2026" : d.toLocaleString("en-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) + " ET"; };
  const fmtDate = (s) => { const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
  const fromEv = (ev, test) => (ev?.results || []).filter(test).map((r) => ({ kind: kindOf(r.kind), title: fixTitle(r), url: safeUrl(r.url), source: r.source || host(r.url), when: (r.published ? `published ${fmtDate(r.published)}, ` : "") + `retrieved ${fmtET(ev.fetched_at)}` }));
  const hostIn = (...hs) => (r) => hs.some((h) => onDomain(r.source || host(r.url), h));
  const desig = (tv, test) => (tv?.designations || []).filter(test).filter((d) => d.url).map((d) => ({ kind: /opensanctions/.test(d.url) ? "research" : "official", title: `${d.name}${/opensanctions/.test(d.url) ? " (dataset mirror)" : ""}`, url: safeUrl(d.url), source: host(d.url), when: d.date ? `listing dated ${fmtDate(d.date)}` : "" }));
  const provider = (title) => ({ kind: "provider", title });
  const CLAIMS = [
    { id: "c-route", case: 1, text: "Trade links run McCormick ← Pearl Group ← Plant Lipids ← Chenguang Biotech.", ev: () => [provider("Tradeverifyd trade records, found by tracing suppliers of McCormick's record (labelled \"Banrion, LLC\"), pulled 19 Nov 2026.")] },
    { id: "c-uflpa", case: 1, text: "Chenguang Biotech Group is on the US UFLPA Entity List, added 2 August 2023.", ev: () => [...fromEv(evCg, hostIn("dhs.gov", "federalregister.gov", "ustr.gov")), ...desig(tvCg, (d) => d.list === "UFLPA")] },
    { id: "c-xinjiang", case: 1, text: "Chenguang owns at least five companies in Xinjiang, including in Yanqi and Hotan.", ev: () => [...fromEv(evCg, hostIn("shu.ac.uk", "c4ads.org", "opensanctions.org", "thebureauinvestigates.com")), provider("Sayari Graph ownership records for Chenguang Biotech Group (13 subsidiaries), read 19 Nov 2026.")] },
    { id: "c-tsingke", case: 1, text: "The export-control (Entity List) entry in Chenguang's trade-data record belongs to a different company, Beijing Tsingke Biotech.", ev: () => [{ kind: "official", title: "BIS Entity List (Supplement No. 4 to Part 744): entry for Beijing Tsingke Biotech Co., Ltd.", url: "https://www.bis.gov/regulations/ear/744#supplement-4-744", source: "bis.gov" }, provider("Tradeverifyd record for Chenguang lists Tsingke names among its aliases; Sayari lists no Entity List flag for Chenguang.")] },
    { id: "c-sov-uk-clean", case: 2, text: "Trade data shows no alerts for Sovcomflot (UK) Ltd.", ev: () => [provider("Tradeverifyd record for SOVCOMFLOT (UK) LTD (UK company number 02700093): 0 annotations, pulled 19 Nov 2026.")] },
    { id: "c-sov-owner", case: 2, text: "Sovcomflot (UK) Ltd is 100% owned by PAO Sovcomflot and carries 12 sanctions risk factors passed down from it (Sayari).", ev: () => [...fromEv(evSov, (r) => /\(uk\)/i.test(r.title)), provider("Sayari Graph profile of SOVCOMFLOT (UK) LTD: shareholder PAO Sovcomflot 100% as of 15 Oct 2026; 17 risk factors.")] },
    { id: "c-sov-sanctioned", case: 2, text: `PAO Sovcomflot is sanctioned in ${N.sovIss} jurisdictions, starting February 2022.`, ev: () => [...fromEv(evSov, hostIn("treasury.gov")), ...desig(tvSov, () => true)] },
    { id: "c-sov-subs", case: 2, text: `${N.sovZero} of the ${N.sovTotal} companies Sovcomflot owns show no alerts of their own in trade data.`, ev: () => [provider("Tradeverifyd ownership links for Sovcomflot (record \"SCF\"), each subsidiary checked for annotations, pulled 19 Nov 2026.")] },
    { id: "c-sov-uk-sanction", case: 2, text: "Lloyd's List reports the UK sanctioned Sovcomflot's UK business and froze parts of its assets.", ev: () => fromEv(evSov, hostIn("lloydslist.com", "reuters.com")) },
    { id: "c-xp-units", case: 3, text: `XPCC was founded in 1954; its units include prisons and a public security bureau; Sayari shows ${N.xpRf} risk factors.`, ev: () => [...fromEv(evXp, hostIn("opensanctions.org")), provider("Sayari Graph profile of the Xinjiang Production and Construction Corps (incorporated 1954-08-06), with search results listing XPCC prison and public security bureau units, read 19 Nov 2026.")] },
    { id: "c-xp-ofac", case: 3, text: "The US Treasury sanctioned XPCC in 2020 under its Global Magnitsky human-rights programme.", ev: () => [...fromEv(evXp, hostIn("treasury.gov", "state.gov")), ...desig(tvXp, (d) => /OFAC/.test(d.list))] },
    { id: "c-xp-el", case: 3, text: "XPCC was added to the US export-control Entity List in June 2021.", ev: () => desig(tvXp, (d) => /BIS/.test(d.list)) },
    { id: "c-xp-wro", case: 3, text: "US Customs ordered XPCC cotton held at the border in November 2020.", ev: () => [...fromEv(evXp, hostIn("cbp.gov", "reuters.com", "congress.gov")), ...desig(tvXp, (d) => /CBP/.test(d.list))] },
    { id: "c-xp-uflpa", case: 3, text: "XPCC is on the UFLPA Entity List, from June 2022.", ev: () => [...fromEv(evXp, hostIn("dhs.gov")), ...desig(tvXp, (d) => d.list === "UFLPA")] },
    { id: "c-xp-cotton", case: 3, text: "XPCC sells raw cotton to Xinjiang Tianshan Textile, itself on the UFLPA list.", ev: () => [provider("Tradeverifyd trade relationship XPCC → Xinjiang Tianshan Textile Co., HS 520100 (raw cotton), pulled 19 Nov 2026.")] },
    { id: "c-xp-subs", case: 3, text: `Trade data lists ${N.xpSubs} XPCC subsidiaries; none of those checked carries XPCC's sanctions.`, ev: () => [provider("Tradeverifyd ownership links for XPCC; 25 subsidiaries checked for annotations, pulled 19 Nov 2026.")] },
  ];
  const fnNum = Object.fromEntries(CLAIMS.map((c, i) => [c.id, i + 1]));
  const fn = (...ids) => ids.map((id) => `<sup class="fn"><a href="#/sources/${id}" title="See the source">${fnNum[id]}</a></sup>`).join("");

  // ---------------- Map points ----------------
  const P = {
    mcc: { c: [-76.64, 39.49], t: "McCormick", s: "Maryland, US", k: "plain", info: "Spice company. The brand at the end of this chain." },
    pearl: { c: [106.66, 10.76], t: "Pearl Group", s: "Vietnam", k: "plain", info: "Ships pepper and paprika to McCormick." },
    lipids: { c: [76.4, 10.0], t: "Plant Lipids", s: "Kerala, India", k: "plain", dx: -14, anchor: "end", info: "Makes spice extracts (oleoresins); buys from Chenguang." },
    cg: { c: [114.95, 36.78], t: "Chenguang Biotech", s: "Hebei, China", k: "fl", pulse: true, dx: -14, dy: -16, anchor: "end", info: "Natural-colourings maker. On the US UFLPA forced-labour list since 2 Aug 2023." },
    yanqi: { c: [86.57, 42.06], t: "Yanqi subsidiary", s: "Xinjiang · UFLPA list", k: "fl", info: "Chenguang Biotechnology Group Yanqi Co. Listed on the UFLPA list in its own right." },
    hotan: { c: [79.92, 37.11], t: "Hotan subsidiary", s: "Xinjiang", k: "fl", label: false, info: "Hotan Chenguang Biotech Co. (from Sayari ownership records)." },
    shache: { c: [77.24, 38.42], t: "Shache unit", s: "Xinjiang", k: "fl", label: false, info: "Chenguang Biotech Group Shache Co. (seen in Sayari search results)." },
    london: { c: [-0.09, 51.52], t: "Sovcomflot (UK) Ltd", s: "London", k: "zero", dx: -14, anchor: "end", info: "Ship-services company at 1 Finsbury Square. No alerts in trade data." },
    moscow: { c: [37.62, 55.75], t: "PAO Sovcomflot", s: "Moscow · sanctioned", k: "sx", pulse: true, info: `Russia's largest shipping company, state-controlled. Sanctioned in ${N.sovIss} jurisdictions.` },
    liberia: { c: [-10.8, 6.3], t: "Liberia", s: "ship-owning subsidiaries", k: "zero", dx: -14, anchor: "end", info: "Several Sovcomflot ship-owning companies are registered here. No alerts of their own." },
    cyprus: { c: [33.4, 35.1], t: "Cyprus", s: "subsidiaries", k: "zero", info: "Sovcomflot (Cyprus) Ltd and others. No alerts of their own." },
    xpcc: { c: [87.62, 43.83], t: "XPCC", s: "Urumqi, Xinjiang", k: "both", pulse: true, info: "Xinjiang Production and Construction Corps. US sanctions + UFLPA list + customs order on its cotton." },
  };
  const COLOR = { plain: "#14202e", fl: "#c8423b", sx: "#dc9a2c", both: "#7b4fd6", zero: "#2a9d8f" };
  const ISO = { US: [840], GB: [826], CH: [756], CA: [124], AU: [36], NZ: [554], UA: [804], MC: [492], RU: [643], CN: [156],
    EU: [40, 56, 100, 191, 196, 203, 208, 233, 246, 250, 276, 300, 348, 372, 380, 428, 440, 442, 470, 528, 616, 620, 642, 703, 705, 724, 752] };
  const B = (a, b) => [a, b];
  const WORLD = B([-130, -35], [160, 66]);
  const CHAIN_ROUTE = [["pearl", "mcc"], ["lipids", "pearl"], ["cg", "lipids", "fl"]];
  const sovIssCodes = sovIssuers.map((i) => i.c);

  // ---------------- Cases and steps ----------------
  const toggle = (modes) => `<div class="toggle3" role="group" aria-label="Choose a source">${modes.map((m, i) => `<button type="button" data-mode="${m[0]}" class="${i === 0 ? "on" : ""}" aria-pressed="${i === 0}">${m[1]}</button>`).join("")}</div><div class="seen" id="seen"></div>`;
  const SRC_MODES = [["trade", "⛓️ Trade data"], ["ownership", "🌳 Ownership"], ["web", "🔎 The web"]];
  const CASES = [
    { num: 1, id: "paprika", name: "Paprika", icon: "🌶️", tag: ["fl", "Forced labour"], hook: "A US spice brand, three trade steps from a company on the US forced-labour list.",
      chain: [["McCormick", "plain"], ["Pearl Group", "plain"], ["Plant Lipids", "plain"], ["Chenguang", "fl"], ["Xinjiang", "fl"]],
      steps: [
        { chain: 0, map: { fit: B([-128, 22], [-62, 52]), pts: ["mcc"] }, html: () => `<h2>It starts on a kitchen shelf</h2><p><b>McCormick</b>, based in Maryland, is one of the world's largest spice companies. Trade records show which companies ship goods to it.${fn("c-route")}</p><details class="more"><summary>Why does the record have an odd name?</summary>In the trade data, McCormick's main record is labelled "Banrion, LLC". Matching companies by name alone misses things like this.</details><p>Press <b>Next</b> to follow its paprika back to the source.</p>` },
        { chain: 1, map: { fit: B([-100, 2], [124, 52]), pts: ["mcc", "pearl"], arcs: CHAIN_ROUTE.slice(0, 1) }, html: () => `<h2>Step 1: Vietnam</h2><p><b>Pearl Group Corporation</b> in Vietnam ships pepper and paprika to McCormick.</p><details class="more"><summary>Product details</summary>Customs product code HS 0904: pepper, and dried or ground capsicum (paprika).</details>` },
        { chain: 2, map: { fit: B([-100, 2], [124, 52]), pts: ["mcc", "pearl", "lipids"], arcs: CHAIN_ROUTE.slice(0, 2) }, html: () => `<h2>Step 2: India</h2><p>Pearl Group buys <b>oleoresins</b>, concentrated spice extracts that give food colour and flavour, from <b>Plant Lipids</b> in Kerala, India.</p><details class="more"><summary>Product details</summary>Customs product code HS 3301.90: extracted oleoresins.</details>` },
        { chain: 3, map: { fit: B([-100, 2], [124, 52]), pts: ["mcc", "pearl", "lipids", "cg"], arcs: CHAIN_ROUTE }, html: () => `<h2>Step 3: China</h2><p>Plant Lipids buys oleoresins from <b>Chenguang Biotech Group</b>, a maker of natural food colourings in Hebei, China.</p><div class="badges"><span class="badge fl">On the US forced-labour (UFLPA) list since 2 Aug 2023${fn("c-uflpa")}</span></div><p class="caveat">This shows trade connections between companies. It does not show that a particular jar contains paprika made with forced labour.</p><details class="more"><summary>What is the UFLPA list?</summary>Under the Uyghur Forced Labor Prevention Act, US customs stops goods made in Xinjiang, or by companies on this list, unless the importer proves no forced labour was used. The Department of Homeland Security keeps the list.</details>` },
        { chain: 4, map: { fit: B([70, 24], [124, 48]), home: ["CN"], pts: ["cg", "yanqi"], arcs: [["cg", "yanqi", "own"]] },
          modes: {
            trade: { map: { pts: ["cg", "yanqi"], arcs: [["cg", "yanqi", "own"]] }, text: () => `<b>Trade data</b> lists Chenguang on the UFLPA list and links one subsidiary, in Yanqi, Xinjiang, which is listed too. It also showed an export-control listing that belongs to a different company merged into the same record. We removed it.${fn("c-tsingke")}` },
            ownership: { map: { pts: ["cg", "yanqi", "hotan", "shache"], arcs: [["cg", "yanqi", "own"], ["cg", "hotan", "own"], ["cg", "shache", "own"]] }, text: () => `<b>Ownership data</b> shows Chenguang owns at least <b>five companies in Xinjiang</b>, such as in Yanqi and Hotan, and flags <b>${N.cgFl}</b> forced-labour risk factors.${fn("c-xinjiang")}` },
            web: { map: { pts: ["cg"], arcs: [] }, text: () => `<b>The web</b> turned up the government list entry, two Federal Register notices and university research naming Chenguang.${fn("c-uflpa")}` },
          },
          html: () => `<h2>What each source saw</h2><p>Switch between sources to see what each one adds to the map.</p>${toggle(SRC_MODES)}<p class="payoff">Three trade steps separate a US spice brand from a company the US blocks at its border.</p>` },
      ] },
    { num: 2, id: "shipping", name: "Shipping", icon: "🚢", tag: ["sx", "Sanctions"], hook: `A London shipping office with no alerts, owned by a company sanctioned in ${N.sovIss} jurisdictions.`,
      chain: [["London office", "zero"], ["Moscow owner", "sx"], [`${N.sovIss} jurisdictions`, "sx"], [`${N.sovTotal} companies`, "zero"]],
      steps: [
        { chain: 0, map: { fit: B([-11, 49], [6, 57]), pts: ["london"] }, html: () => `<h2>An office in London</h2><p><b>Sovcomflot (UK) Ltd</b> provides ship services from an office at 1 Finsbury Square, London.</p><div class="badges"><span class="badge zero">Trade data: no alerts for this company${fn("c-sov-uk-clean")}</span></div><p>Checked on its own, it looks like any other shipping firm.</p>` },
        { chain: 1, map: { fit: B([-12, 44], [48, 62]), pts: ["london", "moscow"], arcs: [["moscow", "london", "own"]] }, html: () => `<h2>Who owns it?</h2><div class="flow"><div class="fbox sx">PAO Sovcomflot<small>Moscow</small></div><div class="fline">owns 100%</div><div class="fbox zero">Sovcomflot (UK) Ltd<small>London</small></div></div><p><b>PAO Sovcomflot</b> is Russia's largest shipping company, controlled by the Russian state.${fn("c-sov-owner")}</p>` },
        { chain: 2, map: { fit: WORLD, issuers: sovIssCodes, home: ["RU"], pts: ["moscow"] }, html: () => `<h2>Sanctioned in ${N.sovIss} jurisdictions</h2><p class="big"><span class="count" data-to="${N.sovIss}">0</span><small>governments and blocs</small></p><ul class="jlist">${sovIssuers.map((i) => `<li><b>${esc(i.name)}</b> <span>${i.date ? esc(i.date.slice(0, 7)) : ""}</span></li>`).join("")}</ul><p>Each bans its citizens and businesses from dealing with the company.${fn("c-sov-sanctioned")}</p><details class="more"><summary>What does "sanctioned" mean?</summary>Governments freeze a sanctioned company's assets and forbid dealings with it. Under the US "50 percent rule", companies owned 50% or more by sanctioned parties are treated as blocked too, even if they are not named on the list.</details>` },
        { chain: 3, tree: true, map: { fit: B([-22, 0], [62, 62]), pts: ["moscow", "london", "liberia", "cyprus"], arcs: [["moscow", "london", "own"], ["moscow", "liberia", "own"], ["moscow", "cyprus", "own"]] }, html: () => `<h2>A family without alerts</h2><p class="big"><span class="count" data-to="${N.sovZero}">0</span><small>of ${N.sovTotal} companies it owns show no alerts</small></p><svg id="tree" viewBox="0 0 400 170" role="img" aria-label="Sovcomflot and the companies it owns"></svg><div class="legend"><span><i style="background:#2a9d8f"></i>No alerts of its own</span><span><i style="background:#dc9a2c"></i>Has alerts</span></div><p>Many are ship-owning companies registered in Liberia and Cyprus. Hover a dot to see its name.${fn("c-sov-subs")}</p>` },
        { chain: 3, map: { fit: B([-25, 30], [62, 64]), pts: ["london"] },
          modes: {
            trade: { map: { pts: ["london"], arcs: [], issuers: [] }, text: () => `<b>Trade data</b> shows no alerts for Sovcomflot (UK) Ltd.${fn("c-sov-uk-clean")}` },
            ownership: { map: { pts: ["london", "moscow"], arcs: [["moscow", "london", "own"]], issuers: [] }, text: () => `<b>Ownership data</b> shows <b>12 sanctions risk factors</b> passed down through 100% ownership, such as "majority owned by a US-sanctioned company".${fn("c-sov-owner")}` },
            web: { map: { pts: ["london", "moscow"], arcs: [["moscow", "london", "own"]], issuers: ["GB"] }, text: () => `<b>The web</b>: Lloyd's List reports the UK sanctioned Sovcomflot's UK business and froze parts of its assets.${fn("c-sov-uk-sanction")}` },
          },
          html: () => `<h2>What each source saw</h2><p>Switch between sources to see what each one adds.</p>${toggle(SRC_MODES)}<p class="payoff">Check only the company you deal with, and you can miss who owns it.</p>` },
      ] },
    { num: 3, id: "cotton", name: "Cotton", icon: "☁️", tag: ["both", "Forced labour + sanctions"], hook: "A Xinjiang cotton giant on both lists. None of the subsidiaries we checked carries its sanctions.",
      chain: [["XPCC", "both"], ["Tianshan Textile", "fl"], ["Yarn mills", "plain"]],
      steps: [
        { chain: 0, map: { fit: B([58, 22], [112, 52]), home: ["CN"], pts: ["xpcc"] }, html: () => `<h2>A state-run giant in Xinjiang</h2><p>The <b>Xinjiang Production and Construction Corps (XPCC)</b>, founded in 1954, runs farms, factories and whole towns across Xinjiang. Its units include prisons and a public security bureau.${fn("c-xp-units")}</p>` },
        { chain: 0, map: { fit: WORLD, issuers: ["US"], home: ["CN"], pts: ["xpcc"] }, html: () => `<h2>Sanctioned</h2><div class="badges"><span class="badge sx">US Treasury sanctions, 2020${fn("c-xp-ofac")}</span><span class="badge sx">US export-control Entity List, June 2021${fn("c-xp-el")}</span></div><p>The US Treasury sanctioned XPCC under its Global Magnitsky human-rights programme.</p>` },
        { chain: 0, map: { fit: WORLD, issuers: ["US"], home: ["CN"], pts: ["xpcc"] }, html: () => `<h2>And listed for forced labour</h2><div class="badges"><span class="badge fl">US customs order to hold its cotton, Nov 2020${fn("c-xp-wro")}</span><span class="badge fl">UFLPA list, June 2022${fn("c-xp-uflpa")}</span></div><details class="more"><summary>What is a customs hold order?</summary>A Withhold Release Order lets US Customs and Border Protection stop shipments at the border when there is evidence they were made with forced labour.</details>` },
        { chain: 1, map: { fit: B([58, 22], [112, 52]), home: ["CN"], pts: ["xpcc"] }, html: () => `<h2>Where its cotton goes</h2><div class="flow"><div class="fbox both">XPCC<small>sanctioned + UFLPA</small></div><div class="fline">raw cotton</div><div class="fbox fl">Xinjiang Tianshan Textile<small>UFLPA list · Urumqi</small></div><div class="fline">yarn</div><div class="fbox">Other mills<small>where our trade data stops</small></div></div><p>The data runs out one mill later. Brands face the same problem: the further back the chain, the harder it is to see.${fn("c-xp-cotton")}</p>` },
        { chain: 2, map: { fit: B([58, 22], [112, 52]), home: ["CN"], pts: ["xpcc"] },
          modes: {
            trade: { map: { issuers: [] }, text: () => `<b>Trade data</b> lists <b>${N.xpSubs}</b> XPCC subsidiaries. The ones we checked carry forced-labour research flags, but <b>none carries XPCC's sanctions</b>.${fn("c-xp-subs")}` },
            ownership: { map: { issuers: [] }, text: () => `<b>Ownership data</b> shows <b>${N.xpRf}</b> risk factors, with both sanctions and forced labour rated critical.${fn("c-xp-units")}` },
            web: { map: { issuers: ["US"] }, text: () => `<b>The web</b> turned up <b>${N.xpOfficial}</b> official sources, including the Treasury and customs announcements.${fn("c-xp-ofac", "c-xp-wro")}` },
          },
          html: () => `<h2>What each source saw</h2><p>Switch between sources to see what each one adds.</p>${toggle(SRC_MODES)}<p class="payoff">A subsidiary checked for sanctions alone can come back empty, even when its parent is on both lists.</p>` },
      ] },
  ];

  // ---------------- Home ----------------
  $("#caseCards").innerHTML = CASES.map((c) => `<a class="case-card" href="#/cases/${c.num}/1"><span class="num">${c.num}</span><span class="ico" aria-hidden="true">${c.icon}</span><h3>Case ${c.num} · ${c.name}</h3><span class="tag ${c.tag[0]}">${c.tag[1]}</span><p class="hook">${c.hook}</p><span class="go">Follow the ${c.name.toLowerCase()} →</span></a>`).join("");

  // ---------------- Tooltips ----------------
  const tip = $("#tip");
  const showTip = (x, y, html) => { tip.innerHTML = html; tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x + 14)) + "px"; tip.style.top = Math.max(8, Math.min(innerHeight - h - 8, y + 14)) + "px"; };
  const hideTip = () => (tip.hidden = true);
  const TERMS = {
    forced: "Work people are made to do under threat or coercion. Governments list companies tied to it so their goods can be stopped at the border.",
    sanction: "A government ban on dealing with a person, company or country, usually freezing assets and blocking payments.",
  };
  $$("dfn[data-term]").forEach((el) => {
    el.tabIndex = 0;
    const on = () => { const r = el.getBoundingClientRect(); showTip(r.left, r.top - 90, TERMS[el.dataset.term]); };
    el.addEventListener("mouseenter", on); el.addEventListener("focus", on);
    el.addEventListener("mouseleave", hideTip); el.addEventListener("blur", hideTip);
  });

  // ---------------- Map engine ----------------
  const svg = d3.select("#map");
  const gC = svg.append("g"), gA = svg.append("g"), gP = svg.append("g");
  const proj = d3.geoNaturalEarth1();
  const geo = d3.geoPath(proj);
  let W = 1200, H = 800, countries = null, mapReady = null, mapState = null, anim = null;
  const ids = (list) => new Set((list || []).flatMap((k) => ISO[k] || []));
  function initMap() { return (mapReady ??= loadWorld()); }
  async function loadWorld() {
    const feats = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then((r) => r.json()).then((t) => topojson.feature(t, t.objects.countries).features).catch(() => []);
    countries = gC.selectAll("path").data(feats).join("path").attr("class", "country");
    sizeMap(); const f = fitFor(WORLD); proj.scale(f.s).translate(f.t); redraw();
  }
  function sizeMap() { const st = $(".stage"); W = st.clientWidth || 1200; H = st.clientHeight || 800; svg.attr("viewBox", `0 0 ${W} ${H}`); }
  const wide = () => W > 860;
  function fitFor(b) {
    const ext = wide() ? [[510, 90], [W - 170, H - 80]] : [[30, 60], [W - 90, H * 0.45]];
    const p = d3.geoNaturalEarth1().fitExtent(ext, { type: "MultiPoint", coordinates: [b[0], b[1], [b[0][0], b[1][1]], [b[1][0], b[0][1]]] });
    return { s: p.scale(), t: p.translate() };
  }
  function arcPath(d) {
    const [ax, ay] = proj(d.from), [bx, by] = proj(d.to);
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(0.26 * len, 150), nx = -dy / len, ny = dx / len, sgn = ny > 0 ? -1 : 1;
    return `M${ax},${ay} Q${mx + nx * bend * sgn},${my + ny * bend * sgn} ${bx},${by}`;
  }
  function redraw() {
    if (countries) countries.attr("d", geo);
    gA.selectAll("path").attr("d", arcPath);
    gP.selectAll("g.pt").attr("transform", (d) => `translate(${proj(P[d].c)})`);
  }
  function applyMap(m, animate = true) {
    mapState = m;
    const iss = ids(m.issuers), home = ids(m.home);
    if (countries) countries.attr("class", (d) => "country" + (iss.has(+d.id) ? " issuer" : home.has(+d.id) ? " home" : ""));
    const pts = gP.selectAll("g.pt").data(m.pts || [], (d) => d);
    pts.exit().remove();
    const enter = pts.enter().append("g").attr("class", "pt").attr("transform", (d) => `translate(${proj(P[d].c)})`);
    enter.each(function (k) {
      const p = P[k], g = d3.select(this), col = COLOR[p.k];
      if (p.pulse) g.append("circle").attr("class", "halo").attr("r", 14).attr("fill", col);
      g.append("circle").attr("class", "dot").attr("r", 8).attr("fill", col);
      if (p.label !== false) {
        const dx = p.dx ?? 14, dy = p.dy ?? 0, an = p.anchor || "start";
        g.append("text").attr("x", dx).attr("y", dy - 2).attr("text-anchor", an).text(p.t);
        g.append("text").attr("class", "sub").attr("x", dx).attr("y", dy + 14).attr("text-anchor", an).text(p.s);
      }
      g.on("mousemove", (e) => showTip(e.clientX, e.clientY, `<b>${esc(p.t)}</b>${esc(p.info)}`)).on("mouseleave", hideTip)
        .on("click", (e) => showTip(e.clientX, e.clientY, `<b>${esc(p.t)}</b>${esc(p.info)}`));
    });
    const arcs = (m.arcs || []).map(([a, b, k]) => ({ key: a + ">" + b, k: k || "", from: P[a].c, to: P[b].c }));
    const as = gA.selectAll("path").data(arcs, (d) => d.key);
    as.exit().remove();
    as.enter().append("path").attr("class", (d) => "arc " + d.k).attr("d", arcPath);
    const to = fitFor(m.fit), from = { s: proj.scale(), t: proj.translate() };
    if (anim) { anim.stop(); anim = null; }
    if (!animate) { proj.scale(to.s).translate(to.t); redraw(); return; }
    const t0 = performance.now(), dur = 850, ease = d3.easeCubicInOut;
    anim = d3.timer(() => {
      const k = Math.min(1, (performance.now() - t0) / dur), e = ease(k);
      proj.scale(from.s + (to.s - from.s) * e).translate([from.t[0] + (to.t[0] - from.t[0]) * e, from.t[1] + (to.t[1] - from.t[1]) * e]);
      redraw(); if (k >= 1) { anim.stop(); anim = null; }
    });
    const mine = anim; // if animation frames are throttled (hidden tab), jump to the final view
    setTimeout(() => { if (anim === mine && anim) { anim.stop(); anim = null; proj.scale(to.s).translate(to.t); redraw(); } }, dur + 300);
  }
  addEventListener("resize", () => { if (!mapState || $("#page-cases").hidden) return; sizeMap(); applyMap(mapState, false); });

  // ---------------- Story card ----------------
  let cur = { c: 1, s: 1 }, playTimer = null;
  $("#caseTabs").innerHTML = CASES.map((c) => `<button type="button" data-case="${c.num}">${c.num} · ${c.name}</button>`).join("");
  $$("#caseTabs button").forEach((b) => b.addEventListener("click", () => { stopPlay(); go(+b.dataset.case, 1); }));
  function animateCounts(root) {
    // Show the final number first; count up only if animation frames actually run.
    $$(".count", root).forEach((el) => { const to = +el.dataset.to; el.textContent = to; const t0 = performance.now(); const tick = () => { const k = Math.min(1, (performance.now() - t0) / 900); el.textContent = Math.round(to * d3.easeCubicOut(k)); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  }
  function drawTree() {
    const el = $("#tree"); if (!el) return;
    const root = d3.hierarchy({ name: "PAO Sovcomflot", children: sovSubs.map((s) => ({ name: s.name, country: s.country, zero: s.annotation_count === 0, badges: s.badges })) });
    d3.tree().size([370, 120])(root);
    const t = d3.select(el).append("g").attr("transform", "translate(15,22)");
    t.selectAll("path").data(root.links()).join("path").attr("class", "link").attr("d", d3.linkVertical().x((d) => d.x).y((d) => d.y));
    const nodes = t.selectAll("g").data(root.descendants()).join("g").attr("transform", (d) => `translate(${d.x},${d.y})`);
    nodes.append("circle").attr("r", (d) => (d.depth ? 6 : 9)).attr("fill", (d) => (!d.depth ? "#dc9a2c" : d.data.zero ? "#2a9d8f" : "#dc9a2c"))
      .on("mousemove", (e, d) => showTip(e.clientX, e.clientY, `<b>${esc(d.data.name)}</b>${d.depth ? `${esc(d.data.country && d.data.country !== "XX" ? d.data.country : "country unknown")} · ${d.data.zero ? "no alerts of its own" : esc(Object.keys(d.data.badges || {}).join(", ") || "has alerts")}` : `Parent company · sanctioned in ${N.sovIss} jurisdictions`}`))
      .on("mouseleave", hideTip)
      .on("click", function (e) { this.dispatchEvent(new MouseEvent("mousemove", { clientX: e.clientX, clientY: e.clientY })); });
    nodes.filter((d) => !d.depth).append("text").attr("y", -14).attr("text-anchor", "middle").style("font-weight", 700).text("PAO Sovcomflot");
  }
  function render() {
    const C = CASES[cur.c - 1], S = C.steps[cur.s - 1];
    $$("#caseTabs button").forEach((b) => { const on = +b.dataset.case === cur.c; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    $("#chain").innerHTML = C.chain.map((n, i) => `${i ? '<span class="sep">→</span>' : ""}<button type="button" data-i="${i}" class="${n[1]} ${i <= S.chain ? "on" : ""}">${esc(n[0])}</button>`).join("");
    $$("#chain button").forEach((b) => b.addEventListener("click", () => { const i = +b.dataset.i; const idx = C.steps.findIndex((s) => s.chain >= i); stopPlay(); go(cur.c, (idx < 0 ? C.steps.length - 1 : idx) + 1); }));
    const card = $("#storyCard");
    card.innerHTML = `<p class="kicker">Case ${C.num} · ${C.name} · step ${cur.s} of ${C.steps.length}</p>${S.html()}`;
    card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
    card.scrollTop = 0;
    animateCounts(card);
    if (S.tree) drawTree();
    let map = S.map;
    if (S.modes) {
      const setMode = (m) => { $$(".toggle3 button", card).forEach((b) => { b.classList.toggle("on", b.dataset.mode === m); b.setAttribute("aria-pressed", b.dataset.mode === m); }); $("#seen").innerHTML = S.modes[m].text(); applyMap({ ...S.map, ...S.modes[m].map }); };
      $$(".toggle3 button", card).forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
      $("#seen").innerHTML = S.modes.trade.text(); map = { ...S.map, ...S.modes.trade.map };
    }
    applyMap(map);
    $("#dots").innerHTML = C.steps.map((_, i) => `<button type="button" aria-label="Step ${i + 1}"${i + 1 === cur.s ? ' class="on" aria-current="step"' : ""} data-s="${i + 1}"></button>`).join("");
    $$("#dots button").forEach((b) => b.addEventListener("click", () => { stopPlay(); go(cur.c, +b.dataset.s); }));
    const total = CASES.reduce((a, c) => a + c.steps.length, 0), done = CASES.slice(0, cur.c - 1).reduce((a, c) => a + c.steps.length, 0) + cur.s;
    $("#progressBar").style.width = (done / total) * 100 + "%";
    $("#prevBtn").disabled = cur.c === 1 && cur.s === 1;
    const last = cur.c === CASES.length && cur.s === C.steps.length;
    $("#nextBtn").textContent = cur.s === C.steps.length ? (last ? "Sources →" : `Case ${cur.c + 1} →`) : "Next →";
    hideTip();
  }
  let rendered = "";
  const go = (c, s) => { cur = { c, s }; rendered = `${c}/${s}`; render(); history.pushState(null, "", `#/cases/${c}/${s}`); };
  function next() {
    const C = CASES[cur.c - 1];
    if (cur.s < C.steps.length) go(cur.c, cur.s + 1);
    else if (cur.c < CASES.length) go(cur.c + 1, 1);
    else { stopPlay(); location.hash = "#/sources"; }
  }
  function prev() {
    if (cur.s > 1) go(cur.c, cur.s - 1);
    else if (cur.c > 1) go(cur.c - 1, CASES[cur.c - 2].steps.length);
  }
  function stopPlay() { clearInterval(playTimer); playTimer = null; const b = $("#playBtn"); b.textContent = "▶ Play"; b.classList.remove("playing"); b.setAttribute("aria-pressed", "false"); }
  $("#nextBtn").addEventListener("click", () => { stopPlay(); next(); });
  $("#prevBtn").addEventListener("click", () => { stopPlay(); prev(); });
  $("#playBtn").addEventListener("click", () => {
    if (playTimer) return stopPlay();
    $("#playBtn").textContent = "❚❚ Pause"; $("#playBtn").classList.add("playing"); $("#playBtn").setAttribute("aria-pressed", "true");
    playTimer = setInterval(() => { if (cur.c === CASES.length && cur.s === CASES[cur.c - 1].steps.length) return stopPlay(); next(); }, 6500);
  });
  addEventListener("keydown", (e) => {
    if ($("#page-cases").hidden) return;
    if (e.key === " " && e.target.closest("button, a, summary, input")) return; // let focused controls handle Space
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); stopPlay(); next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); stopPlay(); prev(); }
  });

  // ---------------- Web evidence (saved Tavily results) ----------------
  const linkHtml = (url, text) => (safeUrl(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text));
  const resultHtml = (r) => `<div class="res"><span class="pill p-${kindOf(r.kind)}">${KIND_LABEL[kindOf(r.kind)]}</span>${linkHtml(r.url, fixTitle(r))}<div class="meta">${esc(r.source || host(r.url))}${r.published ? ` · published ${esc(fmtDate(r.published))}` : ""} · retrieved ${esc(r.retrieved)}</div>${r.snippet ? `<p>${esc(cleanText(r.snippet).slice(0, 220))}…</p>` : ""}</div>`;
  function showResults(list, note) {
    let filterKind = "all";
    const kinds = [...new Set(list.map((r) => r.kind))].sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));
    const f = $("#filters"); f.hidden = !list.length;
    f.innerHTML = [["all", `All (${list.length})`], ...kinds.map((k) => [k, `${KIND_LABEL[k]} (${list.filter((r) => r.kind === k).length})`])].map(([k, l]) => `<button type="button" data-k="${k}" class="${k === "all" ? "on" : ""}">${l}</button>`).join("");
    $$("button", f).forEach((b) => b.addEventListener("click", () => { filterKind = b.dataset.k; $$("button", f).forEach((x) => x.classList.toggle("on", x === b)); paint(); }));
    const paint = () => { const shown = list.filter((r) => filterKind === "all" || r.kind === filterKind).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)); $("#results").innerHTML = `<p class="status">${note}</p>` + shown.map(resultHtml).join(""); };
    paint();
  }
  const showCase = (key) => {
    const ev = EV[key];
    $$("[data-ev]").forEach((b) => { b.classList.toggle("on", b.dataset.ev === key); b.setAttribute("aria-pressed", b.dataset.ev === key); });
    if (!Array.isArray(ev?.results)) { $("#filters").hidden = true; $("#results").innerHTML = `<p class="status">Saved results for this company could not be loaded.</p>`; return; }
    const list = ev.results.map((r) => ({ ...r, retrieved: fmtET(ev.fetched_at) }));
    showResults(list, `${list.length} sources that name ${esc($(`[data-ev="${key}"]`).textContent)}, retrieved with Tavily on ${esc(fmtET(ev.fetched_at))}. Tavily did not supply publication dates for these results; open each link to see when it was published.`);
  };
  $$("[data-ev]").forEach((b) => b.addEventListener("click", () => showCase(b.dataset.ev)));
  showCase("chenguang");

  // ---------------- Sources ----------------
  const dedupe = (list) => { const seen = new Set(); return list.filter((x) => { const k = (x.url || "") + "|" + x.title.toLowerCase().replace(/\W+/g, ""); const t = x.title.toLowerCase().replace(/\W+/g, ""); if (seen.has(k) || (x.kind !== "provider" && seen.has("t:" + t))) return false; seen.add(k); seen.add("t:" + t); return true; }); };
  $("#claims").innerHTML = CASES.map((C) => `<section class="case-claims"><h2>Case ${C.num} · ${C.name}</h2>${CLAIMS.filter((c) => c.case === C.num).map((c) => {
    const ev = dedupe(c.ev()).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    return `<div class="claim" id="${c.id}" tabindex="-1"><p class="ctext"><b>${fnNum[c.id]}</b>${esc(c.text)}</p><ul>${ev.map((x) => `<li><span class="pill p-${kindOf(x.kind)}">${KIND_LABEL[kindOf(x.kind)]}</span>${x.url ? `${linkHtml(x.url, x.title)} <span class="src">· ${esc(x.source)}${x.when ? " · " + esc(x.when) : ""}</span>` : esc(x.title)}</li>`).join("") || "<li>No linked source.</li>"}</ul></div>`;
  }).join("")}</section>`).join("");
  const lists = dedupe([...(tvSov?.designations || []), ...(tvCg?.designations || []).filter(notMerged), ...(tvXp?.designations || [])].filter((d) => d.url).map((d) => ({ kind: /opensanctions/.test(d.url) ? "research" : "official", title: d.name, url: d.url, source: host(d.url) })))
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.title.localeCompare(b.title));
  $("#listLinks").innerHTML = lists.map((x) => `<li>${linkHtml(x.url, x.title)} · ${esc(x.source)}${x.kind === "research" ? " (dataset mirror)" : ""}</li>`).join("");

  // ---------------- Router ----------------
  async function route() {
    const h = location.hash || "#/home", parts = h.replace(/^#\/?/, "").split("/");
    const page = ["cases", "search", "sources"].includes(parts[0]) ? parts[0] : "home";
    $$(".page").forEach((p) => (p.hidden = p.id !== "page-" + page));
    $$(".navlinks a").forEach((a) => a.classList.toggle("on", a.dataset.page === page));
    hideTip();
    if (page !== "cases") stopPlay();
    if (page === "cases") {
      const int = (v) => (/^\d+$/.test(v || "") ? +v : 1);
      const c = Math.min(CASES.length, Math.max(1, int(parts[1]))), s = Math.min(CASES[c - 1].steps.length, Math.max(1, int(parts[2])));
      cur = { c, s };
      await initMap(); sizeMap();
      if (!location.hash.startsWith("#/cases")) return; // user navigated away while the map loaded
      if (rendered !== `${c}/${s}` || !mapState) { rendered = `${c}/${s}`; render(); } else applyMap(mapState, false);
    } else if (page === "sources" && parts[1]) {
      const el = document.getElementById(parts[1]);
      if (el) { el.scrollIntoView({ block: "center" }); el.focus({ preventScroll: true }); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
    } else scrollTo(0, 0);
  }
  addEventListener("hashchange", route);
  addEventListener("popstate", route);
  route();
})();
