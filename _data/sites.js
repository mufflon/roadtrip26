// Two-line re-export so Eleventy can read the source of truth from data/.
// The source data files are not moved or restructured.
import { SITES, TIERS, HOURS_CHECKED } from "../data/sites.js";
import { enrichSites } from "../data/enrich.js";

export default { SITES: enrichSites(SITES, TIERS), TIERS, HOURS_CHECKED };
