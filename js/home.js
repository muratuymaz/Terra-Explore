import { initHeaderAuth } from "./auth.js";
import { fetchCountriesForMap } from "./api.js";
import { getRecentCountries } from "./travel-data.js";

const COUNTRY_PAGE_PATH = "country.html";

const elements = {
    searchInput: document.querySelector("#searchInput"),
    searchButton: document.querySelector("#searchBtn"),
    searchSuggestions: document.querySelector("#searchSuggestions"),
    errorMessage: document.querySelector("#errorMessage"),
    heroGlobeContainer: document.querySelector("#heroGlobeContainer"),
    recentSearches: document.querySelector("#recentSearches"),
    worldMapContainer: document.querySelector("#worldMapContainer"),
    mapFeedback: document.querySelector("#mapFeedback")
};
const MAX_SUGGESTIONS = 6;
const HERO_GLOBE_TEXTURE = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const HERO_GLOBE_BUMP = "https://unpkg.com/three-globe/example/img/earth-topology.png";
const HERO_GLOBE_BACKGROUND = "rgba(255, 249, 240, 0)";
let worldMap = null;
let worldMarkersLayer = null;
let heroGlobe = null;
let countryNames = [];
let visibleSuggestions = [];
let activeSuggestionIndex = -1;
const markerPalette = [
    { start: "#67a86f", end: "#3c7551", ring: "rgba(78, 131, 95, 0.26)" },
    { start: "#d98a54", end: "#b35d39", ring: "rgba(201, 126, 71, 0.24)" },
    { start: "#c96b74", end: "#9f4759", ring: "rgba(187, 92, 109, 0.24)" },
    { start: "#6d94cb", end: "#4d6ea7", ring: "rgba(98, 135, 189, 0.24)" },
    { start: "#b09152", end: "#876933", ring: "rgba(162, 131, 70, 0.24)" },
    { start: "#5aa7a1", end: "#357c78", ring: "rgba(79, 154, 147, 0.24)" }
];

/* Cleans extra spaces before the value is used in the URL */
function normalizeCountryName(value) {
    return value
        .trim()
        .split(" ")
        .filter(Boolean)
        .join(" ");
}

/* Normalizes the value for country-name lookups without changing the visible text */
function normalizeCountryLookup(value) {
    return normalizeCountryName(value).toLowerCase();
}

/* Builds the detail page URL with the selected country name */
function buildCountryPageUrl(countryName) {
    return COUNTRY_PAGE_PATH + "?name=" + encodeURIComponent(countryName);
}

/* Keeps the small validation message under the search area in sync */
function setError(message = "") {
    if (!elements.errorMessage) {
        return;
    }

    elements.errorMessage.textContent = message;
    elements.errorMessage.hidden = !message;
}

/* Finds the saved country name that matches the current input */
function findCountryMatch(countryName) {
    const normalizedCountryName = normalizeCountryLookup(countryName);

    if (!normalizedCountryName) {
        return "";
    }

    const matchedCountry = countryNames.find((countryNameItem) => normalizeCountryLookup(countryNameItem) === normalizedCountryName);

    if (!matchedCountry) {
        return "";
    }

    return matchedCountry;
}

/* Enables the search button only when the input matches a real country */
function updateSearchButtonState() {
    if (!elements.searchButton) {
        return;
    }

    let inputValue = "";

    if (elements.searchInput) {
        inputValue = elements.searchInput.value;
    }

    elements.searchButton.disabled = !Boolean(findCountryMatch(inputValue));
}

/* Creates the decorative 3D globe in the landing area without affecting the real map below */
function loadHeroGlobe() {
    if (!elements.heroGlobeContainer || !window.Globe || heroGlobe) {
        return;
    }

    const containerWidth = elements.heroGlobeContainer.clientWidth || 520;
    let containerHeight = 360;

    if (window.innerWidth <= 768) {
        containerHeight = 280;
    }

    heroGlobe = window.Globe()(elements.heroGlobeContainer)
        .width(containerWidth)
        .height(containerHeight)
        .backgroundColor(HERO_GLOBE_BACKGROUND)
        .globeImageUrl(HERO_GLOBE_TEXTURE)
        .bumpImageUrl(HERO_GLOBE_BUMP)
        .showAtmosphere(true)
        .atmosphereColor("#cfefff")
        .atmosphereAltitude(0.24);

    heroGlobe.pointOfView({ lat: 18, lng: 16, altitude: 2.1 }, 0);

    const globeMaterial = heroGlobe.globeMaterial();

    globeMaterial.color.set("#eef8ff");
    globeMaterial.emissive.set("#264f5d");
    globeMaterial.emissiveIntensity = 0.14;
    globeMaterial.shininess = 1.1;

    const controls = heroGlobe.controls();

    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minDistance = 260;
    controls.maxDistance = 260;
}

