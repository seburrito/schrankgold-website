// Wardrobe + subtitle scroll animation
function initWardrobeAnimation() {
  const landingSection = document.querySelector('.landing-section');
  const doorLeft = document.querySelector('#door-left-group');
  const doorRight = document.querySelector('#door-right-group');
  const hook = document.querySelector('#coat-hook');
  const bestSecond = document.querySelector('.best-second-subtitle');
  if (!landingSection || !bestSecond) return;

  let wobblyHookTriggered = false;

  function slideUpText(scrolledPx, maxScroll) {
    const start = 0.3 * maxScroll;
    const end = 0.5 * maxScroll;
    if (scrolledPx <= start) {
      bestSecond.style.transform = 'translateY(100%)';
      bestSecond.style.opacity = '0';
      return 0;
    }
    if (scrolledPx >= end) {
      bestSecond.style.transform = 'translateY(0)';
      bestSecond.style.opacity = '1';
      return 1;
    }
    const progress = (scrolledPx - start) / (end - start);
    bestSecond.style.transform = `translateY(${(1 - progress) * 100}%)`;
    bestSecond.style.opacity = progress;
    return progress;
  }

  function onScroll() {
    // In-section scroll progress (0 at section top, 1 at section bottom)
    const rect = landingSection.getBoundingClientRect();
    const sectionTopDoc = window.scrollY + rect.top;
    const sectionHeight = landingSection.offsetHeight;
    const usable = sectionHeight - window.innerHeight;
    const raw = window.scrollY - sectionTopDoc;
    const progress = usable > 0 ? Math.min(Math.max(raw / usable, 0), 1) : 0; // 0..1

    // Portion of progress dedicated to actual animation; remainder = hold fully open
  const animPortion = 0.45; // slightly longer opening phase before hold
  let rawAnim = Math.min(progress / animPortion, 1); // linear 0..1
  // Apply an ease-out (cubic) so opening starts a touch brisk then slows for emphasis
  const animProgress = 1 - Math.pow(1 - rawAnim, 3);

    if (doorLeft && doorRight) {
  const rotation = 180 * (1 - animProgress);
      doorLeft.style.transform = `rotateY(${rotation}deg)`;
      doorRight.style.transform = `rotateY(${rotation}deg)`;
    }

    const wardrobeSvg = document.querySelector('#wardrobe-svg');
    if (wardrobeSvg) {
      // Scale kicks in late in animation (after 70% of animation phase)
      const scaleTrigger = 0.7;
      const raw = Math.min(Math.max((animProgress - scaleTrigger) / (1 - scaleTrigger), 0), 1);
      // Ease-out cubic for smoother finish
      const eased = 1 - Math.pow(1 - raw, 3);
  const maxScale = 1.04; // further reduced to avoid oversized wardrobe on laptops
      const scaleValue = 1 + (maxScale - 1) * eased;
      wardrobeSvg.style.transform = `scale(${scaleValue})`;
    }

    // Re-map subtitle slide to animation phase directly
    const subtitleProgress = animProgress; // linear mapping; keep logic in function for easing
    const textProgress = slideUpText(subtitleProgress, 1);
    if (hook) {
      if (textProgress > 0.9 && !wobblyHookTriggered) {
        hook.classList.add('wobble-animation');
        wobblyHookTriggered = true;
      } else if (textProgress === 0 && wobblyHookTriggered) {
        hook.classList.remove('wobble-animation');
        wobblyHookTriggered = false;
      }
    }
  }
  window.addEventListener('scroll', onScroll);
  onScroll();
}

