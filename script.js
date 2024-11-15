document.addEventListener('DOMContentLoaded', function() {
    // Wardrobe Elements
    const doorLeft = document.querySelector('#door-left-group');
    const doorRight = document.querySelector('#door-right-group');
    const hook = document.querySelector('#coat-hook');
    const bestSecond = document.querySelector('.best-second-subtitle');
    const landingSection = document.querySelector('.landing-section');
    const fixedElements = document.querySelectorAll('.landing-section-content');

    // Hook wobble animation state to ensure it only triggers once
    let wobblyHookTriggered = false;

    // Scroll Event Handler
    function onScroll() {
        const bounding = landingSection.getBoundingClientRect();
        const landingHeight = landingSection.offsetHeight;
        const viewportHeight = window.innerHeight;
        const sectionTop = bounding.top;

        const maxScroll = landingHeight - viewportHeight;
        const scrollY = -sectionTop; // Negative when scrolling down

        const scrollPercent = Math.min(Math.max(scrollY / maxScroll, 0), 1);

        openWardrobeAnimation(scrollPercent);
        const textProgress = slideUpText(scrollY, maxScroll);

        // Trigger the hook wobble animation when text animation is ~90% complete
        if (textProgress > 0.9 && !wobblyHookTriggered) {
            hook.classList.add('wobble-animation'); // Apply the wobble animation
            wobblyHookTriggered = true; // Ensure it only triggers once
        }
        // Reset the wobble trigger when scrolling back up
        if (textProgress === 0 && wobblyHookTriggered) {
            hook.classList.remove('wobble-animation'); // Remove the wobble animation class
            wobblyHookTriggered = false;
        }

        // Control the position of the fixed content
        if (scrollPercent >= 1) {
            // Animation complete, make elements absolute
            landingSection.classList.add('animation-complete');

            // Set the top position of the elements
            fixedElements.forEach(el => {
                // Calculate the distance from the top of the landing section to the top of the viewport
                const rect = el.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const offsetTop = scrollTop - landingSection.offsetTop + rect.top;

                el.style.top = `${offsetTop}px`;
            });
        } else {
            // Animation not complete, keep elements fixed
            landingSection.classList.remove('animation-complete');

            // Reset the top position
            fixedElements.forEach(el => {
                el.style.top = ''; // Remove inline style
            });
        }
    }

    // Animation for the wardrobe doors
    function openWardrobeAnimation(scrollPercent) {
        const maxRotation = 180;
        const rotation = maxRotation * (1 - scrollPercent);

        // Apply rotation to the doors
        doorLeft.style.transform = `rotateY(${rotation}deg)`;
        doorRight.style.transform = `rotateY(${rotation}deg)`;
    }

    // Animation for the text
    function slideUpText(scrollY, maxScroll) {
        const triggerPoint = maxScroll * 0.5; // Adjust when the text starts to appear
        const textScroll = scrollY - triggerPoint;
        const textMaxScroll = maxScroll * 0.2; // Duration over which the text appears
        const textPercent = Math.min(Math.max(textScroll / textMaxScroll, 0), 1);

        // Update text position and opacity
        bestSecond.style.transform = `translateX(-50%) translateY(${(1 - textPercent) * 100}%)`;
        bestSecond.style.opacity = textPercent;

        return textPercent;
    }

    window.addEventListener('scroll', onScroll);

    // Initial update
    onScroll();
});
