import {
  loadJSON, wireCopy, makeMap, addBasemap, codeIcon, fitTo, flyOrJump,
  whenLeaflet, esc, downloadBlob
} from "./shared.js";

const listEl = document.getElementById("list");
const rows = Array.from(document.querySelectorAll(".row"));
const rowById = new Map(rows.map((r) => [r.dataset.id, r]));
const originalOrder = rows.map((r) => r.closest("li"));
const countEl = document.getElementById("matchcount");
const total = rows.length;

const mapEl = document.getElementById("map");
const statusEl = document.getElementById("map-status");

wireCopy(document);

/* ------------------------------------------------------------ weekday text */
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const plural = (n) => DAY[n] + "s";
function closedDaysPhrase(days) {
  const names = days.map(plural);
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + " and " + names[1];
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}
function rowClosedDays(row) {
  const raw = row.dataset.closeddays;
  if (!raw) return [];
  return raw.split(",").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
}

/* ------------------------------------------------------------ controls read */
function checkedValues(name) {
  return new Set(
    Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((i) => i.value)
  );
}

/* ------------------------------------------------------------------- markers */
let markers = new Map(); // id -> Leaflet marker

/* ------------------------------------------------------------------ emphasis */
function apply() {
  const tiers = checkedValues("tier");
  const countries = checkedValues("country");
  const weekday = document.getElementById("weekday").value;
  const day = weekday === "" ? null : parseInt(weekday, 10);
  let matches = 0;

  rows.forEach((row) => {
    const tierOk = tiers.has(row.dataset.tier);
    const countryOk = !row.dataset.country || countries.has(row.dataset.country);
    const isMatch = tierOk && countryOk;
    if (isMatch) matches++;
    row.classList.toggle("is-dim", !isMatch);

    // Weekday closing warning. Unverified entries keep their "hours not
    // confirmed" chip and never claim a specific closure.
    const warnBox = row.querySelector("[data-warn]");
    const existing = warnBox.querySelector(".chip-warn--closed");
    if (existing) existing.remove();
    let warned = false;
    if (day !== null && row.dataset.hoursverified === "true") {
      const closed = rowClosedDays(row);
      if (closed.includes(day)) {
        const chip = document.createElement("span");
        chip.className = "chip-warn chip-warn--closed";
        chip.textContent = "Probably closed " + closedDaysPhrase(closed);
        warnBox.prepend(chip);
        warned = true;
      }
    }

    // Mirror emphasis and warning onto the marker.
    const marker = markers.get(row.dataset.id);
    if (marker && marker._icon) {
      marker._icon.firstChild.classList.toggle("is-dim", !isMatch);
      marker._icon.firstChild.classList.toggle("is-warn", warned);
    }
  });

  countEl.textContent = `${matches} of ${total} match`;
}

/* --------------------------------------------------------------------- sort */
function applySort() {
  const mode = document.getElementById("sort").value;
  listEl.classList.toggle("is-era", mode === "era");
  let items;
  if (mode === "era") {
    items = rows.map((r) => r.closest("li")).sort((a, b) => {
      const av = a.querySelector(".row").dataset.erasort;
      const bv = b.querySelector(".row").dataset.erasort;
      const an = av === "" ? Infinity : parseFloat(av);
      const bn = bv === "" ? Infinity : parseFloat(bv);
      return an - bn;
    });
  } else {
    // Tier, then geography. JS sort is stable, so sorting the source order by
    // tier keeps the within-tier (roughly south → north) order the data uses,
    // while grouping the appended east-Slovakia "want" entries with the rest.
    items = originalOrder.slice().sort((a, b) =>
      (+a.querySelector(".row").dataset.tierorder) - (+b.querySelector(".row").dataset.tierorder)
    );
  }
  items.forEach((li) => listEl.appendChild(li));
}

/* ------------------------------------------------------- active / linking */
function setActive(id) {
  rows.forEach((r) => r.classList.toggle("is-active", r.dataset.id === id));
}