document.addEventListener('DOMContentLoaded', () => {
  // Dynamic underline sizing to match preceding h2 width
  function sizeUnderlines(){
  const MIN = 250; // px (raised from 160 to improve small-screen size)
  const MAX = 480; // px
    const START_VW = 360; // viewport width where growth begins
    const END_VW = 1600; // viewport width where we expect to hit (or approach) MAX
    const DIP_CENTER = 900; // midpoint where underline felt too large before
    const DIP_DEPTH = 0.22; // 22% reduction at center
    const SIGMA = 250; // spread of dip (Gaussian)
    const vw = window.innerWidth;
    const clampedVW = Math.min(Math.max(vw, START_VW), END_VW);
    const linearT = (clampedVW - START_VW) / (END_VW - START_VW); // 0 -> 1
    let base = MIN + linearT * (MAX - MIN);
    // Mid-range dip (Gaussian) to reduce perceived oversizing around tablets / small laptops
  // Apply gaussian dip across all sizes; raised MIN handles small-screen adequacy
  const gauss = Math.exp(-Math.pow(vw - DIP_CENTER, 2) / (2 * SIGMA * SIGMA));
  const factor = 1 - DIP_DEPTH * gauss;
  let targetWidth = base * factor;
    // Ensure monotonic bounds
    if (targetWidth < MIN) targetWidth = MIN;
    if (targetWidth > MAX) targetWidth = MAX;
    document.querySelectorAll('h2 + .title-underline').forEach(ul => {
      const h2 = ul.previousElementSibling;
      if(!h2) return;
      const style = window.getComputedStyle(h2);
      const current = parseFloat(getComputedStyle(ul).width);
      if (Math.abs(current - targetWidth) > 1) {
        ul.style.width = targetWidth + 'px';
      }
      // Alignment for right headings (wrapper handles most, this is safety)
      ul.style.marginLeft = '';
      ul.style.marginRight = '';
      if (style.textAlign === 'right' || h2.classList.contains('sg-section-heading--right') || h2.classList.contains('instagram-heading')) {
        ul.style.marginLeft = 'auto';
      }
    });
  }
  // Observe each h2 for size changes (responsive / font load / wrap changes)
  if (window.ResizeObserver){
    const ro = new ResizeObserver(() => sizeUnderlines());
    document.querySelectorAll('h2').forEach(h => ro.observe(h));
  }
  // Font readiness can shift widths
  if (document.fonts && document.fonts.ready){ document.fonts.ready.then(() => sizeUnderlines()); }
  window.addEventListener('resize', () => { requestAnimationFrame(sizeUnderlines); }, { passive:true });
  sizeUnderlines();
  // Load wardrobe SVG then init animation
  const container = document.getElementById('wardrobe-container');
  if (container && container.dataset.src) {
    fetch(container.dataset.src)
      .then(r => r.text())
      .then(svg => { container.innerHTML = svg; initWardrobeAnimation(); })
      .catch(initWardrobeAnimation);
  } else initWardrobeAnimation();

  // Infinite carousel (rondell) shifting one slide per click
  (function initInfiniteCarousel(){
    const stage = document.querySelector('.carousel-stage');
    const track = document.querySelector('.carousel-slides');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    if (!stage || !track) return;
    const originals = Array.from(track.children);
    if (!originals.length) return;
    const originalCount = originals.length;

    const beforeFrag = document.createDocumentFragment();
    const afterFrag = document.createDocumentFragment();
    originals.forEach(sl => { const c = sl.cloneNode(true); c.setAttribute('aria-hidden','true'); afterFrag.appendChild(c); });
    [...originals].reverse().forEach(sl => { const c = sl.cloneNode(true); c.setAttribute('aria-hidden','true'); beforeFrag.insertBefore(c, beforeFrag.firstChild); });
    track.insertBefore(beforeFrag, track.firstChild);
    track.appendChild(afterFrag);
    const slides = Array.from(track.children);
    let position = originalCount; // first real slide index

    function slidesPerView(){
      const w = stage.clientWidth;
      // 1 slide narrow, 2 slides default, 3 only on ultra-wide viewports
      if (w < 560) return 1;
      if (w < 1800) return 2;
      return 3;
    }
    function unitWidth(){ return stage.clientWidth / slidesPerView(); }
    function applySizes(){ const u = unitWidth(); slides.forEach(sl => sl.style.width = u + 'px'); track.style.width = (u * slides.length) + 'px'; }
    function translate(noAnim=false){ const u = unitWidth(); if (noAnim) track.style.transition='none'; track.style.transform = `translateX(${-position * u}px)`; if (noAnim){ track.getBoundingClientRect(); track.style.transition=''; } }
    function shift(delta){ position += delta; translate(); }
    track.addEventListener('transitionend', () => { if (position >= originalCount * 2){ position -= originalCount; translate(true);} else if (position < originalCount){ position += originalCount; translate(true);} });
    let resizeRaf=null; function onResize(){ cancelAnimationFrame(resizeRaf); resizeRaf=requestAnimationFrame(()=>{ applySizes(); translate(true); }); }
    prevBtn && prevBtn.addEventListener('click', () => shift(-1));
    nextBtn && nextBtn.addEventListener('click', () => shift(1));
    // Swipe / drag support
    let isPointerDown = false;
    let startX = 0, startY = 0, lastDx = 0, dragging = false;
    const SWIPE_THRESHOLD = 40; // px horizontal to trigger shift
  // Momentum + multi-slide fling configuration
  const MOVE_HISTORY_WINDOW_MS = 140; // track last ~140ms of movement to compute velocity
  const VELOCITY_TRIGGER = 0.55; // px per ms (~550px/s) to allow fling even if distance small
  const MAX_SLIDES_PER_FLING = 3; // cap multi-slide movement
  const VELOCITY_SLIDE_FACTOR = 900; // higher -> needs more velocity to add extra slides
  const BASE_DURATION_PER_SLIDE = 0.45; // seconds for 1 slide
  const EXTRA_DURATION_PER_SLIDE = 0.12; // add per extra slide
  const EASING = 'cubic-bezier(.22,.61,.36,1)';
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let moveHistory = []; // Array of {t, x}
    function onPointerDown(e){
      isPointerDown = true; dragging = false; lastDx = 0;
      startX = (e.touches ? e.touches[0].clientX : e.clientX);
      startY = (e.touches ? e.touches[0].clientY : e.clientY);
      track.style.transition = 'none';
      moveHistory.length = 0; // reset history
      const t = performance.now();
      moveHistory.push({ t, x: startX });
    }
    function onPointerMove(e){
      if(!isPointerDown) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      const dx = x - startX; const dy = y - startY;
      if(!dragging){
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) dragging = true; else return; // wait until clear horizontal intent
      }
      if (dragging) {
        lastDx = dx;
        const u = unitWidth();
        // base position translate plus drag offset
        track.style.transform = `translateX(${-position * u + dx}px)`;
        // Record movement history for velocity (keep only recent window)
        const now = performance.now();
        moveHistory.push({ t: now, x });
        // prune old entries
        while (moveHistory.length && (now - moveHistory[0].t) > MOVE_HISTORY_WINDOW_MS) moveHistory.shift();
        if (e.cancelable) e.preventDefault();
      }
    }
    function onPointerUp(){
      if(!isPointerDown){ return; }
      isPointerDown = false;
      track.style.transition = '';
      if (dragging){
        let usedFling = false;
        let slidesToMove = 1;
        let direction = lastDx < 0 ? 1 : -1; // negative drag -> next slide (shift +1)
        const u = unitWidth();
        // Distance-based multi-slide (if user drags more than one width)
        const absUnits = Math.abs(lastDx) / u; // e.g. 1.6 widths -> 2 slides
        if (absUnits >= 0.95) {
          slidesToMove = Math.min(MAX_SLIDES_PER_FLING, Math.round(absUnits));
          usedFling = slidesToMove > 1;
        }
        // Velocity-based fling (if quick short swipe)
        if (!usedFling && moveHistory.length >= 2){
          const first = moveHistory[0];
          const last = moveHistory[moveHistory.length - 1];
          const dt = Math.max(1, last.t - first.t); // ms
            const vx = (last.x - first.x) / dt; // px per ms
          const speed = Math.abs(vx);
          if (speed > VELOCITY_TRIGGER || Math.abs(lastDx) > SWIPE_THRESHOLD){
            // Determine slide count: base on speed (scaled) + partial distance units
            const velocityBonus = speed * (VELOCITY_SLIDE_FACTOR ? (VELOCITY_SLIDE_FACTOR / 1000) : 1) / (VELOCITY_SLIDE_FACTOR / 1000);
            // velocityBonus simplifies to speed (kept for readability if factor tuned later)
            const combined = absUnits + speed * (u / 280); // heuristic: tie speed to width
            slidesToMove = Math.min(MAX_SLIDES_PER_FLING, Math.max(1, Math.round(combined)));
            usedFling = true;
          }
        }
        if (slidesToMove === 1 && Math.abs(lastDx) <= SWIPE_THRESHOLD){
          // Not enough movement: snap back
          translate();
        } else {
          // Apply custom transition duration for multi-slide movement unless reduced motion
          if (!prefersReducedMotion){
            const duration = BASE_DURATION_PER_SLIDE + (slidesToMove - 1) * EXTRA_DURATION_PER_SLIDE;
            track.style.transition = `transform ${duration}s ${EASING}`;
          }
          shift(direction * slidesToMove);
        }
      } else {
        translate();
      }
      dragging = false; lastDx = 0;
      moveHistory.length = 0;
    }
    stage.addEventListener('touchstart', onPointerDown, { passive:true });
    stage.addEventListener('touchmove', onPointerMove, { passive:false });
    stage.addEventListener('touchend', onPointerUp, { passive:true });
    stage.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  // Prevent native image dragging (which blocks our mousemove events)
  stage.addEventListener('dragstart', e => e.preventDefault());
  track.querySelectorAll('img').forEach(img => { img.setAttribute('draggable','false'); });
    stage.addEventListener('keydown', e => { if (e.key==='ArrowLeft') shift(-1); else if (e.key==='ArrowRight') shift(1); });
    stage.tabIndex=0;
    window.addEventListener('resize', onResize, { passive:true });
    applySizes();
    translate(true);
  })();

  // Fixed distance below the bottom of the vertical decorative S line to the CTA block
  (function initHowLineSpacing(){
    const LINE_SELECTOR = '.how-line';
    const CTA_SELECTOR = '.how-details-cta';
    const STEPS_SELECTOR = '.how-steps';
    const FIXED_GAP = 50; // reduced gap below decorative line to CTA
    const lineEl = document.querySelector(LINE_SELECTOR);
    const ctaEl = document.querySelector(CTA_SELECTOR);
    const stepsEl = document.querySelector(STEPS_SELECTOR);
    if (!lineEl || !ctaEl || !stepsEl) return;

    function applyGap(){
      // Only relation: bottom of decorative line + FIXED_GAP = top of CTA (no other influences)
      const lineRect = lineEl.getBoundingClientRect();
      const docLineBottom = window.scrollY + lineRect.top + lineRect.height;
      // Compute desired CTA top position
      const desiredTop = docLineBottom + FIXED_GAP;
      const currentCtaRect = ctaEl.getBoundingClientRect();
      const currentTopDoc = window.scrollY + currentCtaRect.top;
      const delta = desiredTop - currentTopDoc;
      if (Math.abs(delta) > 0.5){
        // Set absolute margin-top relative to document flow: distance from current flow top to desired top
        const naturalTopDoc = currentTopDoc - (parseFloat(ctaEl.style.marginTop)||0);
        const newMargin = desiredTop - naturalTopDoc;
        ctaEl.style.marginTop = newMargin + 'px';
      }
    }

    // Recalculate after fonts/images might change layout
    const roTargets = [lineEl, stepsEl];
    if (window.ResizeObserver){
      const ro = new ResizeObserver(() => applyGap());
      roTargets.forEach(el => el && ro.observe(el));
    }
    window.addEventListener('resize', () => applyGap(), { passive:true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(applyGap);
    // Defer one frame so images have a chance to layout
    requestAnimationFrame(() => applyGap());
  })();

  // Lazy initialize MapLibre GL map when section enters viewport
  (function initMapLibre(){
    if (typeof maplibregl === 'undefined') return; // MapLibre not loaded
    const mapEl = document.getElementById('store-map');
    if(!mapEl) return;
    let initialized = false;
    let fallbackTimer = null;
    // Map style configuration:
    // Provide your MapTiler API key + custom style ID from MapTiler Studio.
    // Example style URL format:
    //   https://api.maptiler.com/maps/{YOUR_STYLE_ID}/style.json?key={YOUR_KEY}
    // Set them via data attributes on the map element for easier editing without touching JS:
    //   <div id="store-map" data-mt-key="YOUR_KEY" data-mt-style="YOUR_STYLE_ID"></div>
    const MAPTILER_KEY = mapEl.getAttribute('data-mt-key') || 'YOUR_MAPTILER_KEY';
    const MAPTILER_STYLE_ID = mapEl.getAttribute('data-mt-style') || 'YOUR_STYLE_ID';
    const explicitUrl = mapEl.getAttribute('data-mt-url');
    let REMOTE_STYLE_URL = `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/style.json?key=${MAPTILER_KEY}`;
    if (explicitUrl) {
      // If user provided full style URL, append key if missing
      if (/key=/.test(explicitUrl)) REMOTE_STYLE_URL = explicitUrl;
      else REMOTE_STYLE_URL = explicitUrl + (explicitUrl.includes('?') ? '&' : '?') + 'key=' + MAPTILER_KEY;
    }
    // Fallback to local custom style if query param localStyle=1 (for dev / offline) else use remote
    const useLocal = /[?&]localStyle=1/.test(window.location.search);
    const STYLE_URL = useLocal ? 'map-style.json' : REMOTE_STYLE_URL;
    if (useLocal) console.debug('[MapLibre] Using local style.json (dev override)');
    else console.debug('[MapLibre] Using remote MapTiler style:', REMOTE_STYLE_URL);
    console.debug('[MapLibre] Setup start');

    // Utility: fit to overlays bounds once data loaded
    async function fitToOverlays(map){
      try {
        const res = await fetch('overlays.geojson');
        const gj = await res.json();
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        function expand(coord){ const [x,y]=coord; if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
        for (const f of gj.features){
          if (f.geometry.type === 'Point'){ expand(f.geometry.coordinates); }
          else if (f.geometry.type === 'LineString'){ f.geometry.coordinates.forEach(expand); }
          else if (f.geometry.type === 'Polygon'){ f.geometry.coordinates.forEach(ring => ring.forEach(expand)); }
        }
        if (minX < Infinity){ map.fitBounds([[minX,minY],[maxX,maxY]], { padding: 60, duration: 800 }); }
      } catch(e){ console.warn('[MapLibre] fit bounds failed', e); }
    }

    function build(reason){
      if(initialized) return; initialized = true;
      if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer=null; }
      console.debug('[MapLibre] Initializing. Reason:', reason||'');
      const initialPitch = parseFloat(mapEl.getAttribute('data-pitch')) || 17.9;
      // Pre-fetch overlays quickly to derive a stable starting view (avoids world flash)
      let startCenter = [11.90903, 48.30709];
      let startZoom = 16.2;
      try {
        // Synchronous start values computed from stored last view (could extend with localStorage later)
        // Fetch asynchronously but we won't delay map creation > one event loop tick
        // Use navigator.connection?.saveData to skip if extreme data saver (not critical)
      } catch(e){}
      const map = new maplibregl.Map({
        container: mapEl,
        style: STYLE_URL,
        attributionControl: true,
        interactive: true,
        pitch: initialPitch,
        center: startCenter,
        zoom: startZoom,
        bearing: 20
      });
      window._sgMap = map; // expose for console debugging
      map.addControl(new maplibregl.NavigationControl({ showCompass:false }), 'top-right');
      map.once('load', () => {
        console.debug('[MapLibre] map load event');
        // Inject custom GeoJSON overlays (store, parking, route) into remote style
        try {
          if (!map.getSource('overlays')) {
            map.addSource('overlays', { type:'geojson', data:'overlays.geojson' });
          }
          // Determine an insertion point: first symbol layer so our fills/lines sit below labels
          const styleLayers = map.getStyle().layers || [];
          const firstSymbol = styleLayers.find(l => l.type === 'symbol');
          const beforeSymbolId = firstSymbol ? firstSymbol.id : undefined;

          function safeAddLayer(def, before){
            if (!map.getLayer(def.id)) {
              try { map.addLayer(def, before); } catch(e){ console.warn('[MapLibre] addLayer failed', def.id, e); }
            }
          }
          // Parking area fill
          safeAddLayer({
            id:'parking-fill',
            type:'fill',
            source:'overlays',
            filter:['==','feature','parking'],
            paint:{ 'fill-color':'#CA9921', 'fill-opacity':0.08 }
          }, beforeSymbolId);
          // Parking outline
            safeAddLayer({
              id:'parking-outline',
              type:'line',
              source:'overlays',
              filter:['==','feature','parking'],
              paint:{ 'line-color':'#CA9921', 'line-width':2.2, 'line-opacity':0.9 }
            }, beforeSymbolId);
          // Route dashed line
          safeAddLayer({
            id:'route-line',
            type:'line',
            source:'overlays',
            filter:['==','feature','route'],
            layout:{ 'line-cap':'round', 'line-join':'round' },
            paint:{ 'line-color':'#CA9921', 'line-width':4, 'line-dasharray':[1,1] }
          }, beforeSymbolId);
          // Store halo + core + label (label before icons so insertion works later)
          safeAddLayer({
            id:'store-halo',
            type:'circle',
            source:'overlays',
            filter:['==','feature','store'],
            paint:{ 'circle-radius':34, 'circle-color':'#5B0E29', 'circle-opacity':0.18 }
          }, beforeSymbolId);
          safeAddLayer({
            id:'store-core',
            type:'circle',
            source:'overlays',
            filter:['==','feature','store'],
            paint:{ 'circle-radius':7, 'circle-color':'#5B0E29', 'circle-stroke-color':'#CA9921', 'circle-stroke-width':2 }
          }, beforeSymbolId);
          // Removed textual / SVG title label layer per latest requirement.
        } catch(layerErr){ console.warn('[MapLibre] overlay layer setup failed', layerErr); }
  // We will compute a final viewport shortly; skip initial world view.
        // Add animated pulsing halo (separate layer) using manual frame updates
        try {
          if (!map.getLayer('store-pulse')) {
            map.addLayer({
              id:'store-pulse',
              type:'circle',
              source:'overlays',
              filter:['==','feature','store'],
              paint:{
                'circle-radius':[ 'interpolate', ['linear'], ['number',['get','_pulse']], 0, 10, 1, 40 ],
                'circle-opacity':[ 'interpolate', ['linear'], ['number',['get','_pulse']], 0, 0.45, 1, 0 ],
                'circle-color':'#CA9921'
              }
            }, 'store-icon-layer');
          }
          // Animate by updating feature state data
          let pulseT = 0;
          const animatePulse = async () => {
            try {
              const src = map.getSource('overlays');
              if (!src || src.type !== 'geojson') return;
              // Fetch original data only once
              if (!window._sgOriginalOverlay){
                const res = await fetch('overlays.geojson');
                window._sgOriginalOverlay = await res.json();
              }
              const clone = JSON.parse(JSON.stringify(window._sgOriginalOverlay));
              pulseT += 0.012; // speed
              const cyc = (pulseT % 1);
              // Set _pulse property for store feature
              clone.features.forEach(f => { if (f.properties && f.properties.feature==='store') f.properties._pulse = cyc; });
              src.setData(clone);
              if (!window._sgStopOrbit) requestAnimationFrame(animatePulse);
            } catch(e){}
          };
          requestAnimationFrame(animatePulse);
        } catch(e) { console.warn('[MapLibre] pulse setup failed', e); }

        // Add popup on store click
        try {
          const popup = new maplibregl.Popup({ closeButton:true, closeOnClick:true });
          map.on('click','store-icon-layer', e => {
            if (!e.features || !e.features.length) return;
            const f = e.features[0];
            popup.setLngLat(f.geometry.coordinates)
        .setHTML('<strong>SchrankGold</strong><br/>Schrannenplatz 8<br/>85435 Erding<br/><em>Di–Fr 10–18, Sa 10–14</em>')
              .addTo(map);
          });
          map.on('mouseenter','store-icon-layer', ()=> map.getCanvas().style.cursor='pointer');
          map.on('mouseleave','store-icon-layer', ()=> map.getCanvas().style.cursor='');
        } catch(e){ console.warn('[MapLibre] popup failed', e); }

        // Parking stripes pattern (diagonal hatch) layer
        try {
          if (!map.hasImage('parking-stripes')) {
            const size = 64; // larger for crisp scaling
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = 'rgba(202,153,33,0.55)';
            ctx.lineWidth = 6;
            // Draw diagonal lines across tile
            for (let i=-size; i<size*2; i+=20){
              ctx.beginPath();
              ctx.moveTo(i, 0);
              ctx.lineTo(i+size, size);
              ctx.stroke();
            }
            map.addImage('parking-stripes', canvas, { pixelRatio:2 });
          }
          if (!map.getLayer('parking-stripes-fill')) {
            map.addLayer({
              id:'parking-stripes-fill',
              type:'fill',
              source:'overlays',
              filter:['==','feature','parking'],
              paint:{
                'fill-pattern':'parking-stripes',
                'fill-opacity':0.55
              }
            }, 'parking-outline');
          }
        } catch(e){ console.warn('[MapLibre] parking stripes failed', e); }

        // Gentle auto-orbit until user interacts
        try {
          let bearing = map.getBearing();
          let lastTime = performance.now();
          const ORBIT_SPEED = 1.2; // degrees per second
          const orbit = (now) => {
            if (window._sgStopOrbit) return;
            const dt = (now - lastTime)/1000;
            lastTime = now;
            bearing += ORBIT_SPEED * dt;
            map.setBearing(bearing % 360, { animate:false });
            requestAnimationFrame(orbit);
          };
          requestAnimationFrame(orbit);
          const stop = () => { window._sgStopOrbit = true; };
          ['dragstart','zoomstart','pitchstart','rotatestart','mousedown','touchstart','wheel'].forEach(ev => map.on(ev, stop));
        } catch(e){ console.warn('[MapLibre] orbit failed', e); }
        // Fly to store feature (if exists) with bearing/pitch animation
        let postAnimViewportApplied = false;
        (async () => {
          try {
            const res = await fetch('overlays.geojson');
            const gj = await res.json();
            const store = gj.features.find(f => f.properties && f.properties.feature === 'store' && f.geometry.type === 'Point');
            const parkingFeatures = gj.features.filter(f => f.properties && f.properties.feature === 'parking');
            let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
            function expand(x,y){ if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
            if (store) expand(store.geometry.coordinates[0], store.geometry.coordinates[1]);
            parkingFeatures.forEach(p => {
              if (p.geometry.type === 'Polygon') p.geometry.coordinates.forEach(r => r.forEach(([x,y])=>expand(x,y)));
              if (p.geometry.type === 'Point') expand(p.geometry.coordinates[0], p.geometry.coordinates[1]);
            });
            const isMobile = window.matchMedia('(max-width: 640px)').matches;
            // Apply bounds quickly after load (small delay so style fully rendered)
            setTimeout(() => {
              if (postAnimViewportApplied) return; postAnimViewportApplied = true;
              if (minX < Infinity){
                const padding = isMobile ? { top: 50, bottom: 80, left: 40, right: 40 } : { top: 70, bottom: 100, left: 110, right: 110 };
                try { map.fitBounds([[minX,minY],[maxX,maxY]], { padding, duration: 900, maxZoom: isMobile ? 16.3 : 17.0 }); } catch(e){}
              }
            }, 700);
          } catch(e){}
        })();
        // Replace circle store marker with favicon image symbol if possible
        fetch('favicon.svg')
          .then(r=>r.text())
          .then(svg=>{
            // Recolor black fills (outline + dots) using CSS variable --color-darker-red (fallback to #4D001B)
            try {
              const cssDarkerRed = getComputedStyle(document.documentElement).getPropertyValue('--color-darker-red').trim() || '#4D001B';
              const safeDarkerRed = cssDarkerRed || '#4D001B';
              svg = svg.replace(/fill=\"black\"/g, `fill="${safeDarkerRed}"`);
            } catch(e){}
            const blob = new Blob([svg], { type:'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              try {
                if (!map.hasImage('store-icon')) map.addImage('store-icon', img, { pixelRatio:2 });
                if (!map.getLayer('store-icon-layer')) {
                  map.addLayer({
                    id:'store-icon-layer',
                    type:'symbol',
                    source:'overlays',
                    filter:['==','feature','store'],
                    layout:{
                      'icon-image':'store-icon',
                      // Larger icon with zoom scaling
                      'icon-size':["interpolate", ["linear"], ["zoom"], 10, 0.95, 14, 1.35, 18, 1.95],
                      'icon-anchor':'bottom',
                      'icon-offset':[0,-4],
                      'icon-allow-overlap': true,
                      'icon-ignore-placement': true
                    }
                  }, undefined); // add on top
                  // Optionally hide original circle layers
                  if (map.getLayer('store-core')) map.setLayoutProperty('store-core','visibility','none');
                  if (map.getLayer('store-halo')) map.setLayoutProperty('store-halo','visibility','none');
                }
              } catch(e){ console.warn('[MapLibre] favicon marker failed', e); }
              URL.revokeObjectURL(url);
            };
            img.onerror = () => URL.revokeObjectURL(url);
            img.src = url;
          })
          .catch(()=>{});

        // Add parking icon symbol layer
        fetch('assets/parking-icon.svg')
          .then(r=>r.text())
          .then(svg=>{
            const blob = new Blob([svg], { type:'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              try {
                if (!map.hasImage('parking-icon')) map.addImage('parking-icon', img, { pixelRatio:2 });
                if (!map.getLayer('parking-icon-layer')) {
                  map.addLayer({
                    id:'parking-icon-layer',
                    type:'symbol',
                    source:'overlays',
                    filter:['==','feature','parking'],
                    layout:{ 'icon-image':'parking-icon', 'icon-size':0.55, 'icon-anchor':'center', 'icon-allow-overlap': true, 'icon-ignore-placement': true }
                  }, 'parking-outline');
                }
              } catch(e){ console.warn('[MapLibre] parking icon failed', e); }
              URL.revokeObjectURL(url);
            };
            img.onerror = () => URL.revokeObjectURL(url);
            img.src = url;
          })
          .catch(()=>{});
      });
      mapEl.setAttribute('tabindex','0');
      // Title SVG layer intentionally omitted (removed per requirement)

      // Responsive sizing logic for icon + title
      function responsiveScale(base){
        // Base grows up to viewport 1400px; below 400px shrink further
        const vw = Math.max(320, Math.min(window.innerWidth, 1400));
        const t = (vw - 320) / (1400 - 320); // 0..1
        const scale = base.min + (base.max - base.min) * t;
        return Math.min(base.max, Math.max(base.min * 0.85, scale));
      }
      function updateResponsiveMarkerSizes(){
        if (!window._sgMap) return;
        const m = window._sgMap;
        // Determine dynamic sizes
        const iconBase = { min: 0.75, max: 1.95 }; // previous max ~1.95
        const iconSize = responsiveScale(iconBase);
        try {
          if (m.getLayer('store-icon-layer')) m.setLayoutProperty('store-icon-layer','icon-size', iconSize);
        } catch(e){}
      }
      window.addEventListener('resize', () => { updateResponsiveMarkerSizes(); });
      // Expose for console tweaking
      window._sgUpdateMarkerSizes = updateResponsiveMarkerSizes;
    }

    function observe(){
      if(!('IntersectionObserver' in window)){ build('no-io'); return; }
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if(e.isIntersecting){ build('intersection'); io.disconnect(); } });
      }, { rootMargin: '200px 0px' });
      io.observe(mapEl);
      fallbackTimer = setTimeout(()=>{ if(!initialized) build('timeout'); }, 3000);
    }
    observe();
  })();
});
