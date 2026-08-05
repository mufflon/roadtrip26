# Road trip reference site: Budapest to Rostock, August 2026

## What this is

A static reference site for a driving trip from Budapest north to the Rostock–Gedser
ferry. Two people, one driving, picking stops opportunistically rather than following
an itinerary. **There is no plan and the site must not imply one.** No day numbers, no
suggested order, no "day 3" grouping. It is a filterable list of candidates plus a map.

The single most important job: get a Google Maps link for a chosen site into the car's
navigation in as few taps as possible, from a phone, possibly in sunlight, possibly on
a bad mobile connection.

Two pages:

1. `index.html` — the historical sites (`data/sites.js`)
2. `trails.html` — candidate Slovak day hikes (`data/trails.js`)

Both pages share the same layout, styling and map behaviour.

## Decisions already made. Do not revisit these.

- **Builds with Eleventy (11ty) v3 and deploys to GitHub Pages via Actions.** See
  "The build" for what it is allowed to buy and what it must not become.
- **No database, no backend, no API keys.** All data lives in the `content/` YAML.
- **Leaflet 1.9.4 with OpenStreetMap tiles.** Not the Google Maps JS API, which needs a
  billable key. Google is used only for outbound links. (Leaflet was originally loaded
  from a CDN; it is now vendored under `src/assets/leaflet/` so the map works offline.)
- **No localStorage or sessionStorage.**
- **The YAML in `content/` is the source of truth.** Human-edited, split by country.
  `tools/build-data.mjs` (`./build.sh` / `npm run data`) compiles it into `data/sites.js`
  and `data/trails.js`, which are GENERATED and gitignored — never edit those by hand.
  `_data/` re-exports the generated files for Eleventy. See `content/README.md`.
- **Numbering is tier letter plus index**, not a plain sequence. See below.
- **Adding a place must be a one-file edit.** See "Adding a place later". Any design
  that requires touching two files to add one entry is wrong.
- **No control ever hides a row or a marker.** Controls change emphasis and order only.
  This page is used for discussion before the trip, so removing options defeats it.
- **Every entry gets a Wikipedia link**, falling back to a search URL when no article
  title is known. See "Wikipedia links".

## The build

A build is allowed. It exists to buy exactly three things:

1. **A failed build on bad data**, so a typo never reaches production. This is the
   point. Pages keeps serving the previous deploy and GitHub emails the failure.
2. **One shared page shell.** `index.html` and `trails.html` must not duplicate head,
   nav and footer markup, and the shell must not be injected client-side either.
3. **Static rendering of the list.** The rows exist in the served HTML, so the page is
   readable before Leaflet loads or if tiles are unreachable.

The map still needs the data client-side. Emit it from the same source as a JSON file
per page at build time. One source of truth, two outputs.

**What the build must not become:** React, Vue, Svelte, a component framework of any
kind, a CSS framework, TypeScript, a test runner, or an image pipeline. If a dependency
is not Eleventy or its plugins, ask before adding it. Total `devDependencies` should be
in single digits.

Eleventy is the recommendation because the data files stay plain JS, the toolchain is
Node, and `npx @11ty/eleventy --serve` is the whole local workflow. If you would rather
use Vite with a small hand-rolled page template, that is acceptable; say why. Do not use
Jekyll, because the local Ruby toolchain is more hassle than the zero-config Pages build
saves.

## Enumeration

Every entry gets a short stable code shown identically in the list and on the map
marker, so "let's do B4 next" is unambiguous.

- Sites page, by tier: `A` will not miss, `B` don't want to miss (Brandenburg an der
  Havel is folded in here, not a separate tier), `C` might miss, `D` en route.
- Trails page: `T1`–`T7`.

Derive codes at runtime from tier plus array position so they stay stable and nobody
has to maintain them by hand. Codes are not sequential down the route on purpose: the
tier is the thing being decided on, so the code should carry the tier.

