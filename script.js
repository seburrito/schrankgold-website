document.addEventListener("DOMContentLoaded", () => {
  const landingSection = document.querySelector(".landing-section");
  const doorLeft = document.querySelector("#door-left-group");
  const doorRight = document.querySelector("#door-right-group");
  const hook = document.querySelector("#coat-hook");
  const bestSecond = document.querySelector(".best-second-subtitle");

  let wobblyHookTriggered = false;

  function onScroll() {
    // The total height of .landing-section is e.g. 200vh in px
    const sectionOffsetTop = landingSection.offsetTop;
    const sectionHeight = landingSection.offsetHeight;
    const currentScrollY = window.scrollY;

    const delayFactor = 0.2; // Adjust this factor to make the wardrobe stay longer
    // maxScroll = 200vh - 100vh = 100vh
    // (the sticky container is 100vh tall, so user can scroll from 0 to 100).
    const maxScroll = (sectionHeight - window.innerHeight) * delayFactor;
    // how far scrolled inside .landing-section
    const scrolledPx = currentScrollY - sectionOffsetTop;
    // clamp [0, maxScroll]
    const clampedScroll = Math.min(Math.max(scrolledPx, 0), maxScroll);
    const scrollPercent = maxScroll > 0 ? clampedScroll / maxScroll : 0;

    // 1) Animate the doors from 180 deg (closed) to 0 deg (open).
    const doorAnimationThreshold = 0.5; // Doors fully open at 50% scroll
    const doorProgress = Math.min(scrollPercent / doorAnimationThreshold, 1);

    if (doorLeft && doorRight) {
      const rotation = 180 * (1 - scrollPercent);
      doorLeft.style.transform = `rotateY(${rotation}deg)`;
      doorRight.style.transform = `rotateY(${rotation}deg)`;
    }

    // 2) Scale the wardrobe AFTER doors open (or overlap slightly)
    const scaleThresholdStart = 0.7; // Scale starts at 40% scroll
    const scaleThresholdEnd = 1.5; // Scale completes at 100% scroll
    const scaleProgress = Math.max(
      (scrollPercent - scaleThresholdStart) /
        (scaleThresholdEnd - scaleThresholdStart),
      0
    );
    const minScale = 1; // Initial scale
    const maxScale = 1.2; // Maximum scale
    const scaleValue =
      minScale + (maxScale - minScale) * Math.min(scaleProgress, 1);

    const wardrobeSvg = document.querySelector("#wardrobe-svg");
    if (wardrobeSvg) {
      wardrobeSvg.style.transform = `scale(${scaleValue})`; // Apply scaling
    }

    // 3) Slide the "best second" text from 30% to 50% of the scroll
    const textProgress = slideUpText(clampedScroll, maxScroll);

    // 4) If you want the coat hook to wobble after text is ~90% in:
    if (hook) {
      if (textProgress > 0.9 && !wobblyHookTriggered) {
        hook.classList.add("wobble-animation");
        wobblyHookTriggered = true;
      }
      if (textProgress === 0 && wobblyHookTriggered) {
        hook.classList.remove("wobble-animation");
        wobblyHookTriggered = false;
      }
    }

    // No need to toggle .animation-complete here, because sticky handles it automatically.
  }

  function slideUpText(scrolledPx, maxScroll) {
    // "best second" text appears from 30% → 50% of the scroll
    const start = 0.3 * maxScroll;
    const end = 0.5 * maxScroll;

    if (scrolledPx <= start) {
      // fully hidden
      bestSecond.style.transform = "translateY(100%)";
      bestSecond.style.opacity = "0";
      return 0;
    } else if (scrolledPx >= end) {
      // fully visible
      bestSecond.style.transform = "translateY(0)";
      bestSecond.style.opacity = "1";
      return 1;
    } else {
      // in-between
      const progress = (scrolledPx - start) / (end - start);
      const translateY = (1 - progress) * 100;
      bestSecond.style.transform = `translateY(${translateY}%)`;
      bestSecond.style.opacity = progress;
      return progress;
    }
  }

  window.addEventListener("scroll", onScroll);
  onScroll(); // run once at load
});

// Wait for the Instagram embed script to load and process the blockquote
window.addEventListener("load", function () {
  // Find the Instagram embed container
  const embed = document.querySelector(".instagram-photo .instagram-media");

  if (embed) {
    // Hide all unwanted elements except the media (image/video)
    const children = embed.querySelectorAll("div");
    children.forEach((child, index) => {
      if (index !== 2) {
        child.style.display = "none"; // Hide everything except the media
      }
    });
  }
});

// Instagram Gallery Navigation
document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("slider");
  let currentIndex = 0;

  function updateSlider() {
    const offset = -currentIndex * 100;
    slider.style.transform = `translateX(${offset}%)`;
  }

  window.nextSlide = function () {
    if (currentIndex < slider.children.length - 1) {
      currentIndex++;
      updateSlider();
    }
  };

  window.prevSlide = function () {
    if (currentIndex > 0) {
      currentIndex--;
      updateSlider();
    }
  };
});

// Hamburger Menu Visibility and Open / Close
document.addEventListener("DOMContentLoaded", () => {
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const menu = document.querySelector("nav ul");
  console.log(menu); // Check if the menu element is correctly selected
  const menuItems = document.querySelectorAll("nav ul li a");
  const landingSection = document.querySelector(".landing-section");

  // Function to toggle the visibility of the hamburger menu based on scroll
  function toggleHamburgerMenu() {
    const landingBottom = landingSection.getBoundingClientRect().bottom;

    if (landingBottom <= 0) {
      hamburgerMenu.classList.add("visible"); // Show the button
    } else {
      hamburgerMenu.classList.remove("visible"); // Hide the button
    }
  }

  // Function to toggle the menu visibility
  function toggleMenu() {
    menu.classList.toggle("active");
    console.log("Menu class list:", menu.classList);
  }

  // Function to close the menu when a menu item is clicked
  function closeMenu() {
    menu.classList.remove("active");
  }

  // Event listener for the hamburger menu button
  hamburgerMenu.addEventListener("click", (e) => {
    console.log("Hamburger menu clicked!");
    e.stopPropagation(); // Ensure event doesn't bubble to other elements
    toggleMenu();
  });

  // Event listener for menu items
  menuItems.forEach((item) => {
    item.addEventListener("click", closeMenu);
  });

  // Add scroll event listener for showing/hiding the hamburger button
  window.addEventListener("scroll", toggleHamburgerMenu);

  // Ensure the hamburger menu is hidden initially
  toggleHamburgerMenu();
});

// Open Lightbox
function openLightbox(element) {
  const imgSrc = element.querySelector("img").src;
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const navBar = document.querySelector("nav");

  lightboxImg.src = imgSrc; // Set the clicked image in the lightbox
  lightbox.classList.add("active"); // Show lightbox
  navBar.style.display = "none"; // Hide the nav bar
}

// Close Lightbox
function closeLightbox() {
  document.getElementById("lightbox").classList.remove("active");
  document.querySelector("nav").style.display = "block"; // Show the nav bar
}

// Close lightbox with ESC key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
  }
});
