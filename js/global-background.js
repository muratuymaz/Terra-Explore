/* Adds a soft static texture layer on most pages */
(function () {
    if (document.body?.id === "countryBody") {
        return;
    }

    const texture = document.createElement("div");
    texture.className = "global-texture-layer";
    texture.setAttribute("aria-hidden", "true");
    document.body.prepend(texture);
})();
