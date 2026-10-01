// Store map (MapLibre + MapTiler style), ported from the original script.js.
// The MapLibre library is only downloaded when the map is about to scroll
// into view. If it cannot load, the branded fallback card stays visible.

const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js';

export function getPreferredMaps() {
  const ua = navigator.userAgent || navigator.vendor || '';
  const isApple = /iPad|iPhone|iPod|Macintosh/.test(ua);
  const coords = { lat: 48.306816, lon: 11.908914 };
  const addrQ = 'Am Rätschenbach 11, 85435 Erding';
  const google = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addrQ);
  const apple = 'https://maps.apple.com/?address=' + encodeURIComponent('Am Rätschenbach 11,85435,Erding,Germany') + '&ll=' + coords.lat + ',' + coords.lon + '&q=' + encodeURIComponent('SchrankGold');
  return { provider: isApple ? 'apple' : 'google', url: isApple ? apple : google };
}

export function initDirections() {
  const pref = getPreferredMaps();
  document.querySelectorAll('[data-directions]').forEach(a => { a.href = pref.url; });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.maplibregl) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

export function initMap() {
  const mapEl = document.getElementById('store-map');
  if (!mapEl) return;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    loadScript(MAPLIBRE_JS).then(() => build(mapEl)).catch(() => {});
  };
  if (!('IntersectionObserver' in window)) { start(); return; }
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); start(); }
  }, { rootMargin: '600px 0px' });
  io.observe(mapEl);
}

function build(mapEl) {
  const maplibregl = window.maplibregl;
  if (!maplibregl) return;
  const STYLE_URL = mapEl.getAttribute('data-mt-url');

  const map = new maplibregl.Map({
    container: mapEl,
    style: STYLE_URL,
    attributionControl: true,
    interactive: true,
    cooperativeGestures: true,
    locale: {
      'CooperativeGesturesHandler.WindowsHelpText': 'Zum Zoomen Strg + Scrollen verwenden',
      'CooperativeGesturesHandler.MacHelpText': 'Zum Zoomen ⌘ + Scrollen verwenden',
      'CooperativeGesturesHandler.MobileHelpText': 'Karte mit zwei Fingern bewegen'
    },
    pitch: parseFloat(mapEl.getAttribute('data-pitch')) || 15,
    center: [11.90903, 48.30709],
    zoom: 15,
    bearing: 20
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.once('load', () => {
    mapEl.classList.add('is-ready');
    try {
      if (!map.getSource('overlays')) map.addSource('overlays', { type: 'geojson', data: 'overlays.geojson' });
      const styleLayers = map.getStyle().layers || [];
      const firstSymbol = styleLayers.find(l => l.type === 'symbol');
      const beforeSymbolId = firstSymbol ? firstSymbol.id : undefined;
      const safeAddLayer = (def, before) => {
        if (!map.getLayer(def.id)) {
          try { map.addLayer(def, before); } catch (e) { /* ignore */ }
        }
      };
      safeAddLayer({ id: 'parking-fill', type: 'fill', source: 'overlays', filter: ['==', 'feature', 'parking'], paint: { 'fill-color': '#CA9921', 'fill-opacity': 0.15 } }, beforeSymbolId);
      safeAddLayer({ id: 'parking-outline', type: 'line', source: 'overlays', filter: ['==', 'feature', 'parking'], paint: { 'line-color': '#CA9921', 'line-width': 2, 'line-opacity': 0.8 } }, beforeSymbolId);
      safeAddLayer({ id: 'route-line', type: 'line', source: 'overlays', filter: ['==', 'feature', 'route'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#CA9921', 'line-width': 4, 'line-dasharray': [1, 1.5] } }, beforeSymbolId);
    } catch (e) { /* ignore */ }

    // Popup on store click
    try {
      const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true });
      map.on('click', 'store-icon-layer', e => {
        if (!e.features || !e.features.length) return;
        const pref = getPreferredMaps();
        popup.setLngLat(e.features[0].geometry.coordinates)
          .setHTML('<strong>SchrankGold</strong><br/>Am Rätschenbach 11<br/>85435 Erding<br/><em>Mi 10–18, Do–Fr 10–13 &amp; 15–18 Uhr</em><br/><small><a href="' + pref.url + '" target="_blank" rel="noopener">In ' + (pref.provider === 'apple' ? 'Apple Maps' : 'Google Maps') + ' öffnen</a></small>')
          .addTo(map);
      });
      map.on('mouseenter', 'store-icon-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'store-icon-layer', () => { map.getCanvas().style.cursor = ''; });
    } catch (e) { /* ignore */ }

    // Fit view to store + parking
    fetch('overlays.geojson').then(r => r.json()).then(gj => {
      const store = gj.features.find(f => f.properties && f.properties.feature === 'store' && f.geometry.type === 'Point');
      const parking = gj.features.find(f => f.properties && f.properties.feature === 'parking' && f.geometry.type === 'Polygon');
      if (!store || !parking) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const expand = ([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
      expand(store.geometry.coordinates);
      parking.geometry.coordinates.forEach(ring => ring.forEach(expand));
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const padding = isMobile ? { top: 50, bottom: 80, left: 40, right: 40 } : { top: 70, bottom: 100, left: 110, right: 110 };
      map.fitBounds([[minX, minY], [maxX, maxY]], { padding, duration: 900, maxZoom: isMobile ? 16.3 : 17.0 });
    }).catch(() => {});

    addSvgIcon(map, 'favicon.svg', 'store-icon', svg => svg.replace(/fill="black"/g, 'fill="#4D001B"'), {
      id: 'store-icon-layer', type: 'symbol', source: 'overlays', filter: ['==', 'feature', 'store'],
      layout: { 'icon-image': 'store-icon', 'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.9, 18, 1.8], 'icon-anchor': 'bottom', 'icon-offset': [0, -4], 'icon-allow-overlap': true, 'icon-ignore-placement': true }
    });
    addSvgIcon(map, 'assets/parking-icon.svg', 'parking-icon', svg => svg, {
      id: 'parking-icon-layer', type: 'symbol', source: 'overlays', filter: ['==', 'feature', 'parking'],
      layout: { 'icon-image': 'parking-icon', 'icon-size': 0.55, 'icon-anchor': 'center', 'icon-allow-overlap': true, 'icon-ignore-placement': true }
    }, 'parking-outline');
  });
}

function addSvgIcon(map, url, name, transform, layer, before) {
  fetch(url).then(r => r.text()).then(svg => {
    const blobUrl = URL.createObjectURL(new Blob([transform(svg)], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      try {
        if (!map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 });
        if (!map.getLayer(layer.id)) map.addLayer(layer, before);
      } catch (e) { /* ignore */ }
      URL.revokeObjectURL(blobUrl);
    };
    img.onerror = () => URL.revokeObjectURL(blobUrl);
    img.src = blobUrl;
  }).catch(() => {});
}
