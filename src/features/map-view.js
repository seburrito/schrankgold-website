// The MapLibre map itself (loaded on demand by map.js).

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import storeIconSvg from '../assets/img/favicon.svg?raw';
import parkingIconSvg from '../assets/img/parking-icon.svg?raw';

const GOLD = '#CA9921';
const NO_LABELS_BEFORE = 'symbol'; // overlays sit below the style's labels

function addSvgIcon(map, name, svg, layer, before) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    if (!map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 });
    if (!map.getLayer(layer.id)) map.addLayer(layer, before);
    URL.revokeObjectURL(url);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

function boundsOf(overlays) {
  const store = overlays.features.find(f => f.properties?.feature === 'store' && f.geometry.type === 'Point');
  const parking = overlays.features.find(f => f.properties?.feature === 'parking' && f.geometry.type === 'Polygon');
  if (!store || !parking) return null;
  const points = [store.geometry.coordinates, ...parking.geometry.coordinates.flat()];
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

export function buildMap(mapEl, overlays, preferredMaps) {
  const map = new maplibregl.Map({
    container: mapEl,
    style: mapEl.dataset.mtUrl,
    attributionControl: true,
    cooperativeGestures: true,
    locale: {
      'CooperativeGesturesHandler.WindowsHelpText': 'Zum Zoomen Strg + Scrollen verwenden',
      'CooperativeGesturesHandler.MacHelpText': 'Zum Zoomen ⌘ + Scrollen verwenden',
      'CooperativeGesturesHandler.MobileHelpText': 'Karte mit zwei Fingern bewegen'
    },
    pitch: parseFloat(mapEl.dataset.pitch) || 15,
    center: [11.90903, 48.30709],
    zoom: 15,
    bearing: 20
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.on('error', e => console.warn('[map]', e.error?.message || e)); // e.g. map tiles unreachable: the fallback card stays

  map.once('load', () => {
    mapEl.classList.add('is-ready');
    map.addSource('overlays', { type: 'geojson', data: overlays });
    const firstSymbol = map.getStyle().layers.find(layer => layer.type === NO_LABELS_BEFORE)?.id;
    const onParking = ['==', 'feature', 'parking'];
    map.addLayer({ id: 'parking-fill', type: 'fill', source: 'overlays', filter: onParking, paint: { 'fill-color': GOLD, 'fill-opacity': 0.15 } }, firstSymbol);
    map.addLayer({ id: 'parking-outline', type: 'line', source: 'overlays', filter: onParking, paint: { 'line-color': GOLD, 'line-width': 2, 'line-opacity': 0.8 } }, firstSymbol);
    map.addLayer({
      id: 'route-line', type: 'line', source: 'overlays', filter: ['==', 'feature', 'route'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': GOLD, 'line-width': 4, 'line-dasharray': [1, 1.5] }
    }, firstSymbol);

    addSvgIcon(map, 'store-icon', storeIconSvg.replace(/fill="black"/g, 'fill="#4D001B"'), {
      id: 'store-icon-layer', type: 'symbol', source: 'overlays', filter: ['==', 'feature', 'store'],
      layout: {
        'icon-image': 'store-icon',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.9, 18, 1.8],
        'icon-anchor': 'bottom',
        'icon-offset': [0, -4],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });
    addSvgIcon(map, 'parking-icon', parkingIconSvg, {
      id: 'parking-icon-layer', type: 'symbol', source: 'overlays', filter: onParking,
      layout: { 'icon-image': 'parking-icon', 'icon-size': 0.55, 'icon-anchor': 'center', 'icon-allow-overlap': true, 'icon-ignore-placement': true }
    }, 'parking-outline');

    // Popup on the store marker
    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true });
    map.on('click', 'store-icon-layer', e => {
      const provider = preferredMaps.provider === 'apple' ? 'Apple Maps' : 'Google Maps';
      popup.setLngLat(e.features[0].geometry.coordinates)
        .setHTML(`<strong>SchrankGold</strong><br/>Am Rätschenbach 11<br/>85435 Erding<br/><em>MI 10–18 Uhr<br/>DO 10–13 Uhr &amp; 15–18 Uhr<br/>FR 10–13 Uhr &amp; 15–18 Uhr<br/>SA erster und letzter Samstag im Monat 10–13 Uhr</em><br/><small><a href="${preferredMaps.url}" target="_blank" rel="noopener">In ${provider} öffnen</a></small>`)
        .addTo(map);
    });
    map.on('mouseenter', 'store-icon-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'store-icon-layer', () => { map.getCanvas().style.cursor = ''; });

    // Frame the shop and its parking lot
    const bounds = boundsOf(overlays);
    if (bounds) {
      const mobile = window.matchMedia('(max-width: 640px)').matches;
      map.fitBounds(bounds, {
        padding: mobile ? { top: 50, bottom: 80, left: 40, right: 40 } : { top: 70, bottom: 100, left: 110, right: 110 },
        duration: 900,
        maxZoom: mobile ? 16.3 : 17.0
      });
    }
  });
}
