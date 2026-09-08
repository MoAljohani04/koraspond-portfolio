// Minimal static file server for local preview of this static site.
// Not used in production — the site deploys as plain files.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(ROOT, url === "/" ? "index.html" : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  // Clean URLs: /work/<cat>/<slug> is routed client-side by work.html.
  if (!fs.existsSync(file)) {
    const section = url.split("/").filter(Boolean)[0];
    const page = section && fs.existsSync(path.join(ROOT, `${section}.html`)) ? `${section}.html` : "index.html";
    file = path.join(ROOT, page);
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