The build sorts within each tier by latitude (south to north) automatically, so scanning
the list matches the direction of travel and nobody orders entries by hand.

## Google Maps links

Every entry needs both of these, as separate controls. Do not hide either behind a menu.

**Open the place** (use this as the shareable link, it resolves to the actual POI
rather than a dropped pin when a `placeId` exists):

```
https://www.google.com/maps/search/?api=1&query=<lat>,<lng>&query_place_id=<placeId>
```

Without a `placeId`, drop the last parameter.

**Directions to it:**

```
https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&destination_place_id=<placeId>
```

Also give each entry a **Copy link** button using `navigator.clipboard.writeText`,
falling back to selecting the text if the Clipboard API is unavailable. The copied
string is the "open the place" URL above. This is how the link gets shared to the car,
so it matters more than it looks. Confirm the copy inline next to the button, not in a
toast that might be missed.

Entries with `url` also get an **Official site** link. Open outbound links in a new tab.

## Wikipedia links

Every entry gets a Wikipedia link. **There is no such thing as an entry without one**,
because the purpose is to have somewhere to start reading, not to guarantee a specific
article.

The `wikipedia` field takes three forms:

| Value | Render |
|---|---|
| `"Battle_of_Austerlitz"` | `https://en.wikipedia.org/wiki/Battle_of_Austerlitz`, labelled `Wikipedia` |
| `{ cs: "Vojensk%C3%A9_muzeum..." }` | one link per language key, labelled `Wikipedia (CS)` |
| `null` | fall back to search, labelled `Wikipedia search` |

The search fallback is:

```
https://en.wikipedia.org/w/index.php?search=<encodeURIComponent(name)>
```

Titles are already percent-encoded in the data, so concatenate them rather than encoding
again. Seven sites and one trail are currently `null` and rely on the fallback:
`pavlov`, `josefov`, `anthropos`, `magdeburg`, `brandenburg-archaeology`,
`brandenburg-industry`, `kelemantia`, and `sulovske-skaly`.

Note that several titles deliberately point at the **subject** rather than the venue,
because that is the better read: `chlum` goes to the Battle of Königgrätz, `patton` to
Škoda Works, `halle` and `arche-nebra` both to the Nebra sky disc. Keep that convention
when adding entries.

## Sites page

A list and a map, side by side on desktop, stacked with the map first and sticky on
mobile.

**Each list row shows:** code, name, country, era, opening hours, and the note. Closed
days must be visually unmissable, because they have already caused two scheduling
collisions on this trip. `Anthropos` (`closedDays: [1, 2]`) and the Dresden military
museum (Wednesday) are the ones that bite.

**Nothing is ever hidden.** This page is used to talk through options before leaving,
not only to pick a stop in the moment, so a control that removes entries destroys the
thing it is for. Every row and every marker stays on screen at all times. Controls
change **emphasis and order only**. No `display: none` on an entry, no marker removed
from the layer, ever.

Express emphasis by dimming non-matching entries to roughly 40% opacity with a
desaturated marker, and keep them fully clickable at that state. Show a count like
"11 of 29 match" so it is obvious the rest are still there.

**Controls, all client-side, combinable:**

- Tier (multi-select, all on by default) — emphasis only
- Country (HU / SK / CZ / DE) — emphasis only
- **"Thinking about a…" weekday picker.** Pick a weekday and every entry whose
  `closedDays` includes it gets a warning state: a red-amber chip reading
  `Probably closed Mondays` and, where there are two, `Probably closed Mondays and
  Tuesdays`. The entry stays visible and its marker stays on the map, ringed rather than
  removed.
- Sort: by tier then geography (default), or by `eraSort` ascending.

**Hedge the closing days deliberately.** The word is "probably", not "closed". These were
checked once and museum hours change. Where `hoursVerified` is `false` the chip must read
`Hours not confirmed — check before you go` instead, and that state applies to `patton`,
`josefov`, `spissky-hrad` and `levoca`. Render the `HOURS_CHECKED` date next to the
weekday picker, not buried in the footer, so the provenance of the warning is visible at
the moment it is being trusted.

