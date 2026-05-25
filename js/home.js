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


    // We set the map bounds so user cannot go too far up or down.
    // User can only move left and right (around the world).
    // This helps to keep the map looking good and not broken.
    const southWest = window.L.latLng(-85, -180); // Bottom left corner of the world
    const northEast = window.L.latLng(85, 180);   // Top right corner of the world
    const bounds = window.L.latLngBounds(southWest, northEast); // The area user can see

    worldMap = window.L.map(elements.worldMapContainer, {
        zoomControl: true,
        minZoom: 2,
        worldCopyJump: true,
        maxBounds: bounds, // This stops user from moving map out of the world
        maxBoundsViscosity: 1.0 // 1.0 means user cannot drag outside at all
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
        // Bayraklı marker oluştur
        const flagUrl = country.flagUrl || (country.flags && (country.flags.svg || country.flags.png)) || "";
        const iconHtml = flagUrl
            ? `<div class="country-flag-marker" style="width:36px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.85);border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1px solid #ddd;overflow:hidden;">
                    <img src="${flagUrl}" alt="${country.name} flag" style="width:32px;height:20px;object-fit:contain;display:block;" />
               </div>`
            : `<div class="country-flag-marker" style="width:36px;height:24px;background:#eee;border-radius:4px;"></div>`;
        const flagIcon = window.L.divIcon({
            className: "country-flag-divicon",
            html: iconHtml,
            iconSize: [36, 24],
            iconAnchor: [18, 12],
            popupAnchor: [0, -12]
        });
        window.L.marker([country.lat, country.lng], {
            icon: flagIcon,
            riseOnHover: true
        })
            .bindTooltip(country.name, { direction: "top", offset: [0, -14] })
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

bindSearchControls();

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
