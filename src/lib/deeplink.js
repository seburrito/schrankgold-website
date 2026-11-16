// Links to a section (#kontakt). The page grows after it loaded (Instagram
// content, pinned sections), so the browser's own jump can land too early and
// we jump again once the layout is final. Ids of the previous website keep working.

import { scrollTo } from './scroll.js';

const LEGACY_IDS = {
  welcome: 'willkommen',
  'so-funktionierts': 'abgeben',
  instagram: 'neuigkeiten',
  location: 'besuch',
  'opening-hours': 'besuch',
  story: 'geschichte',
  contact: 'kontakt'
};

function currentId() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
}

export function normalizeHash() {
  const id = currentId();
  if (LEGACY_IDS[id]) history.replaceState(null, '', '#' + LEGACY_IDS[id]);
}

export function restoreHash() {
  const id = currentId();
  const target = id ? document.getElementById(id) : null;
  if (target) scrollTo(target, { immediate: true });
}