/* Resizes the hero globe when the browser width changes */
function resizeHeroGlobe() {
    if (!heroGlobe || !elements.heroGlobeContainer) {
        return;
    }

    const containerWidth = elements.heroGlobeContainer.clientWidth || 520;
    let containerHeight = 360;

    if (window.innerWidth <= 768) {
        containerHeight = 280;
    }

    heroGlobe.width(containerWidth);
    heroGlobe.height(containerHeight);
}

/* Renders the recent search chips shown on the home page */
function renderRecentSearches() {
    if (!elements.recentSearches) {
        return;
    }

    const recentCountries = getRecentCountries();
    elements.recentSearches.innerHTML = "";

    if (!recentCountries.length) {
        elements.recentSearches.innerHTML = '<p class="empty-state-text">Your recently viewed countries will appear here.</p>';
        return;
    }

    recentCountries.forEach((countryName) => {
        const recentLink = document.createElement("a");

        recentLink.className = "recent-search-chip";
        recentLink.href = buildCountryPageUrl(countryName);
        recentLink.textContent = countryName;
        elements.recentSearches.append(recentLink);
    });
}

/* Hides the autocomplete list and resets its temporary state */
function hideSuggestions() {
    visibleSuggestions = [];
    activeSuggestionIndex = -1;

    if (!elements.searchSuggestions || !elements.searchInput) {
        return;
    }

    elements.searchSuggestions.innerHTML = "";
    elements.searchSuggestions.hidden = true;
    elements.searchInput.setAttribute("aria-expanded", "false");
}

/* Draws the currently visible autocomplete suggestions under the input */
function renderSuggestions() {
    if (!elements.searchSuggestions || !elements.searchInput) {
        return;
    }

    if (!visibleSuggestions.length) {
        hideSuggestions();
        return;
    }

    elements.searchSuggestions.innerHTML = "";

    visibleSuggestions.forEach((countryName, index) => {
        const suggestionButton = document.createElement("button");

        suggestionButton.type = "button";
        suggestionButton.className = "suggestion-item";
        suggestionButton.textContent = countryName;
        suggestionButton.classList.toggle("is-active", index === activeSuggestionIndex);
        suggestionButton.setAttribute("data-index", String(index));
        suggestionButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectSuggestion(countryName);
        });
        suggestionButton.addEventListener("click", () => {
            redirectToCountry(countryName);
        });
        elements.searchSuggestions.append(suggestionButton);
    });

    elements.searchSuggestions.hidden = false;
    elements.searchInput.setAttribute("aria-expanded", "true");
}

/* Applies one suggestion back into the input field */
function selectSuggestion(countryName) {
    if (!elements.searchInput) {
        return;
    }

    elements.searchInput.value = countryName;
    setError();
    hideSuggestions();
    updateSearchButtonState();
}

/* Rebuilds the suggestion list from the current input text */
function showSuggestions() {
    let inputValue = "";

    if (elements.searchInput) {
        inputValue = normalizeCountryName(elements.searchInput.value).toLowerCase();
    }

    if (!inputValue || !countryNames.length) {
        hideSuggestions();
        return;
    }

    const startsWithMatches = [];
    const includesMatches = [];

    countryNames.forEach((countryName) => {
        const normalizedName = countryName.toLowerCase();

        if (normalizedName.startsWith(inputValue)) {
            startsWithMatches.push(countryName);
            return;
        }

        if (normalizedName.includes(inputValue)) {
            includesMatches.push(countryName);
        }
    });

    visibleSuggestions = startsWithMatches.concat(includesMatches).slice(0, MAX_SUGGESTIONS);
    activeSuggestionIndex = -1;
    renderSuggestions();
}

/* Sends the user to the country page if the input is usable */
function redirectToCountry(countryName) {
    const normalizedCountryName = normalizeCountryName(countryName);
    const matchedCountryName = findCountryMatch(normalizedCountryName);

    if (!normalizedCountryName) {
        setError("Please enter a country name.");
        if (elements.searchInput) {
            elements.searchInput.focus();
        }
        return;
    }

    if (!matchedCountryName) {
        setError("Please choose a country from the list.");
        showSuggestions();
        if (elements.searchInput) {
            elements.searchInput.focus();
        }
        return;
    }

    setError();
    window.location.href = buildCountryPageUrl(matchedCountryName);
}

/* Reads the current input value and starts the search flow */
function handleSearch() {
    let countryName = "";

    if (elements.searchInput) {
        countryName = elements.searchInput.value;
    }

    redirectToCountry(countryName);
}

/* Starts the Leaflet world map only once */
function ensureWorldMap() {
    if (worldMap || !elements.worldMapContainer || !window.L) {
        return;
    }

    // Keep the map inside the visible world area.
    const southWest = window.L.latLng(-85, -180);
    const northEast = window.L.latLng(85, 180);
    const bounds = window.L.latLngBounds(southWest, northEast);

    worldMap = window.L.map(elements.worldMapContainer, {
        zoomControl: true,
        minZoom: 2,
        worldCopyJump: true,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0
    }).setView([20, 0], 2);

    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(worldMap);

    worldMarkersLayer = window.L.layerGroup().addTo(worldMap);
}