/* --------------------------------------------------------------------- KML */
function buildKML(data) {
  const tiers = data.TIERS;
  const esc2 = esc;
  let body = "";
  tiers.forEach((tier) => {
    const inTier = data.SITES.filter((s) => s.tier === tier.id && s.hasCoords);
    if (!inTier.length) return;
    body += `  <Folder><name>${esc2(tier.letter + " · " + tier.label)}</name>\n`;
    inTier.forEach((s) => {
      const bits = [];
      if (s.hours) bits.push("Hours: " + s.hours);
      if (!s.hoursVerified) bits.push("Hours not confirmed — check before you go.");
      if (s.closedDays && s.closedDays.length) bits.push("Probably closed " + closedDaysPhrase(s.closedDays) + ".");
      if (s.note) bits.push(s.note);
      body +=
        `    <Placemark><name>${esc2(s.code + " " + s.name)}</name>` +
        `<description>${esc2(bits.join("\n"))}</description>` +
        `<Point><coordinates>${s.lng},${s.lat},0</coordinates></Point></Placemark>\n`;
    });
    body += `  </Folder>\n`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>\n` +
    `  <name>Budapest to Rostock — sites</name>\n${body}</Document></kml>\n`;
}

/* --------------------------------------------------------------------- init */
document.querySelectorAll('input[name="tier"], input[name="country"]').forEach((el) =>
  el.addEventListener("change", apply)
);
document.getElementById("weekday").addEventListener("change", apply);
document.getElementById("sort").addEventListener("change", applySort);

// Click a row (but not one of its links/buttons) to focus its marker.
listEl.addEventListener("click", (e) => {
  if (e.target.closest("a, button")) return;
  const row = e.target.closest(".row");
  if (!row) return;
  setActive(row.dataset.id);
  const marker = markers.get(row.dataset.id);
  if (marker && window._rtmap) {
    flyOrJump(window._rtmap, marker.getLatLng().lat, marker.getLatLng().lng, 11);
    marker.openPopup();
  }
});

apply();
applySort();

/* ------------------------------------------------------------- map + data */
(async () => {
  const data = await loadJSON(mapEl, statusEl);

  // KML uses the full data set regardless of current emphasis.
  const kmlBtn = document.getElementById("download-kml");
  if (data) {
    kmlBtn.addEventListener("click", () =>
      downloadBlob("budapest-rostock-sites.kml", "application/vnd.google-earth.kml+xml", buildKML(data))
    );
  } else {
    kmlBtn.disabled = true;
    kmlBtn.title = "Data not loaded";
  }

  if (!data) return;

  whenLeaflet((L) => {
    const map = makeMap(mapEl, statusEl);
    if (!map) return;
    window._rtmap = map;
    addBasemap(map, mapEl.dataset.basemap);
    const latlngs = [];

    data.SITES.forEach((s) => {
      if (!s.hasCoords) return;
      const marker = L.marker([s.lat, s.lng], {
        icon: codeIcon(L, s.code, s.tierColour, !!s.coordsApprox),
        keyboard: false
      });
      const warnBits = [];
      if (!s.hoursVerified) warnBits.push("Hours not confirmed — check before you go.");
      if (s.closedDays && s.closedDays.length) warnBits.push("Probably closed " + closedDaysPhrase(s.closedDays) + ".");
      if (s.coordsApprox) warnBits.push("Approximate location.");
      let html = `<strong>${esc(s.code)} ${esc(s.name)}</strong>`;
      if (s.hours) html += `<br>${esc(s.hours)}`;
      if (warnBits.length) html += `<br><em>${esc(warnBits.join(" "))}</em>`;
      if (s.maps) html += `<br><a href="${s.maps.open}" target="_blank" rel="noopener">Open in Maps</a> · ` +
        `<a href="${s.maps.dir}" target="_blank" rel="noopener">Directions</a>`;
      s.wiki.forEach((w) => { html += ` · <a href="${w.url}" target="_blank" rel="noopener">${esc(w.label)}</a>`; });
      marker.bindPopup(html);
      marker.on("click", () => {
        const row = rowById.get(s.id);
        setActive(s.id);
        if (row) row.scrollIntoView({ behavior: reducedMotionSafe(), block: "center" });
      });
      marker.addTo(map);
      markers.set(s.id, marker);
      latlngs.push([s.lat, s.lng]);
    });

    fitTo(map, latlngs);
    apply(); // re-sync marker emphasis now that markers exist
  });
})();

function reducedMotionSafe() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
