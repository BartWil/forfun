// Keep index.html's meta description honest about how many stations exist.
//
// It said "Ten interactive stations" long after there were fifteen. A number in
// prose is a second catalogue in miniature, so it is generated like the README.
//
//   node scripts/sync_meta.mjs           rewrite it
//   node scripts/sync_meta.mjs --check   fail if it is stale
//
// tests/science.test.mjs runs the --check form.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => readFileSync(join(ROOT, f), "utf8");

const STATIONS = new Function(
  "var self={},module={};" + read("stations.js") + "; return self.STATIONS || module.exports;")();

const n = STATIONS.list.filter(s => !s.hidden).length;
const DESC = `${n} interactive stations exploring the forces, joint angles and muscle ` +
  `activity behind walking, running, jumping and lifting, and how far each number can be trusted.`;

const target = join(ROOT, "index.html");
const cur = readFileSync(target, "utf8");
const re = /(<meta name="description" content=")([^"]*)(")/;
if (!re.test(cur)) { console.error("no meta description in index.html"); process.exit(1); }

const next = cur.replace(re, (_, a, __, c) => a + DESC + c);

if (process.argv.includes("--check")) {
  if (cur !== next) {
    console.error("index.html meta description is stale. Run: node scripts/sync_meta.mjs");
    process.exit(1);
  }
  console.log("meta description is current (%d stations)", n);
} else {
  writeFileSync(target, next);
  console.log("meta description synced (%d stations)", n);
}