/* Picks one marker color family from the shared palette */
function getMarkerPalette(countryName) {
    const paletteIndex = [...countryName].reduce((total, char) => total + char.charCodeAt(0), 0) % markerPalette.length;

    return markerPalette[paletteIndex];
}

/* Builds the custom country marker with its flag and color shell */
function createCountryMarkerIcon(countryName, flagUrl) {
    const { start, end, ring } = getMarkerPalette(countryName);
    const hasFlag = Boolean(flagUrl);
    let flagMarkup = "";

    if (hasFlag) {
        flagMarkup = `<span class="country-marker-flag"><img src="${flagUrl}" alt="${countryName} flag"></span>`;
    }

    return window.L.divIcon({
        className: "country-marker-icon",
        html: `
            <span class="country-marker-pole"></span>
            <span class="country-marker-shell ${hasFlag ? "has-flag" : ""}" style="--marker-start:${start}; --marker-end:${end}; --marker-ring:${ring};">
                <span class="country-marker-halo"></span>
                <span class="country-marker-core"></span>
                <span class="country-marker-dot"></span>
                ${flagMarkup}
            </span>
        `,
        iconSize: [24, 34],
        iconAnchor: [12, 32]
    });
}

/* Places all clickable country markers on the world map */
function renderCountryMarkers(countries) {
    ensureWorldMap();

    if (!worldMap || !worldMarkersLayer) {
        if (elements.mapFeedback) {
            elements.mapFeedback.textContent = "Map could not be loaded.";
        }
        return;
    }

    worldMarkersLayer.clearLayers();

    countries.forEach((country) => {
        const markerIcon = createCountryMarkerIcon(country.name, country.flagUrl);
        let tooltipText = country.name;

        if (country.capital) {
            tooltipText = country.name + " • " + country.capital;
        }

        window.L.marker([country.lat, country.lng], {
            icon: markerIcon,
            riseOnHover: true
        })
            .bindTooltip(tooltipText, { direction: "top", offset: [0, -10] })
            .on("click", () => redirectToCountry(country.name))
            .addTo(worldMarkersLayer);
    });

    worldMap.invalidateSize();

    if (elements.mapFeedback) {
        elements.mapFeedback.textContent = "Showing " + countries.length + " capital markers. Click one to explore it.";
    }
}

/* Connects the search input and button to the same redirect logic */
function bindSearchControls() {
    if (elements.searchButton) {
        elements.searchButton.addEventListener("click", handleSearch);
    }

    if (!elements.searchInput) {
        return;
    }

    elements.searchInput.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" && visibleSuggestions.length) {
            event.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % visibleSuggestions.length;
            renderSuggestions();
            return;
        }

        if (event.key === "ArrowUp" && visibleSuggestions.length) {
            event.preventDefault();

            if (activeSuggestionIndex <= 0) {
                activeSuggestionIndex = visibleSuggestions.length - 1;
            } else {
                activeSuggestionIndex -= 1;
            }

            renderSuggestions();
            return;
        }

        if (event.key === "Escape") {
            hideSuggestions();
            return;
        }

        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();

        if (activeSuggestionIndex >= 0 && visibleSuggestions[activeSuggestionIndex]) {
            redirectToCountry(visibleSuggestions[activeSuggestionIndex]);
            return;
        }

        handleSearch();
    });

    elements.searchInput.addEventListener("input", () => {
        setError();
        showSuggestions();
        updateSearchButtonState();
    });

    elements.searchInput.addEventListener("blur", () => {
        window.setTimeout(hideSuggestions, 100);
    });

    elements.searchInput.addEventListener("focus", () => {
        showSuggestions();
        updateSearchButtonState();
    });
}

/* Loads the country data used by both the map and the autocomplete list */
async function loadWorldMap() {
    if (!elements.worldMapContainer) {
        return;
    }

    try {
        const countries = await fetchCountriesForMap();
        const uniqueCountryNames = [];

        countries.forEach((country) => {
            if (!uniqueCountryNames.includes(country.name)) {
                uniqueCountryNames.push(country.name);
            }
        });

        countryNames = uniqueCountryNames.sort((firstCountry, secondCountry) => firstCountry.localeCompare(secondCountry));
        renderCountryMarkers(countries);
        updateSearchButtonState();
        showSuggestions();
    } catch {
        if (elements.mapFeedback) {
            elements.mapFeedback.textContent = "The map is unavailable right now.";
        }
    }
}

if (elements.searchButton) {
    elements.searchButton.disabled = true;
}

initHeaderAuth();
renderRecentSearches();
bindSearchControls();
loadHeroGlobe();
loadWorldMap();

/* Keeps the decorative globe responsive after the page finishes loading */
window.addEventListener("resize", resizeHeroGlobe);
