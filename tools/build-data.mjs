// Compile the human-authored YAML in content/ into data/sites.js and
// data/trails.js, which the rest of the toolchain (Eleventy, enrich.js,
// check-data.mjs) consumes. Those two .js files are GENERATED and gitignored —
// edit the YAML, not them.
//
// Entries are sorted deterministically by tier order, then latitude south →
// north (entries without coordinates sort last within their tier), then id.
// That is what makes the derived codes (A1, B4, T3 …) stable no matter which
// per-country file an entry lives in.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");

const readYaml = (path) => load(readFileSync(path, "utf8"));

// Read every *.yaml in a directory (ignoring files that start with "_") and
// concatenate their lists. File order does not matter — everything is re-sorted.
function readDir(dir) {
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f) && !f.startsWith("_"))
    .sort()
    .flatMap((f) => readYaml(join(dir, f)) || []);
}

const config = readYaml(join(contentDir, "config.yaml"));
const TIERS = config.tiers;
const HOURS_CHECKED = config.hoursChecked;
const EXCLUDED = config.excludedTrails || [];
const tierOrder = new Map(TIERS.map((t) => [t.id, t.order]));

const sites = readDir(join(contentDir, "sites"));
const trails = readDir(join(contentDir, "trails"));

function sortByGeo(list, useTier) {
  list.sort((a, b) => {
    if (useTier) {
      const ta = tierOrder.get(a.tier) ?? 999;
      const tb = tierOrder.get(b.tier) ?? 999;
      if (ta !== tb) return ta - tb;
    }
    const la = a.lat == null ? Infinity : a.lat;
    const lb = b.lat == null ? Infinity : b.lat;
    if (la !== lb) return la - lb;
    return String(a.id).localeCompare(String(b.id));
  });
}
sortByGeo(sites, true);
sortByGeo(trails, false);

function emit(file, source, consts) {
  let out =
    `// GENERATED FILE — do not edit by hand.\n` +
    `// Built from content/${source} by tools/build-data.mjs (npm run data / ./build.sh).\n` +
    `// Edit the YAML under content/ and re-run the build; this file is gitignored.\n`;
  for (const [name, value] of consts) {
    out += `\nexport const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  }
  writeFileSync(join(root, "data", file), out);
}

emit("sites.js", "sites/*.yaml + config.yaml", [
  ["HOURS_CHECKED", HOURS_CHECKED],
  ["SITES", sites],
  ["TIERS", TIERS]
]);
emit("trails.js", "trails/*.yaml + config.yaml", [
  ["HOURS_CHECKED", HOURS_CHECKED],
  ["TRAILS", trails],
  ["EXCLUDED", EXCLUDED]
]);

console.log(`✓ Built data/ from content/: ${sites.length} sites, ${trails.length} trails.`);
