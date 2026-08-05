import {
  loadJSON, wireCopy, makeMap, addBasemap, codeIcon, fitTo, flyOrJump, whenLeaflet, esc
} from "./shared.js";

const cards = Array.from(document.querySelectorAll(".card"));
const cardById = new Map(cards.map((c) => [c.dataset.id, c]));
const mapEl = document.getElementById("map");
const statusEl = document.getElementById("map-status");

wireCopy(document);

function setActive(id) {
  cards.forEach((c) => c.classList.toggle("is-active", c.dataset.id === id));
}

const smooth = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

// Bail-out cross-links: jump to the linked card and flash it.
document.querySelectorAll("[data-jump]").forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.getElementById(a.dataset.jump);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: smooth(), block: "center" });
    setActive(target.dataset.id);
    target.focus({ preventScroll: true });
  });
});

// Click a card (not a link/button) to focus its trailhead pin.
document.getElementById("list").addEventListener("click", (e) => {
  if (e.target.closest("a, button")) return;
  const card = e.target.closest(".card");
  if (!card || !window._rtmap) return;
  const marker = markers.get(card.dataset.id);
  if (!marker) return;
  setActive(card.dataset.id);
  flyOrJump(window._rtmap, marker.getLatLng().lat, marker.getLatLng().lng, 11);
  marker.openPopup();
});

const markers = new Map();

(async () => {
  const data = await loadJSON(mapEl, statusEl);
  if (!data) return;

  whenLeaflet((L) => {
    const map = makeMap(mapEl, statusEl);
    if (!map) return;
    window._rtmap = map;
    addBasemap(map, mapEl.dataset.basemap);
    const latlngs = [];

    data.TRAILS.forEach((t) => {
      if (!t.pin) return;
      const approx = !!t.pin.isFallback || !!t.coordsApprox;
      const marker = L.marker([t.pin.lat, t.pin.lng], {
        icon: codeIcon(L, t.code, "#4ba793", approx),
        keyboard: false
      });
      let html = `<strong>${esc(t.code)} ${esc(t.name)}</strong>`;
      if (t.range) html += `<br>${esc(t.range)}`;
      if (t.pin.isFallback) html += `<br><em>Pin is a stand-in (${esc(t.pin.label)}) — refine the trailhead.</em>`;
      if (t.maps) html += `<br><a href="${t.maps.open}" target="_blank" rel="noopener">Open in Maps</a> · ` +
        `<a href="${t.maps.dir}" target="_blank" rel="noopener">Directions</a>`;
      marker.bindPopup(html);
      marker.on("click", () => {
        const card = cardById.get(t.id);
        setActive(t.id);
        if (card) card.scrollIntoView({ behavior: smooth(), block: "center" });
      });
      marker.addTo(map);
      markers.set(t.id, marker);
      latlngs.push([t.pin.lat, t.pin.lng]);
    });

    fitTo(map, latlngs);
  });
})();
