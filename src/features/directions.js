// Route links open Apple Maps on Apple devices and Google Maps everywhere else.

const ADDRESS = 'Am Rätschenbach 11, 85435 Erding';
const COORDS = { lat: 48.306816, lon: 11.908914 };

export function getPreferredMaps() {
  const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent || '');
  const google = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ADDRESS);
  const apple = 'https://maps.apple.com/?address=' + encodeURIComponent('Am Rätschenbach 11,85435,Erding,Germany')
    + `&ll=${COORDS.lat},${COORDS.lon}&q=` + encodeURIComponent('SchrankGold');
  return { provider: isApple ? 'apple' : 'google', url: isApple ? apple : google };
}

export function initDirections() {
  const { url } = getPreferredMaps();
  document.querySelectorAll('[data-directions]').forEach(link => { link.href = url; });
}
