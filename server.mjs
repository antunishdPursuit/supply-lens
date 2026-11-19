// Supply Lens local preview server: serves the site from public/ and the cached data from data/.
// Usage: node server.mjs   then open http://localhost:3000
// The site is fully static; for publishing, run node scripts/build-static.mjs instead.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, relative, extname, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
const PUBLIC = ["public", "data"]; // only these folders are ever served

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (p === "/") p = "/public/index.html";
    else if (!p.startsWith("/data/") && !p.startsWith("/public/")) p = "/public" + p;
    const file = normalize(join(root, p));
    if (!PUBLIC.includes(relative(root, file).split(sep)[0])) { res.writeHead(403); return res.end("forbidden"); }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(e.code === "ENOENT" ? 404 : 500);
    res.end(e.code === "ENOENT" ? "not found" : "error");
  }
}).listen(PORT, () => console.log(`Supply Lens on http://localhost:${PORT}`));