The era sort is worth doing properly. The list spans roughly 30,000 BP to 1989 and
sorting by it turns the page into a timeline of the trip, which is the actual reason
these particular places were chosen. When sorted by era, show the era value as a
left-hand rail so the jumps in time are legible.

**Map:** numbered markers carrying the code as a label, coloured by tier. Markers are
never added or removed after first render; controls only change their emphasis, matching
the list. Clicking a row pans and zooms to its marker and opens its popup; clicking a
marker scrolls its row into view and highlights it. The popup carries the name, hours,
any closing warning, and the Google and Wikipedia links.

Markers with `coordsApprox: true` must be visually distinct (hollow or dashed) with the
word "approximate" in the popup.

**Also add:** a "Download KML" button that builds a KML file client-side from the full
data set and triggers a download via a Blob. Group placemarks into folders by tier, and
put the hours and any closing warning in each placemark description. Export everything
regardless of the current emphasis state, for the same reason nothing is hidden. A GPX
variant is nice but optional.

## Trails page

Same shell, different card content. This page is a comparison table more than a list,
because the whole point is the trade-off between the four constraints.

Each trail card shows: code, name, range, trailhead, distance, ascent, time, whether
it is a circuit, the hardware level, drive time from Budapest, drive time onward to
Pavlov, the route description, the note, and the verdict.

- `meetsBrief: true` should read as a positive badge. Only `sitno-tajchy` and
  `vtacnik` qualify. Everything else must show *which* constraint it fails, which is
  in `verdict`.
- `hardware` renders as a four-step scale: none, steps, ladders, ferrata. Make
  `ladders` legible as a caution without being alarmist; the user has already decided
  the ladders are probably acceptable.
- `oneWay: true` needs explaining in one line: Slovenský raj gorges are ascent-only,
  so you cannot retreat once committed.
- Where `bailout` points at another trail id, link the two cards together.
- Render the `EXCLUDED` array as a short footnote, not as cards.

**Trailhead pins are stand-ins.** Several trails have `lat: null` and
`coordsApprox: true`. See TODO below. Where `fallbackPin` exists, use it and label it
as the stand-in it is.

## Adding a place later

Places will get added over months, sometimes from a phone in the GitHub web editor while
travelling. The whole design has to survive that. Requirements:

**One YAML entry, nothing else.** Appending an entry to the right file under
`content/sites/<COUNTRY>.yaml` or `content/trails/` must be sufficient. No index to
update, no marker to register, no code to increment, no CSS class to add. Codes are
derived at build time from tier + latitude, so a push regenerates `data/*.js` and
redeploys. See `content/README.md` for the field reference.

**Only four fields are required.** Everything else is optional and the renderer must
degrade silently rather than print `undefined`, leave an empty element with padding, or
throw:

| Field | Required | Behaviour when absent |
|---|---|---|
| `id` | yes | must be unique, used for anchors and cross-links |
| `name` | yes | — |
| `lat`, `lng` | no, but see below | omit the marker, show the row with a "no location yet" chip |
| `tier` | yes on sites | unknown tier falls back to a neutral colour and sorts last |
| `placeId` | no | Maps links fall back to the coordinate-only form |
| `hours`, `duration`, `fee`, `note`, `era`, `url`, `country` | no | omit that element entirely |
| `wikipedia` | no | falls back to a Wikipedia search on `name`, never omitted |
| `closedDays` | no | treated as `[]`, so no closing warning is shown |
| `hoursVerified` | no | treated as `false`, so the row reads "hours not confirmed" |
| `eraSort` | no | sorts last in era order |

Put a commented copy-paste template at the top of each data file showing the minimum
viable entry and the full one. Keep the field comments already in those files current,
including the `wikipedia` and `hoursVerified` fields.

