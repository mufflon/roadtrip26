// Dependency-free data validator. Runs as `npm run check`, as the first step of
// `npm run build`, and as the first step of the deploy workflow. A bad commit
// exits non-zero here, the build never publishes, and the live site keeps
// serving the last good deploy.

import { SITES, TIERS } from "../data/sites.js";
import { TRAILS } from "../data/trails.js";

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

function checkCommon(list, label, { tiers } = {}) {
  const seen = new Set();
  const ids = new Set(list.map((e) => e.id));

  list.forEach((e, i) => {
    const at = `${label}[${i}]${e.id ? ` "${e.id}"` : ""}`;

    if (!e.id) err(at, "missing id");
    else if (seen.has(e.id)) err(at, `duplicate id "${e.id}"`);
    else seen.add(e.id);

    if (!e.name) err(at, "missing name");

    if (tiers) {
      if (!e.tier) err(at, "missing tier");
      else if (!tiers.has(e.tier)) err(at, `tier "${e.tier}" is not defined in TIERS`);
    }

    const hasLat = e.lat != null;
    const hasLng = e.lng != null;
    if (hasLat && (typeof e.lat !== "number" || e.lat < -90 || e.lat > 90))
      err(at, `latitude ${e.lat} is outside ±90`);
    if (hasLng && (typeof e.lng !== "number" || e.lng < -180 || e.lng > 180))
      err(at, `longitude ${e.lng} is outside ±180`);

    // Note: coordsApprox is allowed alongside real coordinates. It means the pin
    // is a real but approximate stand-in that should be refined (e.g. josefov,
    // whose pin lands in the fortress district rather than the entrance), which
    // is the field's documented meaning.

    // Cross-links must point at an existing id in the same list.
    for (const field of ["bailout", "sameTrailheadAs"]) {
      if (e[field] != null && !ids.has(e[field]))
        err(at, `${field} "${e[field]}" points at an id that does not exist`);
    }
  });
}

const tierIds = new Set(TIERS.map((t) => t.id));
checkCommon(SITES, "sites", { tiers: tierIds });
checkCommon(TRAILS, "trails");

if (errors.length) {
  console.error(`\n✗ Data check failed (${errors.length} problem${errors.length > 1 ? "s" : ""}):\n`);
  for (const e of errors) console.error("  - " + e);
  console.error("");
  process.exit(1);
}

console.log(`✓ Data check passed: ${SITES.length} sites, ${TRAILS.length} trails.`);
