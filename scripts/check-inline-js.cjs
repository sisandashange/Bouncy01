const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const htmlPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let checked = 0;

for (let i = 0; i < blocks.length; i += 1) {
  const attributes = blocks[i][1] || "";
  const source = blocks[i][2] || "";
  if (/\bsrc\s*=/.test(attributes)) continue;

  const typeMatch = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i);
  const type = (typeMatch?.[1] || "").toLowerCase();
  if (type && type !== "module" && type !== "text/javascript" && type !== "application/javascript") {
    continue;
  }

  const extension = type === "module" ? ".mjs" : ".js";
  const tempPath = path.join(os.tmpdir(), "bouncy-inline-" + (i + 1) + extension);
  fs.writeFileSync(tempPath, source, "utf8");
  const result = spawnSync(process.execPath, ["--check", tempPath], { encoding: "utf8" });
  fs.rmSync(tempPath, { force: true });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "Inline JavaScript syntax check failed.\n");
    process.exit(result.status || 1);
  }
  checked += 1;
}

if (checked === 0) {
  throw new Error("No inline JavaScript blocks were checked.");
}
console.log("Validated " + checked + " inline JavaScript block(s).");
