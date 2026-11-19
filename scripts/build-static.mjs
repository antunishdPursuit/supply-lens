// Assemble the static site (pages + cached data) into dist/ for GitHub Pages.
// Usage: node scripts/build-static.mjs
import { cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "public"), dist, { recursive: true });
for (const folder of ["tradeverifyd", "sayari", "evidence"]) {
  cpSync(join(root, "data", folder), join(dist, "data", folder), { recursive: true });
}
writeFileSync(join(dist, ".nojekyll"), ""); // serve files as-is
console.log("Static site written to dist/");
