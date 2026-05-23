import { fetchCountriesForMap } from "./api.js";

const COUNTRY_PAGE_PATH = "country.html";

const elements = {
    searchInput: document.querySelector("#searchInput"),
    searchButton: document.querySelector("#searchBtn"),
    errorMessage: document.querySelector("#errorMessage"),
    worldMapContainer: document.querySelector("#worldMapContainer"),
    mapFeedback: document.querySelector("#mapFeedback")
};
let worldMap = null;
let worldMarkersLayer = null;
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
    return value.trim().replace(/\s+/g, " ");
}

/* Builds the detail page URL with the selected country name */
function buildCountryPageUrl(countryName) {
    const searchParams = new URLSearchParams({ name: countryName });

    return `${COUNTRY_PAGE_PATH}?${searchParams.toString()}`;
}

/* Shows a small validation message under the search area */
function showError(message) {
    if (!elements.errorMessage) {
        return;
    }

    elements.errorMessage.textContent = message;
    elements.errorMessage.hidden = false;
}

/* Hides the validation message when the input becomes valid again */
function clearError() {
    if (!elements.errorMessage) {
        return;
    }

    elements.errorMessage.textContent = "";
    elements.errorMessage.hidden = true;
}

function setMapFeedback(message = "") {
    if (elements.mapFeedback) {
        elements.mapFeedback.textContent = message;
    }
}

/* Sends the user to the country page if the input is usable */
function redirectToCountry(countryName) {
    const normalizedCountryName = normalizeCountryName(countryName);

    if (!normalizedCountryName) {
        showError("Please enter a country name.");
        elements.searchInput?.focus();
        return;
    }

    clearError();
    window.location.href = buildCountryPageUrl(normalizedCountryName);
}

/* Reads the current input value and starts the search flow */
function handleSearch() {
    const countryName = elements.searchInput?.value ?? "";

    redirectToCountry(countryName);
}

function ensureWorldMap() {
    if (worldMap || !elements.worldMapContainer || !window.L) {
        return;
    }

    worldMap = window.L.map(elements.worldMapContainer, {
        zoomControl: true,
        minZoom: 2,
        worldCopyJump: true
    }).setView([20, 0], 2);

    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(worldMap);

    worldMarkersLayer = window.L.layerGroup().addTo(worldMap);
}

function getMarkerPalette(countryName) {
    const paletteIndex = [...countryName].reduce((total, char) => total + char.charCodeAt(0), 0) % markerPalette.length;

    return markerPalette[paletteIndex];
}

function createCountryMarkerIcon(countryName) {
    const { start, end, ring } = getMarkerPalette(countryName);

    return window.L.divIcon({
        className: "country-marker-icon",
        html: `
            <span class="country-marker-shell" style="--marker-start:${start}; --marker-end:${end}; --marker-ring:${ring};">
                <span class="country-marker-halo"></span>
                <span class="country-marker-core"></span>
                <span class="country-marker-dot"></span>
            </span>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
}

function renderCountryMarkers(countries) {
    ensureWorldMap();

    if (!worldMap || !worldMarkersLayer) {
        return setMapFeedback("Map could not be loaded.");
    }

    worldMarkersLayer.clearLayers();

    countries.forEach((country) => {
        window.L.marker([country.lat, country.lng], {
            icon: createCountryMarkerIcon(country.name),
            riseOnHover: true
        })
            .bindTooltip(country.name, { direction: "top", offset: [0, -6] })
            .on("click", () => redirectToCountry(country.name))
            .addTo(worldMarkersLayer);
    });

    window.setTimeout(() => worldMap.invalidateSize(), 0);
    setMapFeedback(`Showing ${countries.length} countries. Click one to explore it.`);
}

/* Connects the search input and button to the same redirect logic */
function bindSearchControls() {
    elements.searchButton?.addEventListener("click", handleSearch);

    elements.searchInput?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();
        handleSearch();
    });

    elements.searchInput?.addEventListener("input", () => {
        clearError();
    });
}

async function loadWorldMap() {
    if (!elements.worldMapContainer) {
        return;
    }

    try {
        const countries = await fetchCountriesForMap();
        renderCountryMarkers(countries);
    } catch {
        setMapFeedback("Countries could not be loaded right now.");
    }
}

bindSearchControls();
loadWorldMap();
