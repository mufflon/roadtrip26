// Shared, dependency-free derivation used by BOTH the server render (via _data/)
// and the client JSON (via src/*.json.njk). Deriving in one place is what keeps
// the codes (A1, B4 ...) and the outbound links identical in the list, on the
// map, and in the emitted JSON. Nothing here mutates the source data files.

// Build the Wikipedia links for an entry. Every entry gets at least one link:
// there is no such thing as an entry without a Wikipedia link, only a search
// fallback when no title is known. Titles in the data are already
// percent-encoded, so they are concatenated rather than encoded again.
export function wikiLinks(entry) {
  const w = entry.wikipedia;
  if (w == null) {
    return [{
      label: "Wikipedia search",
      url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(entry.name)}`,
      fallback: true
    }];
  }
  if (typeof w === "string") {
    return [{ label: "Wikipedia", url: `https://en.wikipedia.org/wiki/${w}`, fallback: false }];
  }
  // Object of { lang: percent-encoded-title }, one link per language key.
  return Object.entries(w).map(([lang, title]) => ({
    label: `Wikipedia (${lang.toUpperCase()})`,
    url: `https://${lang}.wikipedia.org/wiki/${title}`,
    fallback: false
  }));
}

// Google Maps "open the place" and "directions" URLs. The place-id form
// resolves to the actual POI rather than a dropped pin; without a placeId the
// last parameter is dropped. Returns null when there are no coordinates yet.
export function mapsLinks(lat, lng, placeId) {
  if (lat == null || lng == null) return null;
  const q = `${lat},${lng}`;
  const open = `https://www.google.com/maps/search/?api=1&query=${q}` +
    (placeId ? `&query_place_id=${placeId}` : "");
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${q}` +
    (placeId ? `&destination_place_id=${placeId}` : "");
  return { open, dir };
}

// Add code, tier metadata and links to each site. The code is tier letter plus
// a per-tier counter in array order, so it stays stable as places are appended
// and carries the tier, which is the thing being decided on.
export function enrichSites(SITES, TIERS) {
  const counters = {};
  return SITES.map((s) => {
    const tier = TIERS.find((t) => t.id === s.tier);
    const letter = tier ? tier.letter : "?";
    counters[s.tier] = (counters[s.tier] || 0) + 1;
    return {
      ...s,
      code: `${letter}${counters[s.tier]}`,
      tierColour: tier ? tier.colour : "#7d8b93",
      tierLabel: tier ? tier.label : "Unknown tier",
      tierOrder: tier ? tier.order : 999,
      hasCoords: s.lat != null && s.lng != null,
      maps: mapsLinks(s.lat, s.lng, s.placeId),
      wiki: wikiLinks(s)
    };
  });
}

// Trails are enumerated T1..Tn by array position. Where a trail has no
// coordinates but a fallbackPin, the pin (and its Maps links) use the stand-in,
// flagged so the UI can label it as one.
export function enrichTrails(TRAILS) {
  return TRAILS.map((t, i) => {
    const usingFallback = (t.lat == null || t.lng == null) && !!t.fallbackPin;
    const pinLat = t.lat != null ? t.lat : (t.fallbackPin ? t.fallbackPin.lat : null);
    const pinLng = t.lng != null ? t.lng : (t.fallbackPin ? t.fallbackPin.lng : null);
    const pinPlace = t.placeId != null ? t.placeId : (t.fallbackPin ? t.fallbackPin.placeId : null);
    return {
      ...t,
      code: `T${i + 1}`,
      hasCoords: t.lat != null && t.lng != null,
      pin: pinLat != null && pinLng != null
        ? { lat: pinLat, lng: pinLng, placeId: pinPlace, isFallback: usingFallback,
            label: usingFallback && t.fallbackPin ? t.fallbackPin.label : t.trailhead }
        : null,
      maps: mapsLinks(pinLat, pinLng, pinPlace),
      wiki: wikiLinks(t)
    };
  });
}
