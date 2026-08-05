// Two-line re-export so Eleventy can read the source of truth from data/.
import { TRAILS, EXCLUDED, HOURS_CHECKED } from "../data/trails.js";
import { enrichTrails } from "../data/enrich.js";

export default { TRAILS: enrichTrails(TRAILS), EXCLUDED, HOURS_CHECKED };
