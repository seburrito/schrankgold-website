document.addEventListener('DOMContentLoaded', () => {
    const landingSection = document.querySelector('.landing-section');
    const doorLeft = document.querySelector('#door-left-group');
    const doorRight = document.querySelector('#door-right-group');
    const hook = document.querySelector('#coat-hook');
    const bestSecond = document.querySelector('.best-second-subtitle');
  
    let wobblyHookTriggered = false;
  
    function onScroll() {
      // The total height of .landing-section is e.g. 200vh in px
      const sectionOffsetTop = landingSection.offsetTop;
      const sectionHeight = landingSection.offsetHeight;
      const currentScrollY = window.scrollY;
  
      // maxScroll = 200vh - 100vh = 100vh 
      // (the sticky container is 100vh tall, so user can scroll from 0 to 100).
      const maxScroll = sectionHeight - window.innerHeight;
      // how far scrolled inside .landing-section
      const scrolledPx = currentScrollY - sectionOffsetTop;
      // clamp [0, maxScroll]
      const clampedScroll = Math.min(Math.max(scrolledPx, 0), maxScroll);
      const scrollPercent = (maxScroll > 0) ? (clampedScroll / maxScroll) : 0;
  
      // 1) Animate the doors from 180 deg (closed) at top to 0 deg (open) at bottom.
      //    If either door doesn't exist, skip.
      if (doorLeft && doorRight) {
        const rotation = 180 * (1 - scrollPercent);
        doorLeft.style.transform = `rotateY(${rotation}deg)`;
        doorRight.style.transform = `rotateY(${rotation}deg)`;
      }
  
      // 2) Slide the "best second" text from 30% to 50% of the scroll
      const textProgress = slideUpText(clampedScroll, maxScroll);
  
      // 3) If you want the coat hook to wobble after text is ~90% in:
      if (hook) {
        if (textProgress > 0.9 && !wobblyHookTriggered) {
          hook.classList.add('wobble-animation');
          wobblyHookTriggered = true;
        } 
        if (textProgress === 0 && wobblyHookTriggered) {
          hook.classList.remove('wobble-animation');
          wobblyHookTriggered = false;
        }
      }
  
      // No need to toggle .animation-complete here, because sticky handles it automatically.
    }
  
    function slideUpText(scrolledPx, maxScroll) {
      // "best second" text appears from 30% → 50% of the scroll
      const start = 0.3 * maxScroll;
      const end   = 0.5 * maxScroll;
  
      if (scrolledPx <= start) {
        // fully hidden
        bestSecond.style.transform = 'translateY(100%)';
        bestSecond.style.opacity = '0';
        return 0;
      }
      else if (scrolledPx >= end) {
        // fully visible
        bestSecond.style.transform = 'translateY(0)';
        bestSecond.style.opacity = '1';
        return 1;
      }
      else {
        // in-between
        const progress = (scrolledPx - start) / (end - start);
        const translateY = (1 - progress) * 100;
        bestSecond.style.transform = `translateY(${translateY}%)`;
        bestSecond.style.opacity = progress;
        return progress;
      }
    }
  
    window.addEventListener('scroll', onScroll);
    onScroll(); // run once at load
  });
  