When adding an entry, leaving `wikipedia` out is fine: the search fallback handles it.
Leaving `hoursVerified` out is also fine and is the safe default, since it makes the
page admit it does not know rather than assert hours it has not checked.

**Tiers are data, not CSS.** Marker colour, badge colour and filter buttons must all be
derived from the `TIERS` array, with the colour stored there as a value. Adding a sixth
tier should mean adding one object to `TIERS`, not editing a stylesheet.

**Guard against a broken data file.** With a build, this moves to build time, which is
where it belongs.

1. `tools/check-data.mjs`, no dependencies, run as an npm script and as the first step
   of the workflow. It must exit non-zero with a clear message on: duplicate `id`,
   missing `name`, a `tier` not present in `TIERS`, latitude outside ±90 or longitude
   outside ±180, and a `bailout` or `sameTrailheadAs` pointing at an id that does not
   exist. Note: `coordsApprox` is deliberately *allowed* alongside real coordinates —
   it marks a real-but-approximate stand-in pin (e.g. `josefov`), which is the field's
   documented meaning, so the checker does not flag it.
2. The build fails if the checker fails. A bad commit never publishes, and the live site
   keeps serving the last good deploy.
3. Client side, still wrap the fetch of the emitted JSON in `try/catch` and render a
   readable failure in the page. The rows are already in the static HTML at that point,
   so the failure mode is "list works, map does not", which is survivable. Never a blank
   page.

## Design direction

Field tool, not travel blog. It gets used one-handed, in a car, in daylight.

- **Palette from the subject.** The trip's headline object is the Nebra Sky Disc:
  oxidised bronze patina against gold leaf. Build from a deep blue-green ground and a
  warm metallic accent. Do not use warm cream with a high-contrast serif and a
  terracotta accent, and do not use near-black with one acid accent. Both are generic
  defaults and neither has anything to do with this trip.
- **Type:** one characterful display face for headings and codes, one highly legible
  body face at a generous size. The codes (`A1`, `B4`) are read at a glance while
  someone else is driving, so set them large, tabular and unmistakable.
- **Tap targets 44 px minimum.** The Maps and Copy controls are the primary actions on
  every row; give them real weight rather than making them small text links.
- **High contrast.** Assume direct sunlight on a phone screen.
- Restraint everywhere else. Spend the boldness on the era rail and the code
  treatment. No hero image, no animation beyond the map pan and a focus transition.

## Quality floor

- **Never assert an opening time as fact.** Hours came from one check on a single date.
  Warnings read "probably closed", unverified entries read "hours not confirmed", and
  `HOURS_CHECKED` is shown wherever hours are shown. Getting this wrong means standing
  outside a locked museum having been told it was open.
- Responsive from 360 px up. Map must be usable at that width.
- Visible keyboard focus, list rows reachable by keyboard, `prefers-reduced-motion`
  respected (skip the map fly-to animation, jump instead).
- Works with the map tile server unreachable: if tiles fail, the list and all Google
  links must still function. Do not block rendering on Leaflet loading.
- Attribute OpenStreetMap properly, as the tile usage policy requires.
- No console errors.

## TODO for you, in order

1. **Resolve the missing coordinates.** These entries have `lat: null` and must be
   filled in with real trailhead or entrance coordinates, plus a `placeId` where one
   exists. Remove `coordsApprox` once resolved.
   - `sites.js`: `spissky-hrad`, `levoca`, `dobsinska`
   - `trails.js`: `mala-fatra-ridge` (Chata Vrátna car park),
     `dumbier-chopok` (Trangoška car park), `slovensky-raj-gorges` and
     `slovensky-raj-klastorisko` (Podlesok, Hrabušice), `vtacnik`
2. **Refine `josefov`**, which currently resolves to the fortress district rather than
   the visitor centre where the underground tours start.
