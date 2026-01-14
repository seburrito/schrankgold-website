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
  // Determine preferred map provider (Apple Maps on Apple devices, else Google Maps)
  function getPreferredMaps(){
    const ua = navigator.userAgent || navigator.vendor || '';
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(ua) && !window.MSStream;
    const coords = { lat:48.306816, lon:11.908914 };
    const addrQ = 'Am Rätschenbach 11, 85435 Erding';
    const google = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addrQ);
    const apple = 'https://maps.apple.com/?address=' + encodeURIComponent('Am Rätschenbach 11,85435,Erding,Germany') + '&ll=' + coords.lat + ',' + coords.lon + '&q=' + encodeURIComponent('SchrankGold');
    return { provider: isApple ? 'apple' : 'google', url: isApple ? apple : google, google, apple };
  }
  // Initialize address link if present
  (function initAddressLink(){
    const btn = document.getElementById('store-directions-btn');
    if(!btn) return;
    const pref = getPreferredMaps();
    btn.href = pref.url;
    btn.dataset.provider = pref.provider;
  })();

  /* ================== PARALLAX FOR HOURS TOWER ================== */
  (function initHoursParallax(){
    const bg = document.querySelector('.hours-bg');
    const section = document.querySelector('.hours-section');
    if(!bg || !section) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // respect user preference
    let ticking = false;
  const MAX_SHIFT = 80; // reduced shift so tower appears more grounded
    function compute(){
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Progress: when top enters viewport (0) until bottom leaves (1)
      const total = rect.height + vh;
      const visibleProgress = 1 - (rect.bottom / total); // 0 -> 1 as we scroll through
      const clamped = Math.min(Math.max(visibleProgress, 0), 1);
      // Apply easing (gentle) so movement starts subtle
      const eased = 1 - Math.pow(1 - clamped, 2);
      const shift = -eased * MAX_SHIFT; // negative to move slightly upward (parallax slower than scroll)
      bg.style.setProperty('--hours-parallax', shift.toFixed(2) + 'px');
      ticking = false;
    }
    function onScroll(){
      if(!ticking){
        ticking = true;
        requestAnimationFrame(compute);
      }
    }
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', onScroll, { passive:true });
    compute();
  })();
  /* ================== PARALLAX FOR WELCOME TOWER ================== */
  (function initWelcomeParallax(){
    const bg = document.querySelector('.welcome-bg');
    const section = document.querySelector('#welcome');
    if(!bg || !section) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    let ticking = false;
    const MAX_SHIFT = 110; // stronger vertical travel (was 60) so effect is more pronounced
    function compute(){
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Progress through section: when top hits top of viewport (0) until bottom passes bottom (1)
      const total = rect.height + vh;
      const visibleProgress = 1 - (rect.bottom / total); // 0 -> 1
      const clamped = Math.min(Math.max(visibleProgress, 0), 1);
      // Ease for subtle start
      const eased = 1 - Math.pow(1 - clamped, 2);
      // Move slower than scroll: upward (negative) or downward depending on desired effect
      const shift = -eased * MAX_SHIFT; // negative -> slight upward drift
      bg.style.setProperty('--welcome-parallax', shift.toFixed(2) + 'px');
      ticking = false;
    }
    function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(compute); } }
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', onScroll, { passive:true });
    compute();
  })();
  /* ================== PARALLAX FOR FOUNDER SVG (exclude dark bottle) ================== */
  (function initFounderParallax(){
    const section = document.querySelector('.founder-section');
    const svg = section && section.querySelector('.founder-image');
    if(!section || !svg) return;
    // Moving group: everything except #dark-bottle stays wrapped in <g id="gabi"> in inlined SVG
    const movingGroup = svg.querySelector('#gabi');
    const darkBottle = svg.querySelector('#dark-bottle');
    if(!movingGroup) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // respect user preference
    let ticking = false;
    // CONFIG
  const MAX_SHIFT = 100; // stronger upward travel for clear parallax (previous 42)
  const BASELINE_OFFSET = 110; // keep initial grounded feel while allowing larger travel
  const START_THRESHOLD = 0.05; // smaller dead zone so motion starts earlier
    const DARK_BOTTLE_PIN = true; // keep dark bottle visually pinned
    function compute(){
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = rect.height + vh;
      let progress = 1 - (rect.bottom / total); // raw 0..1
      // Dead zone at start so image sits grounded longer
      if (progress < START_THRESHOLD) progress = 0; else progress = (progress - START_THRESHOLD) / (1 - START_THRESHOLD);
      const clamped = Math.min(Math.max(progress, 0), 1);
      // Ease (cubic) for gentle entry / soft finish
      const eased = 1 - Math.pow(1 - clamped, 3);
      const travel = eased * MAX_SHIFT; // positive scalar (0..MAX_SHIFT)
      // movingGroup goes UP (negative translateY) from its lowered baseline
      const movingTranslate = BASELINE_OFFSET - travel;
      movingGroup.style.transform = `translateY(${movingTranslate.toFixed(2)}px)`;
      if (darkBottle && DARK_BOTTLE_PIN){
        // Counter the moving group's shift so dark bottle appears fixed in document space:
        // Net Y = movingTranslate + bottleTranslate = 0 => bottleTranslate = -movingTranslate
        darkBottle.style.transform = `translateY(${(-movingTranslate).toFixed(2)}px)`;
        darkBottle.style.transformBox = 'fill-box';
        darkBottle.style.transformOrigin = 'center';
      }
      ticking = false;
    }
    function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(compute); } }
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', onScroll, { passive:true });
    compute();
  })();
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
  const wardrobeContainer = document.getElementById('wardrobe-container');
  if (wardrobeContainer && wardrobeContainer.dataset.src) {
    fetch(wardrobeContainer.dataset.src)
      .then(r => r.text())
      .then(svg => { wardrobeContainer.innerHTML = svg; initWardrobeAnimation(); })
      .catch(initWardrobeAnimation);
  } else initWardrobeAnimation();

  // Load sidebar crown icon SVG
  const crownIconContainer = document.getElementById('sidebar-crown-icon');
  if (crownIconContainer && crownIconContainer.dataset.src) {
    fetch(crownIconContainer.dataset.src)
      .then(r => r.text())
      .then(svg => { crownIconContainer.innerHTML = svg; })
      .catch(console.error);
  }

  // Hamburger Menu
  (function initHamburgerMenu() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const sideNav = document.querySelector('.side-nav');
    const pageOverlay = document.querySelector('.page-overlay');
    const navLinks = document.querySelectorAll('.side-nav-links a');
    const logoLink = document.querySelector('.side-nav-logo-link');

    function toggleMenu() {
      const isOpen = hamburgerBtn.getAttribute('aria-expanded') === 'true';
      hamburgerBtn.setAttribute('aria-expanded', !isOpen);
      document.body.classList.toggle('nav-open', !isOpen);
    }

    function closeMenu() {
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }

    hamburgerBtn.addEventListener('click', toggleMenu);
    pageOverlay.addEventListener('click', closeMenu);
    navLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });
    if (logoLink) {
      logoLink.addEventListener('click', closeMenu);
    }
  })();

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
    // Set them via data attributes on the map element for easier editing without touching JS:
    //   <div id="store-map" data-mt-key="YOUR_KEY" data-mt-style="YOUR_STYLE_ID"></div>
    const MAPTILER_KEY = mapEl.getAttribute('data-mt-key') || 'IAwxH9Qf6uoA1zhZTKlI';
    const MAPTILER_STYLE_ID = mapEl.getAttribute('data-mt-style') || '0199f703-1173-7298-81df-98d97011dd27';
    const explicitUrl = mapEl.getAttribute('data-mt-url');
    let REMOTE_STYLE_URL = `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/style.json?key=${MAPTILER_KEY}`;
    if (explicitUrl) {
      // If user provided full style URL, append key if missing
      if (/key=/.test(explicitUrl)) REMOTE_STYLE_URL = explicitUrl;
      else REMOTE_STYLE_URL = explicitUrl + (explicitUrl.includes('?') ? '&' : '?') + 'key=' + MAPTILER_KEY;
    }
    const STYLE_URL = REMOTE_STYLE_URL;

    function build(reason){
      if(initialized) return; initialized = true;
      if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer=null; }
      console.log('[MapLibre] Initializing. Reason:', reason||'');
      
      const map = new maplibregl.Map({
        container: mapEl,
        style: STYLE_URL,
        attributionControl: true,
        interactive: true,
        pitch: parseFloat(mapEl.getAttribute('data-pitch')) || 15,
        center: [11.90903, 48.30709], // Default center, will be updated by fitBounds
        zoom: 15, // Default zoom
        bearing: 20
      });
      window._sgMap = map; // expose for console debugging
      map.addControl(new maplibregl.NavigationControl({ showCompass:false }), 'top-right');

      map.once('load', () => {
        console.log('[MapLibre] map load event');
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
            paint:{ 'fill-color':'#CA9921', 'fill-opacity':0.15 }
          }, beforeSymbolId);
          // Parking outline
          safeAddLayer({
            id:'parking-outline',
            type:'line',
            source:'overlays',
            filter:['==','feature','parking'],
            paint:{ 'line-color':'#CA9921', 'line-width':2, 'line-opacity':0.8 }
          }, beforeSymbolId);
          // Route dashed line
          safeAddLayer({
            id:'route-line',
            type:'line',
            source:'overlays',
            filter:['==','feature','route'],
            layout:{ 'line-cap':'round', 'line-join':'round' },
            paint:{ 'line-color':'#CA9921', 'line-width':4, 'line-dasharray':[1,1.5] }
          }, beforeSymbolId);
        } catch(layerErr){ console.warn('[MapLibre] overlay layer setup failed', layerErr); }

        // Add popup on store click
        try {
          const popup = new maplibregl.Popup({ closeButton:true, closeOnClick:true });
          map.on('click','store-icon-layer', e => {
            if (!e.features || !e.features.length) return;
            const f = e.features[0];
            const pref = getPreferredMaps();
            popup.setLngLat(f.geometry.coordinates)
              .setHTML('<strong>SchrankGold</strong><br/>Am Rätschenbach 11<br/>85435 Erding<br/><em>Di–Fr 10–18, Sa 10–14</em><br/><small><a href="'+pref.url+'" target="_blank" rel="noopener">In '+(pref.provider==='apple'?'Apple Maps':'Google Maps')+' öffnen</a></small>')
              .addTo(map);
          });
          map.on('mouseenter','store-icon-layer', ()=> map.getCanvas().style.cursor='pointer');
          map.on('mouseleave','store-icon-layer', ()=> map.getCanvas().style.cursor='');
        } catch(e){ console.warn('[MapLibre] popup failed', e); }

        // Fit view to the essential features
        (async () => {
          try {
            const res = await fetch('overlays.geojson');
            const gj = await res.json();
            const store = gj.features.find(f => f.properties && f.properties.feature === 'store' && f.geometry.type === 'Point');
            const parking = gj.features.find(f => f.properties && f.properties.feature === 'parking' && f.geometry.type === 'Polygon');
            
            if (store && parking) {
              let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
              function expand(coord){ const [x,y]=coord; if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
              
              expand(store.geometry.coordinates);
              parking.geometry.coordinates.forEach(ring => ring.forEach(expand));

              const isMobile = window.matchMedia('(max-width: 640px)').matches;
              const padding = isMobile ? { top: 50, bottom: 80, left: 40, right: 40 } : { top: 70, bottom: 100, left: 110, right: 110 };
              map.fitBounds([[minX,minY],[maxX,maxY]], { padding, duration: 900, maxZoom: isMobile ? 16.3 : 17.0 });
            }
          } catch(e){
            console.warn('[MapLibre] fitBounds to features failed', e);
          }
        })();

        // Replace circle store marker with favicon image symbol
        fetch('favicon.svg')
          .then(r=>r.text())
          .then(svg=>{
            try {
              const cssDarkerRed = getComputedStyle(document.documentElement).getPropertyValue('--color-darker-red').trim() || '#4D001B';
              svg = svg.replace(/fill="black"/g, `fill="${cssDarkerRed}"`);
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
                      'icon-size':["interpolate", ["linear"], ["zoom"], 10, 0.9, 18, 1.8],
                      'icon-anchor':'bottom',
                      'icon-offset':[0,-4],
                      'icon-allow-overlap': true,
                      'icon-ignore-placement': true
                    }
                  });
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

  /* ================== OPENING HOURS STATUS ================== */
  (function initOpeningHours(){
    const statusEl = document.getElementById('hours-status');
    if (!statusEl) return;
    const textEl = statusEl.querySelector('.hours-status__text');
    const iconEl = statusEl.querySelector('.hours-status__icon');
    // Hours definition (local time Europe/Berlin) using minutes from midnight
    // Wednesday (3), Thursday (4), Friday (5), Saturday (6)
    // For split days use array of [start,end]
    const HOURS = {
      3: [[10*60, 18*60]], // Wed
      4: [[10*60, 13*60],[15*60,18*60]], // Thu
      5: [[10*60, 13*60],[15*60,18*60]], // Fri
      // Saturday: only first & last of month 10-13
      6: 'special-sat'
    };
    function isFirstOrLastSaturday(date){
      const d = new Date(date.getTime());
      // First Saturday: day >=1 .. 7 and day is Saturday
      const day = d.getDate();
      // Last Saturday: advance to next month - go back to last Saturday
      const nextMonth = new Date(d.getFullYear(), d.getMonth()+1, 0); // last day of month
      const lastDate = nextMonth.getDate();
      return (day <= 7 || day > lastDate - 7);
    }
    function todaysIntervals(local){
      const dow = local.getDay(); // 0 Sun
      if (!(dow in HOURS)) return [];
      if (HOURS[dow] === 'special-sat'){
        if (!isFirstOrLastSaturday(local)) return [];
        return [[10*60,13*60]];
      }
      return HOURS[dow];
    }
    function minutesNow(local){ return local.getHours()*60 + local.getMinutes(); }
    function classify(now){
      // Determine next open/close transitions within coming 7 days
      const TZ_OFFSET = now.getTimezoneOffset(); // minutes difference to UTC (ignored for relative)
      const current = new Date(now.getTime());
      const todayIntervals = todaysIntervals(current);
      const mNow = minutesNow(current);
      let isOpen = false; let minutesUntilClose = null; let minutesUntilOpen = null;
      for (const [s,e] of todayIntervals){
        if (mNow >= s && mNow < e){
          isOpen = true; minutesUntilClose = e - mNow; break;
        } else if (mNow < s){
          if (minutesUntilOpen == null) minutesUntilOpen = s - mNow; // next open today
        }
      }
      if (!isOpen && minutesUntilOpen == null){
        // search next open day up to 14 days ahead (covers month boundary for Saturdays)
        for (let d=1; d<=14; d++){
          const future = new Date(now.getTime() + d*24*60*60000);
            const intervals = todaysIntervals(future);
            if (intervals.length){
              minutesUntilOpen = (24*60 - mNow) + (d-1)*24*60 + (intervals[0][0]);
              // Attach target date on helper for message composition
              classify._nextOpenDate = future;
              break;
            }
        }
      }
      // New message spec:
      // 1. Jetzt geöffnet bis 16:00 Uhr.  (open > 60m until close)
      // 2. Noch geöffnet bis 15:00 Uhr     (open <= 60m until close)
      // 3. Öffnet bald um 15:00 Uhr        (closed, next open within 60m, same or future day)
      // 4. Jetzt geschlossen bis 15:00 Uhr  (closed, next open later today >60m)
      // 5. Jetzt geschlossen bis Di. 15:00 Uhr (closed, next open not today)
      // Determine state & message mapping while preserving existing CSS state classes where sensible.
      let state = 'closed-long';
      let message = '';
      const weekdayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
      if (isOpen){
        const closeTime = formatTime(addMinutes(now, minutesUntilClose));
        if (minutesUntilClose > 60){
          state = 'open-long';
          message = `Jetzt geöffnet bis ${closeTime} Uhr`;
        } else {
          state = 'open-short';
          message = `Noch geöffnet bis ${closeTime} Uhr`;
        }
      } else if (minutesUntilOpen != null){
        const target = addMinutes(now, minutesUntilOpen);
        const isSameDay = target.getDate() === now.getDate() && target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
        const openTime = formatTime(target);
        if (minutesUntilOpen <= 60){
          state = 'closed-soon';
          message = `Öffnet bald um ${openTime} Uhr`;
        } else if (isSameDay){
          state = 'closed-long';
          message = `Jetzt geschlossen bis ${openTime} Uhr`;
        } else {
          state = 'closed-long';
          const wd = weekdayNames[target.getDay()];
          message = `Jetzt geschlossen bis ${wd}. ${openTime} Uhr`;
        }
      } else {
        // No next opening found (shouldn't happen normally) retain simple fallback
        state = 'closed-long';
        message = 'Heute geschlossen';
      }
      return { state, message, isOpen };
    }
    function addMinutes(date, mins){ return new Date(date.getTime() + mins*60000); }
    function pad(n){ return (n<10?'0':'')+n; }
    function formatTime(d){ return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function formatFutureOpen(now, deltaMins){
      const target = addMinutes(now, deltaMins);
      const weekday = ['So','Mo','Di','Mi','Do','Fr','Sa'][target.getDay()];
      const today = now.toDateString() === target.toDateString();
      return (today ? 'um ' : (weekday+' ')) + formatTime(target);
    }
    let lastState='';
    function update(){
      const now = new Date();
      const { state, message, isOpen } = classify(now);
      if (state !== lastState){
        statusEl.className = 'hours-status hours-status--'+state;
        iconEl.innerHTML = '';
        const svgPath = state.startsWith('open') ? 'assets/icons/check.svg' : 'assets/icons/cross.svg';
        fetch(svgPath)
          .then(r => r.text())
          .then(svg => {
          // Force any hard-coded fills/strokes to currentColor for brand consistency
          svg = svg
            .replace(/fill="(?!none)[^"]*"/gi, 'fill="currentColor"')
            .replace(/stroke="(?!none)[^"]*"/gi, 'stroke="currentColor"');
          iconEl.innerHTML = svg;
          const inserted = iconEl.querySelector('svg');
          if (inserted){ inserted.setAttribute('aria-hidden','true'); inserted.style.width='100%'; inserted.style.height='100%'; }
          })
          .catch(()=>{});
        lastState = state;
      }
      if (textEl) textEl.textContent = message;
    }
    update();
    // Refresh every minute
    setInterval(update, 60000);
  })();

  /* ================== SCROLL ANIMATIONS ================== */
  // Intersection Observer to trigger animations when elements scroll into view
  (function initScrollAnimations() {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Get all elements with data-animate attribute
    const animatedElements = document.querySelectorAll('[data-animate]');
    if (!animatedElements.length) return;

    // Create Intersection Observer with threshold for when animation should trigger
    const observerOptions = {
      root: null, // viewport
      rootMargin: '0px 0px -10% 0px', // trigger when element is 10% from bottom of viewport
      threshold: 0.15 // trigger when at least 15% of element is visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // When element enters viewport, add the animate-in class
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          // Optional: Stop observing after animation to prevent re-triggering
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all animated elements
    animatedElements.forEach(el => observer.observe(el));
  })();
});

