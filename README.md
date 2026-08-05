# Budapest → Rostock, August 2026

A static reference site for a driving trip from Budapest north to the Rostock–Gedser
ferry. **There is no plan.** It is a filterable list of candidate stops plus a map,
built so that getting a chosen place into the car's navigation takes as few taps as
possible from a phone.

Two pages, one shared shell:

- **Sites** (`/`) — historical sites, from `data/sites.js`
- **Trails** (`/trails.html`) — candidate Slovak day hikes, from `data/trails.js`

Built with [Eleventy](https://www.11ty.dev/) v3 and deployed to GitHub Pages. No
backend, no database, no API keys. Leaflet + OpenStreetMap for the map; Google Maps is
used only for outbound links.

## Local workflow

The human-editable source is the YAML under [`content/`](content/README.md). A build
step compiles it into `data/sites.js` and `data/trails.js` (generated and gitignored),
which Eleventy and the map then consume.

```bash
npm install        # once
npm start          # regenerate data, then serve at http://localhost:8080/roadtrip26/
npm run data       # compile content/*.yaml -> data/*.js
./build.sh         # compile the data and validate it
npm run build      # data + validate + build into _site/ (not committed)
```

`npm start` and the production build both serve under the `/roadtrip26/` subpath (see
**Deployment** below), so the local URL includes it.

## Adding a place

Append **one entry** to the right YAML file under `content/` — sites go in
`content/sites/<COUNTRY>.yaml`, trails in `content/trails/`. Nothing else changes: the
code (`A1`, `B4`, `T3` …) is derived at build time from the tier and the entry's
latitude, so ordering is automatic and you never assign a code by hand. This is designed
to be doable from a phone in the GitHub web editor while travelling — a push triggers CI,
which regenerates `data/*.js` and redeploys.

Minimum viable site (four fields; everything else is optional and degrades silently):

```yaml
- id: short-slug
  name: Name
  tier: want
  lat: 50.0
  lng: 14.0
```

The full field list and copy-paste templates live in
[`content/README.md`](content/README.md). A few things worth knowing:

- **Leave `hoursVerified` out** if you have not personally checked the hours. That is
  the safe default — the row then reads "hours not confirmed" rather than asserting a
  time it does not know. Never set it `true` from a website alone.
- **Leave `wikipedia` out** and it falls back to a Wikipedia search on the name.
- **`closedDays`** is JS day numbers (`0` = Sunday). The weekday picker turns these into
  "probably closed" warnings — deliberately hedged, because hours change.
- **Tiers are data.** Add a tier by adding one object to `TIERS`; marker colour, badge
  and filter all follow. No stylesheet edit.

After adding an entry, run `npm run check`. A duplicate id, a missing name, an unknown
tier, an out-of-range coordinate, or a dangling `bailout`/`sameTrailheadAs` link fails
the check — and therefore the build — so a bad commit never publishes.

## Deployment

Two independent targets, both driven from `main`:

**GitHub Pages** — [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). In the
repo settings, set **Settings → Pages → Source** to **GitHub Actions** (not "Deploy from
a branch"). No secrets needed. Serves at `https://<user>.github.io/<repo>/`. The workflow
runs the data checker on every push *and* every pull request; on a PR it gates without
deploying.

**Container image (GHCR)** — [`.github/workflows/container.yml`](.github/workflows/container.yml)
builds the site into an nginx image and pushes `ghcr.io/<owner>/<repo>:latest` for
hosting on your own server. The image serves at the domain **root** (`PATH_PREFIX=/`):

```bash
docker run -d -p 8080:80 ghcr.io/mufflon/roadtrip26:latest
```

The first time, make the package public (or authenticate the pull) under the repo's
Packages settings.

Three things that specifically bite on Pages:

- **The site lives under a subpath** `https://<user>.github.io/<repo>/`. Every link uses
  Eleventy's `url` filter and the configured `pathPrefix`. The workflow sets
  `PATH_PREFIX` to the repository name automatically, so it always matches. Locally the
  default in [`eleventy.config.mjs`](eleventy.config.mjs) is `/roadtrip26/`; if you name
  the repo something else, that is the one place to change (or set `PATH_PREFIX`). A
  single leading slash without the prefix works locally and 404s in production.
- **Paths are case-sensitive** on Pages and usually not on a Mac. `Data/Sites.js` passes
  locally and 404s live.
- **Pages caches hard** and takes a minute or two to publish. An edit made from a phone
  that appears not to have landed has almost certainly just not propagated yet — wait
  before debugging.

## What's deliberately not here

No routing or trip optimisation, no day assignment, no weather, no EV/hotel data, no
service worker, no analytics, no cookie banner. If one of these seems necessary, raise
it rather than adding it.

## Outstanding data to verify

Coordinates and Wikipedia links are now filled in (`mala-fatra-ridge` and `vtacnik`
trailheads are marked approximate and carry an "approximate" chip). What remains is a
check no software can honestly do:

- **Verify opening hours** for `patton`, `josefov`, `spissky-hrad`, `levoca`, which carry
  `hoursVerified: false` and so read "hours not confirmed". Confirm on the venue's own
  site, set `hoursVerified: true`, and bump `hoursChecked` in `content/config.yaml`.