3. **Verify opening hours** for `patton`, `josefov`, `spissky-hrad` and `levoca`, which
   carry `hoursVerified: false`. Set the flag to `true` once confirmed and update
   `HOURS_CHECKED`.
4. **Fill in the missing Wikipedia titles** for the eight entries currently on the search
   fallback, and spot-check that the 22 supplied titles resolve rather than redirect to a
   disambiguation page. Prefer the subject article over the venue article where the
   subject is the reason to go.
5. Set up Eleventy, the shared layout and the two pages.
6. Add `tools/check-data.mjs` and the deploy workflow. Deliberately break a data file and
   confirm the build fails and the previous deploy stays live.
7. Verify the live subpath URL, not just localhost: every link, the emitted JSON fetch,
   and the Leaflet assets.
8. Add a README covering: how to add a place (the minimum entry, copy-pasteable),
   `npm start`, `npm run check`, and the Pages caching note.

## Deployment: GitHub Pages via Actions

Set Settings, Pages, Source to **GitHub Actions**, not "Deploy from a branch". One
workflow, `.github/workflows/deploy.yml`, on push to the default branch: checkout, setup
Node LTS, `npm ci`, run the data checker, build, then `actions/upload-pages-artifact`
and `actions/deploy-pages`. Needs `permissions: pages: write, id-token: write` and no
secrets. Also run the checker on pull requests without deploying.

Do not commit the build output. `_site/` goes in `.gitignore` and the artifact comes
from the workflow.

Layout:

```
/
├── content/                     SOURCE OF TRUTH — human-edited YAML
│   ├── config.yaml              tiers, HOURS_CHECKED, excluded trails
│   ├── sites/<COUNTRY>.yaml
│   └── trails/<COUNTRY>.yaml
├── src/
│   ├── _includes/layout.njk     shared shell: head, nav, footer
│   ├── index.njk                sites page
│   ├── trails.njk               trails page
│   └── assets/                  css, client js
├── data/
│   ├── enrich.js                shared code/link derivation
│   ├── sites.js                 GENERATED from content/ (gitignored)
│   └── trails.js                GENERATED (gitignored)
├── _data/                       re-exports the generated files for Eleventy
├── tools/build-data.mjs         content/*.yaml -> data/*.js
├── tools/check-data.mjs
├── build.sh                     data + validate
├── Dockerfile                   nginx image for GHCR / self-hosting
├── .github/workflows/deploy.yml       GitHub Pages
├── .github/workflows/container.yml    GHCR image
├── eleventy.config.mjs
├── package.json
└── README.md
```

Three things that specifically bite on Pages:

- **The site lives under a subpath**, `https://<user>.github.io/<repo>/`, so every
  `src`, `href` and fetch path must be relative or built from a configured path prefix.
  Set Eleventy's `pathPrefix` to the repo name and use the `url` filter on every link.
  A single leading slash breaks everything and works fine locally, so check it once
  against the live URL.
- **Paths are case-sensitive** on Pages and usually not on a Mac. `Data/Sites.js` will
  pass locally and 404 in production.
- **Pages caches hard** and takes a minute or two to publish. Note that in the README so
  an edit made from a phone that appears not to have landed does not send you debugging.

Local workflow is `npm start` mapped to `npx @11ty/eleventy --serve`. Put that in the
README along with `npm run check`.

## Out of scope

Do not add: routing or trip optimisation, day assignment, weather, EV charging, hotel
data, analytics, or a cookie banner. If any of these seem necessary, say so rather than
building them.

A service worker was originally listed here as out of scope (to avoid stale-content
surprises on top of Pages' hard caching). It has since been added deliberately, for
offline use on a boat trip, with the cache name versioned by build time so every deploy
replaces the old cache and nothing is served stale. The app is installable to the home
screen (manifest + icons) and precaches both pages, the data, the bundled Leaflet and the
offline basemap. `localStorage`/`sessionStorage` remain unused (the Cache API is not
localStorage).
