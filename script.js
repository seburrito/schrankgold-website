document.addEventListener('DOMContentLoaded', function() {
    // Wardrobe Elements
    const doorLeft = document.querySelector('#door-left-group');
    const doorRight = document.querySelector('#door-right-group');
    const hook = document.querySelector('#coat-hook');

    const bestSecond = document.querySelector('.best-second-subtitle');

    // Calculate the scrollable height
    const scrollHeight = document.body.scrollHeight - window.innerHeight;

    // Hook wobble animation state to ensure it only triggers once
    let wobblyHookTriggered = false;
    // Animation for the wardrobe doors
    function openWardrobeAnimation() {
        const scrollTop = window.scrollY || window.pageYOffset;
        const scrollPercent = Math.min(scrollTop / scrollHeight, 1);

        const maxRotation = 180;
        const rotation = maxRotation * (1 - scrollPercent);

        // Apply rotation to the doors
        doorLeft.style.transform = `rotateY(${rotation}deg)`;
        doorRight.style.transform = `rotateY(${rotation}deg)`;
    }

    // Animation for the text
    function slideUpText() {
        const scrollTop = window.scrollY || window.pageYOffset;
        const triggerPoint = scrollHeight * 0.5; // Adjust when the text starts to appear
        const maxScroll = scrollHeight * 0.2; // Duration over which the text appears

        const textScroll = scrollTop - triggerPoint;
        const textPercent = Math.min(Math.max(textScroll / maxScroll, 0), 1);

        // Update text position and opacity
        bestSecond.style.transform = `translateX(-50%) translateY(${(1 - textPercent) * 100}%)`;
        bestSecond.style.opacity = textPercent;

        return textPercent;
    }

    function wobblyHook() {
        hook.style.transform = `rotate(70deg)`;
    }

    // Scroll Event Handler
    function onScroll() {
        openWardrobeAnimation();
        const textProgress = slideUpText();

        // Trigger the hook wobble animation when other animations are ~90% complete
        if (textProgress > 0.9 && !wobblyHookTriggered) {
            hook.classList.add('wobble-animation'); // Apply the wobble animation
            wobblyHookTriggered = true; // Ensure it only triggers once
        }
        // Reset the wobbly hook trigger to make it wobble again
        if (textProgress == 0 && wobblyHookTriggered) {
            hook.classList.remove('wobble-animation'); // Remove the wobble animation class
            wobblyHookTriggered = false;
        }
    }

    window.addEventListener('scroll', onScroll);

    // Initial update
    onScroll();
});
