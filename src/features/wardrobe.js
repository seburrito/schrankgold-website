// Wardrobe + subtitle scroll animation.
// Ported from the original script.js – the timing, easing and values are unchanged.
// The wardrobe SVG is inlined into the page at build time; its start state
// (doors closed, subtitle hidden) comes from hero.css, so nothing jumps when
// this script takes over. With reduced motion the CSS shows the open wardrobe.

import { reducedMotion } from '../lib/dom.js';

export function initWardrobe() {
  const landingSection = document.querySelector('.landing-section');
  const wardrobeSvg = document.querySelector('#wardrobe-svg');
  const doorLeft = document.querySelector('#door-left-group');
  const doorRight = document.querySelector('#door-right-group');
  const hook = document.querySelector('#coat-hook');
  const bestSecond = document.querySelector('.best-second-subtitle');
  const fuerDamen = document.querySelector('.fuer-damen-label');
  const hint = document.querySelector('.scroll-hint');
  if (!landingSection || !bestSecond || reducedMotion) return;

  let lastProgress = -1;
  let wobblyHookTriggered = false;
  let fuerDamenTriggered = false;

  function slideUpText(scrolledPx, maxScroll) {
    const start = 0.3 * maxScroll;
    const end = 0.5 * maxScroll;
    // Fuer Damen handwriting starts after subtitle is fully revealed
    const fuerStart = 0.55 * maxScroll;
    if (scrolledPx <= start) {
      bestSecond.style.transform = 'translateY(100%)';
      bestSecond.style.opacity = '0';
      if (fuerDamen) {
        fuerDamen.style.opacity = '0';
        fuerDamen.classList.remove('handwriting');
        fuerDamenTriggered = false;
      }
      return 0;
    }
    if (scrolledPx >= end) {
      bestSecond.style.transform = 'translateY(0)';
      bestSecond.style.opacity = '1';
    } else {
      const progress = (scrolledPx - start) / (end - start);
      bestSecond.style.transform = `translateY(${(1 - progress) * 100}%)`;
      bestSecond.style.opacity = progress;
    }
    // Trigger fuer-damen handwriting animation
    if (fuerDamen) {
      if (scrolledPx >= fuerStart && !fuerDamenTriggered) {
        fuerDamen.style.opacity = '1';
        fuerDamen.classList.add('handwriting');
        fuerDamenTriggered = true;
      } else if (scrolledPx < fuerStart && fuerDamenTriggered) {
        fuerDamen.style.opacity = '0';
        fuerDamen.classList.remove('handwriting');
        fuerDamenTriggered = false;
      }
    }
    return scrolledPx >= end ? 1 : (scrolledPx - start) / (end - start);
  }

  function onScroll() {
    // In-section scroll progress (0 at section top, 1 at section bottom)
    const rect = landingSection.getBoundingClientRect();
    const sectionTopDoc = window.scrollY + rect.top;
    const sectionHeight = landingSection.offsetHeight;
    const usable = sectionHeight - window.innerHeight;
    const raw = window.scrollY - sectionTopDoc;
    const progress = usable > 0 ? Math.min(Math.max(raw / usable, 0), 1) : 0; // 0..1
    if (progress === lastProgress) return; // e.g. anywhere below the hero: nothing to update
    lastProgress = progress;

    // Portion of progress dedicated to actual animation; remainder = hold fully open
    const animPortion = 0.45;
    const rawAnim = Math.min(progress / animPortion, 1); // linear 0..1
    // Ease-out (cubic): opening starts a touch brisk then slows for emphasis
    const animProgress = 1 - Math.pow(1 - rawAnim, 3);

    if (doorLeft && doorRight) {
      const rotation = 180 * (1 - animProgress);
      doorLeft.style.transform = `rotateY(${rotation}deg)`;
      doorRight.style.transform = `rotateY(${rotation}deg)`;
    }

    if (wardrobeSvg) {
      // Scale kicks in late in animation (after 70% of animation phase)
      const scaleTrigger = 0.7;
      const rawScale = Math.min(Math.max((animProgress - scaleTrigger) / (1 - scaleTrigger), 0), 1);
      const eased = 1 - Math.pow(1 - rawScale, 3);
      const maxScale = 1.12; // grows a little more as it opens (was 1.04)
      const scaleValue = 1 + (maxScale - 1) * eased;
      wardrobeSvg.style.transform = `scale(${scaleValue})`;
    }

    const textProgress = slideUpText(animProgress, 1);
    if (hook) {
      if (textProgress > 0.9 && !wobblyHookTriggered) {
        hook.classList.add('wobble-animation');
        wobblyHookTriggered = true;
      } else if (textProgress === 0 && wobblyHookTriggered) {
        hook.classList.remove('wobble-animation');
        wobblyHookTriggered = false;
      }
    }

    // The scroll hint fades as soon as scrolling starts; the crown dots cheer when fully open
    if (hint) hint.style.opacity = String(Math.max(0, 1 - progress * 14));
    wardrobeSvg?.classList.toggle('is-open', animProgress > 0.97);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
}
