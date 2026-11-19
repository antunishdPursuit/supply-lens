// Assemble the static site (pages + the cached data files the site reads) into dist/ for GitHub Pages.
// Usage: node scripts/build-static.mjs
import { cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Keep this list in sync with the getJSON calls in public/app.js.
export const DATA_FILES = [
  "tradeverifyd/sovcomflot.json", "tradeverifyd/chenguang.json", "tradeverifyd/xpcc.json",
  "sayari/chenguang.json", "sayari/xpcc.json",
  "evidence/sovcomflot.json", "evidence/chenguang.json", "evidence/xpcc.json",
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "data"), { recursive: true });
cpSync(join(root, "public"), dist, { recursive: true });
for (const f of DATA_FILES) cpSync(join(root, "data", f), join(dist, "data", f));
writeFileSync(join(dist, ".nojekyll"), ""); // serve files as-is
console.log(`Static site written to dist/ (${DATA_FILES.length} data files)`);
