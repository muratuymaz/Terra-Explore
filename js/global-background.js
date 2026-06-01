/* Adds a soft texture layer that follows the mouse on most pages */
(function () {
    if (document.body?.id === "countryBody") {
        return;
    }

    const texture = document.createElement("div");
    texture.className = "global-texture-layer";
    texture.setAttribute("aria-hidden", "true");
    document.body.prepend(texture);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;

    function updateTarget(clientX, clientY) {
        const x = (clientX / window.innerWidth) * 100;
        const y = (clientY / window.innerHeight) * 100;

        targetX = Math.max(0, Math.min(100, x));
        targetY = Math.max(0, Math.min(100, y));
    }

    function animate() {
        const easing = reduceMotion.matches ? 0.03 : 0.07;
        currentX += (targetX - currentX) * easing;
        currentY += (targetY - currentY) * easing;

        texture.style.setProperty("--texture-x", currentX + "%");
        texture.style.setProperty("--texture-y", currentY + "%");

        window.requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", (event) => {
        updateTarget(event.clientX, event.clientY);
    }, { passive: true });

    window.addEventListener("touchmove", (event) => {
        const touch = event.touches[0];

        if (!touch) {
            return;
        }

        updateTarget(touch.clientX, touch.clientY);
    }, { passive: true });

    window.requestAnimationFrame(animate);
})();