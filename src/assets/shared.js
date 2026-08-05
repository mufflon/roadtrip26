// Shared client helpers for both pages. Everything here degrades: if the emitted
// JSON fails to load or Leaflet is unreachable, the statically-rendered list still
// works and every Google Maps link still resolves. The rows are already in the
// HTML, so the worst case is "list works, map does not" — never a blank page.

export function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Run cb once Leaflet's global is present. Leaflet is a deferred classic script;
// if it is slow or blocked we wait for load and re-check rather than throwing.
export function whenLeaflet(cb) {
  if (window.L) return cb(window.L);
  window.addEventListener("load", () => {
    if (window.L) cb(window.L);
  });
}

export async function loadJSON(mapEl, statusEl) {
  const url = mapEl && mapEl.dataset.json;
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    showStatus(statusEl, "Map data could not be loaded — the list and all links still work.");
    return null;
  }
}

export function showStatus(statusEl, message) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = false;
}

// Delegated copy-to-clipboard. The copied string is the "open the place" URL —
// this is how a stop gets shared to the car, so the confirmation shows inline
// next to the button rather than in a toast that might be missed.
export function wireCopy(root) {
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const text = btn.dataset.copy;
    const ok = btn.parentElement.querySelector("[data-copyok]");
    const done = () => {
      if (!ok) return;
      ok.hidden = false;
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { ok.hidden = true; }, 2500);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        done();
        return;
      }
      throw new Error("no clipboard API");
    } catch {
      // Fallback: select the URL in a temporary field so it can be copied by hand.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch { /* leave selected */ }
      ta.remove();
    }
  });
}

export function makeMap(mapEl, statusEl) {
  const L = window.L;
  if (!L || !mapEl) return null;
  const map = L.map(mapEl, { scrollWheelZoom: true });
  const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  let warned = false;
  tiles.on("tileerror", () => {
    if (warned) return;
    warned = true;
    showStatus(statusEl, "Map tiles are unreachable — links and the list still work.");
  });
  tiles.addTo(map);
  return map;
}

// A tier-coloured, code-labelled marker. Approximate pins are hollow and dashed.
export function codeIcon(L, code, colour, approx) {
  const style = approx ? "" : `background:${colour}`;
  return L.divIcon({
    className: "",
    html: `<div class="pin${approx ? " is-approx" : ""}" style="${style}">${code}</div>`,
    iconSize: [30, 26],
    iconAnchor: [15, 13],
    popupAnchor: [0, -12]
  });
}

export function fitTo(map, latlngs) {
  if (!latlngs.length) {
    map.setView([50.5, 15.0], 6); // central Europe fallback
    return;
  }
  map.fitBounds(latlngs, { padding: [30, 30] });
}

export function flyOrJump(map, lat, lng, zoom) {
  if (reducedMotion()) map.setView([lat, lng], zoom);
  else map.flyTo([lat, lng], zoom, { duration: 0.6 });
}

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Trigger a client-side file download from a string, via a Blob.
export function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
