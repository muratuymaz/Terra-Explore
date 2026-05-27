import { initHeaderAuth } from "./auth.js";
import { fetchCountriesForMap } from "./api.js";
import { getRecentCountries } from "./travel-data.js";

const COUNTRY_PAGE_PATH = "country.html";

const elements = {
    searchInput: document.querySelector("#searchInput"),
    searchButton: document.querySelector("#searchBtn"),
    searchSuggestions: document.querySelector("#searchSuggestions"),
    errorMessage: document.querySelector("#errorMessage"),
    recentSearches: document.querySelector("#recentSearches"),
    worldMapContainer: document.querySelector("#worldMapContainer"),
    mapFeedback: document.querySelector("#mapFeedback")
};
const MAX_SUGGESTIONS = 6;
let worldMap = null;
let worldMarkersLayer = null;
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

/* Builds the detail page URL with the selected country name */
function buildCountryPageUrl(countryName) {
    const searchParams = new URLSearchParams({ name: countryName });

    return COUNTRY_PAGE_PATH + "?" + searchParams.toString();
}

/* Keeps the small validation message under the search area in sync */
function setError(message = "") {
    if (!elements.errorMessage) {
        return;
    }

    elements.errorMessage.textContent = message;
    elements.errorMessage.hidden = !message;
}

function setMapFeedback(message = "") {
    if (elements.mapFeedback) {
        elements.mapFeedback.textContent = message;
    }
}

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

function selectSuggestion(countryName) {
    if (!elements.searchInput) {
        return;
    }

    elements.searchInput.value = countryName;
    setError();
    hideSuggestions();
}

function renderSuggestions(suggestions) {
    visibleSuggestions = suggestions;
    activeSuggestionIndex = -1;

    if (!elements.searchSuggestions || !elements.searchInput) {
        return;
    }

    if (!suggestions.length) {
        hideSuggestions();
        return;
    }

    elements.searchSuggestions.innerHTML = "";

    suggestions.forEach((countryName, index) => {
        const suggestionButton = document.createElement("button");

        suggestionButton.type = "button";
        suggestionButton.className = "suggestion-item";
        suggestionButton.textContent = countryName;
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

function updateSuggestionHighlight() {
    if (!elements.searchSuggestions) {
        return;
    }

    const suggestionItems = elements.searchSuggestions.querySelectorAll(".suggestion-item");

    suggestionItems.forEach((item, index) => {
        item.classList.toggle("is-active", index === activeSuggestionIndex);
    });
}

function updateSuggestions() {
    const inputValue = normalizeCountryName(elements.searchInput?.value ?? "").toLowerCase();

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

    renderSuggestions(startsWithMatches.concat(includesMatches).slice(0, MAX_SUGGESTIONS));
}

/* Sends the user to the country page if the input is usable */
function redirectToCountry(countryName) {
    const normalizedCountryName = normalizeCountryName(countryName);

    if (!normalizedCountryName) {
        setError("Please enter a country name.");
        elements.searchInput?.focus();
        return;
    }

    setError();
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

function getMarkerPalette(countryName) {
    const paletteIndex = [...countryName].reduce((total, char) => total + char.charCodeAt(0), 0) % markerPalette.length;

    return markerPalette[paletteIndex];
}

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

function renderCountryMarkers(countries) {
    ensureWorldMap();

    if (!worldMap || !worldMarkersLayer) {
        return setMapFeedback("Map could not be loaded.");
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

    window.setTimeout(() => worldMap.invalidateSize(), 0);
    setMapFeedback("Showing " + countries.length + " capital markers. Click one to explore it.");
}

/* Connects the search input and button to the same redirect logic */
function bindSearchControls() {
    elements.searchButton?.addEventListener("click", handleSearch);

    elements.searchInput?.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" && visibleSuggestions.length) {
            event.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % visibleSuggestions.length;
            updateSuggestionHighlight();
            return;
        }

        if (event.key === "ArrowUp" && visibleSuggestions.length) {
            event.preventDefault();

            if (activeSuggestionIndex <= 0) {
                activeSuggestionIndex = visibleSuggestions.length - 1;
            } else {
                activeSuggestionIndex -= 1;
            }

            updateSuggestionHighlight();
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

    elements.searchInput?.addEventListener("input", () => {
        clearError();
        updateSuggestions();
    });

    elements.searchInput?.addEventListener("blur", () => {
        window.setTimeout(hideSuggestions, 100);
    });

    elements.searchInput?.addEventListener("focus", () => {
        updateSuggestions();
    });
}

async function loadWorldMap() {
    if (!elements.worldMapContainer) {
        return;
    }

    try {
        const countries = await fetchCountriesForMap();
        countryNames = [...new Set(countries.map((country) => country.name))].sort((firstCountry, secondCountry) => firstCountry.localeCompare(secondCountry));
        renderCountryMarkers(countries);
    } catch {
        setMapFeedback("The map is unavailable right now.");
    }
}

initHeaderAuth();
renderRecentSearches();
bindSearchControls();
loadWorldMap();
