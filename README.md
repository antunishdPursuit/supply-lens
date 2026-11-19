# Supply Lens

Supply Lens is a story website that shows, in plain language, how ordinary supply chains connect to companies on government lists for forced labour or sanctions. It follows three cases step by step on a map:

1. **Paprika**: a US spice brand, three trade steps from a company on the US forced-labour (UFLPA) list.
2. **Shipping**: a London shipping office with no alerts in trade data, owned by a company sanctioned in nine jurisdictions.
3. **Cotton**: a Xinjiang cotton conglomerate on both kinds of list, whose subsidiaries carry neither sanction.

Each case compares three kinds of evidence (trade data, ownership records and the open web) and shows where they disagree. Every numbered claim links to its sources on the Sources page.

## Data

All data is cached; the site makes no live data calls.

- `data/tradeverifyd/`: company records, trade relationships, ownership links and stored government listings, pulled from Tradeverifyd on 19 November 2026.
- `data/sayari/`: ownership and risk-factor details read from Sayari Graph on 19 November 2026.
- `data/evidence/`: web search results retrieved with Tavily on 19 November 2026 (`scripts/fetch-evidence.mjs`, which needs a `TAVILY_API_KEY` in `.env`).

Listings are records stored by these providers, not a live sanctions screening. A trade or ownership link shows a connection, not proof that a particular product involved forced labour.

## Run locally

Requires Node.js 18 or later. No dependencies to install.

```bash
node server.mjs
```

Then open http://localhost:3000.

## Publish

`node scripts/build-static.mjs` writes the static site to `dist/`. The GitHub Actions workflow in `.github/workflows/pages.yml` runs this on every push to `main` and deploys `dist/` to GitHub Pages.

Built at the NYU × Microsoft Ethical Tech Hackathon, 19 November 2026.
