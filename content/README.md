# content/ — the editable source

These YAML files are the **single source of truth**. A build step
(`./build.sh` or `npm run data`) compiles them into `data/sites.js` and
`data/trails.js`, which are generated and gitignored — never edit those.

```
content/
├── config.yaml          # tiers, HOURS_CHECKED date, excluded trails
├── sites/
│   ├── CZ.yaml          # one file per country; add HU.yaml, PL.yaml, … as needed
│   ├── DE.yaml
│   └── SK.yaml
└── trails/
    └── SK.yaml
```

**Ordering is automatic.** File order and position within a file do not matter.
The build sorts sites by tier, then latitude south → north, and trails by
latitude, so the codes (`A1`, `B4`, `T3` …) are derived, stable, and follow the
direction of travel. Add an entry anywhere in the right file.

## Add a site

Minimum — four fields, everything else optional and degrades silently:

```yaml
- id: short-slug        # unique, lowercase, no spaces
  name: Name
  tier: want            # core | want | maybe | enroute (see config.yaml)
  lat: 50.0
  lng: 14.0
```

Full entry:

```yaml
- id: short-slug
  name: Name
  country: CZ           # HU | SK | CZ | DE — should match the file it lives in
  lat: 50.0
  lng: 14.0
  placeId: ChIJ...      # from Google Places; improves the Maps link
  tier: want
  era: 13th c.
  eraSort: 1250         # approximate year; negative for BCE; used by the era sort
  hours: "Tue–Sun 10:00–18:00."
  closedDays: [1]       # JS day numbers, 0 = Sunday
  hoursVerified: true   # OMIT unless you personally checked — absent = "not confirmed"
  duration: "2 h"
  fee: "EUR 5"
  url: "https://..."
  wikipedia: Article_Title   # or { de: "..." }; OMIT for a Wikipedia-search fallback
  coordsApprox: true    # only if the pin is a real but approximate stand-in
  note: "Why it's here, plus anything practical."
```

## Add a trail

Minimum:

```yaml
- id: slug
  name: Name
  lat: 49.0
  lng: 19.0
```

Trails also take: `wikipedia`, `range`, `trailhead`, `placeId`, `coordsApprox`,
`fallbackPin: { label, lat, lng, placeId }`, `distanceKm`, `ascentM`, `timeH`,
`circuit`, `hardware` (none | steps | ladders | ferrata), `oneWay`, `fee`,
`driveFromBudapest`, `driveOnwardToPavlov`, `meetsBrief`, `route`, `route_note`,
`note`, `bailout` (another trail id), `sameTrailheadAs`, `verdict`.

## Rules the build enforces

`./build.sh` runs the validator; it fails (and CI refuses to publish) on: a
duplicate `id`, a missing `name`, a `tier` not defined in `config.yaml`, a
latitude/longitude out of range, or a `bailout` / `sameTrailheadAs` pointing at
an id that doesn't exist. Tiers are data — add one to `config.yaml` and the
marker colour, badge and filter follow with no code change.
