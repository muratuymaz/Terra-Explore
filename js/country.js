import { initHeaderAuth } from "./auth.js";
import {
    fetchCountryBackgroundImage,
    fetchCountryByName,
    fetchPopularPlacesByCountry
} from "./api.js";
import {
    formatCurrencies,
    formatList,
    formatNumber,
    getCacheValue,
    getQueryParam,
    makeCacheKey,
    setCacheValue,
    toTitleCase
} from "./utils.js";
import { CACHE_CONFIG, POPULAR_PLACES_CONFIG } from "./config.js";
import {
    getCountryTravelStatus,
    isFavoriteCountry,
    isFavoritePlace,
    saveRecentCountry,
    setCountryTravelStatus,
    toggleFavoriteCountry,
    toggleFavoritePlace
} from "./travel-data.js";

const elements = {
    pageBody: document.querySelector("#countryBody"),
    countryName: document.querySelector("#countryName"),
    countryFlag: document.querySelector("#countryFlag"),
    capitalText: document.querySelector("#capitalText"),
    populationText: document.querySelector("#populationText"),
    languageText: document.querySelector("#languageText"),
    currencyText: document.querySelector("#currencyText"),
    favoriteCountryButton: document.querySelector("#favoriteCountryBtn"),
    visitedCountryButton: document.querySelector("#visitedCountryBtn"),
    wantToVisitCountryButton: document.querySelector("#wantToVisitCountryBtn"),
    countryMap: document.querySelector("#countryMap"),
    countryMapFeedback: document.querySelector("#countryMapFeedback"),
    popularPlacesButton: document.querySelector("#popularPlacesBtn"),
    popularPlacesGrid: document.querySelector("#popularPlacesGrid"),
    popularPlacesFeedback: document.querySelector("#popularPlacesFeedback")
};

let selectedCountry = null;
let isPopularPlacesLoading = false;
let countryMap = null;
let baseMapLayer = null;
let placesMapLayer = null;

/* Defines the world bounds used to keep the country map in range */
function getCountryMapBounds() {
    const southWest = window.L.latLng(-85, -180);
    const northEast = window.L.latLng(85, 180);

    return window.L.latLngBounds(southWest, northEast);
}

/* Formats OpenTripMap kinds into a cleaner card label */
function getPlaceCategory(kindsText = "") {
    let category = kindsText
        .split(",")
        .find((kind) => kind && kind !== "interesting_places");

    if (!category) {
        category = "popular place";
    }

    return toTitleCase(category.replace(/_/g, " "));
}

/* Shows helper text for loading, errors, or empty results under the action button */
function setPopularPlacesFeedback(message = "") {
    if (!elements.popularPlacesFeedback) {
        return;
    }

    elements.popularPlacesFeedback.textContent = message;
    elements.popularPlacesFeedback.hidden = !message;
}

/* Syncs the three country action buttons with the saved user state */
function updateCountryActionButtons() {
    if (!selectedCountry) {
        return;
    }

    const isCountryFavorite = isFavoriteCountry(selectedCountry.name);
    const travelStatus = getCountryTravelStatus(selectedCountry.name);

    if (elements.favoriteCountryButton) {
        elements.favoriteCountryButton.textContent = "Add to Favorites";

        if (isCountryFavorite) {
            elements.favoriteCountryButton.textContent = "Remove Favorite";
        }
        elements.favoriteCountryButton.classList.toggle("is-active", isCountryFavorite);
    }

    if (elements.visitedCountryButton) {
        elements.visitedCountryButton.classList.toggle("is-active", travelStatus === "visited");
    }

    if (elements.wantToVisitCountryButton) {
        elements.wantToVisitCountryButton.classList.toggle("is-active", travelStatus === "want");
    }
}

/* Starts the Leaflet map used inside the country page */
function ensureCountryMap() {
    if (countryMap || !elements.countryMap || !window.L) {
        return;
    }

    const bounds = getCountryMapBounds();

    countryMap = window.L.map(elements.countryMap, {
        zoomControl: true,
        minZoom: 2,
        worldCopyJump: true,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0
    }).setView([20, 0], 2);

    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(countryMap);

    baseMapLayer = window.L.layerGroup().addTo(countryMap);
    placesMapLayer = window.L.layerGroup().addTo(countryMap);
}

/* Centers the map on the country or its capital when coordinates exist */
function renderCountryMap(country) {
    ensureCountryMap();

    if (!countryMap || !baseMapLayer) {
        if (elements.countryMapFeedback) {
            elements.countryMapFeedback.textContent = "Map could not be loaded.";
        }
        return;
    }

    baseMapLayer.clearLayers();

    let markerLat = country.lat;
    let markerLng = country.lng;
    let markerLabel = country.name;

    if (Number.isFinite(country.capitalLat) && Number.isFinite(country.capitalLng)) {
        markerLat = country.capitalLat;
        markerLng = country.capitalLng;
        markerLabel = country.capital + ", " + country.name;
    }

    if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) {
        if (elements.countryMapFeedback) {
            elements.countryMapFeedback.textContent = "Map location is unavailable for this country.";
        }
        return;
    }

    window.L.marker([markerLat, markerLng])
        .bindPopup(markerLabel)
        .addTo(baseMapLayer);

    window.L.circle([markerLat, markerLng], {
        radius: 70000,
        color: "#4e835f",
        weight: 2,
        fillColor: "#67a86f",
        fillOpacity: 0.18
    }).addTo(baseMapLayer);

    countryMap.setView([markerLat, markerLng], 5);
    countryMap.invalidateSize();
    window.setTimeout(() => countryMap.invalidateSize({ pan: false }), 150);

    if (elements.countryMapFeedback) {
        elements.countryMapFeedback.textContent = "Showing " + markerLabel + " on the map.";
    }
}

/* Adds small markers for the loaded popular places on the country map */
function renderPopularPlaceMarkers(places) {
    ensureCountryMap();

    if (!countryMap || !placesMapLayer) {
        return;
    }

    placesMapLayer.clearLayers();

    const placesWithCoordinates = places.filter(
        (place) => Number.isFinite(place.lat) && Number.isFinite(place.lng)
    );

    if (!placesWithCoordinates.length) {
        return;
    }

    placesWithCoordinates.forEach((place) => {
        let popupLocation = "";

        if (place.sourceCity) {
            popupLocation = place.sourceCity;
        } else if (selectedCountry) {
            popupLocation = selectedCountry.name;
        }

        window.L.circleMarker([place.lat, place.lng], {
            radius: 6,
            color: "#8a6740",
            weight: 2,
            fillColor: "#f0d2a7",
            fillOpacity: 0.95
        })
            .bindPopup("<strong>" + place.name + "</strong><br>" + popupLocation)
            .addTo(placesMapLayer);
    });

    const bounds = window.L.latLngBounds(placesWithCoordinates.map((place) => [place.lat, place.lng]));

    if (bounds.isValid()) {
        countryMap.fitBounds(bounds.pad(0.18));
        window.setTimeout(() => countryMap.invalidateSize({ pan: false }), 150);
    }

    if (elements.countryMapFeedback) {
        elements.countryMapFeedback.textContent = "Showing the selected country's map and popular places.";
    }
}

/* Renders the popular places list as simple cards */
function renderPopularPlaces(places) {
    if (!elements.popularPlacesGrid) {
        return;
    }

    elements.popularPlacesGrid.innerHTML = "";

    places.forEach((place) => {
        const placeCard = document.createElement("article");
        const placeHead = document.createElement("div");
        const title = document.createElement("h3");
        const favoriteButton = document.createElement("button");
        const category = document.createElement("p");
        const location = document.createElement("p");
        const buttonsRow = document.createElement("div");
        const mapAction = document.createElement("a");

        placeCard.className = "place-card";
        placeHead.className = "place-card-head";
        title.textContent = place.name;
        favoriteButton.type = "button";
        favoriteButton.className = "place-favorite-button";
        let selectedCountryName = "";

        if (selectedCountry) {
            selectedCountryName = selectedCountry.name;
        }

        const placeIsFavorite = isFavoritePlace(place, selectedCountryName);

        favoriteButton.textContent = "☆";

        if (placeIsFavorite) {
            favoriteButton.textContent = "★";
        }
        favoriteButton.setAttribute("aria-label", "Toggle favorite place");
        favoriteButton.classList.toggle("is-active", placeIsFavorite);
        category.textContent = getPlaceCategory(place.kinds);
        location.textContent = "Location details not available";

        if (place.sourceCity) {
            location.textContent = place.sourceCity;
        }
        buttonsRow.className = "place-card-buttons";
        const mapQuery = [
            place.name,
            place.sourceCity,
            selectedCountryName
        ]
            .filter(Boolean)
            .join(", ");

        mapAction.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQuery);
        mapAction.target = "_blank";
        mapAction.rel = "noopener noreferrer";
        mapAction.textContent = "Open in Google Maps";
        mapAction.className = "place-card-action";

        favoriteButton.addEventListener("click", () => {
            const isNowFavorite = toggleFavoritePlace(place, selectedCountryName);

            favoriteButton.textContent = "☆";

            if (isNowFavorite) {
                favoriteButton.textContent = "★";
            }
            favoriteButton.classList.toggle("is-active", isNowFavorite);
        });

        placeHead.append(title, favoriteButton);
        buttonsRow.append(mapAction);
        placeCard.append(placeHead, category, location, buttonsRow);
        elements.popularPlacesGrid.append(placeCard);
    });
}

/* Keeps the button state and label in sync during requests */
function setPopularPlacesLoadingState(isLoading) {
    isPopularPlacesLoading = isLoading;

    if (!elements.popularPlacesButton) {
        return;
    }

    elements.popularPlacesButton.disabled = isLoading;
    elements.popularPlacesButton.textContent = "Show Popular Places";

    if (isLoading) {
        elements.popularPlacesButton.textContent = "Loading Popular Places...";
    }
}

/* Renders the basic country details on the page */
function renderCountryDetails(country) {
    document.title = "TerraExplore | " + country.name;
    selectedCountry = country;
    elements.countryName.textContent = country.name;
    elements.capitalText.textContent = country.capital;
    elements.populationText.textContent = formatNumber(country.population);
    elements.languageText.textContent = formatList(country.languages);
    elements.currencyText.textContent = formatCurrencies(country.currencies);

    if (country.flagUrl) {
        elements.countryFlag.src = country.flagUrl;
        elements.countryFlag.alt = country.name + " flag";
        elements.countryFlag.hidden = false;
    }

    renderCountryMap(country);
    setPopularPlacesLoadingState(false);
    setPopularPlacesFeedback();
    updateCountryActionButtons();
}

/* Applies the fetched background image if one is available */
function applyBackgroundImage(backgroundImage) {
    if (!backgroundImage || !backgroundImage.imageUrl || !elements.pageBody) {
        return;
    }

    elements.pageBody.style.backgroundImage = 'linear-gradient(rgba(46, 50, 48, 0.55), rgba(46, 50, 48, 0.55)), url("' + backgroundImage.imageUrl + '")';
    elements.pageBody.setAttribute("aria-label", backgroundImage.altText || "Country background image");
}

/* Replaces the main content with a simple error message */
function showPageError(message) {
    if (!elements.countryName || !elements.popularPlacesGrid) {
        return;
    }

    selectedCountry = null;
    isPopularPlacesLoading = false;
    elements.countryName.textContent = message;
    elements.capitalText.textContent = "Not available";
    elements.populationText.textContent = "Not available";
    elements.languageText.textContent = "Not available";
    elements.currencyText.textContent = "Not available";
    setPopularPlacesLoadingState(false);
    elements.countryFlag.hidden = true;
    if (elements.popularPlacesButton) {
        elements.popularPlacesButton.setAttribute("disabled", "true");
    }
    setPopularPlacesFeedback(message);
    elements.popularPlacesGrid.innerHTML = "";
    if (placesMapLayer) {
        placesMapLayer.clearLayers();
    }
    if (elements.countryMapFeedback) {
        elements.countryMapFeedback.textContent = message;
    }
}

/* Loads and renders the country's popular places on demand */
async function handlePopularPlacesRequest() {
    if (!selectedCountry || isPopularPlacesLoading) {
        return;
    }

    const cacheKey = makeCacheKey(selectedCountry.name);
    const cachedPlaces = getCacheValue(CACHE_CONFIG.popularPlaces, cacheKey);

    if (cachedPlaces) {
        setPopularPlacesFeedback();
        renderPopularPlaces(cachedPlaces);
        renderPopularPlaceMarkers(cachedPlaces);
        return;
    }

    try {
        setPopularPlacesLoadingState(true);
        setPopularPlacesFeedback("Finding popular places...");

        const places = await fetchPopularPlacesByCountry(selectedCountry, POPULAR_PLACES_CONFIG.totalLimit);

        if (!places.length) {
            elements.popularPlacesGrid.innerHTML = "";
            return setPopularPlacesFeedback("No popular places were found for this country.");
        }

        setCacheValue(CACHE_CONFIG.popularPlaces, cacheKey, places);
        setPopularPlacesFeedback();
        renderPopularPlaces(places);
        renderPopularPlaceMarkers(places);
    } catch (error) {
        elements.popularPlacesGrid.innerHTML = "";
        let feedbackMessage = "Popular places could not be loaded.";

        if (error instanceof Error) {
            feedbackMessage = error.message;
        }

        setPopularPlacesFeedback(feedbackMessage);
    } finally {
        setPopularPlacesLoadingState(false);
    }
}

/* Connects the country action button to the popular places flow */
function bindPopularPlacesButton() {
    if (elements.popularPlacesButton) {
        elements.popularPlacesButton.addEventListener("click", handlePopularPlacesRequest);
    }
}

/* Connects the favorite and travel status buttons to saved profile data */
function bindCountryActionButtons() {
    if (elements.favoriteCountryButton) {
        elements.favoriteCountryButton.addEventListener("click", () => {
            if (!selectedCountry) {
                return;
            }

            toggleFavoriteCountry(selectedCountry.name);
            updateCountryActionButtons();
        });
    }

    if (elements.visitedCountryButton) {
        elements.visitedCountryButton.addEventListener("click", () => {
            if (!selectedCountry) {
                return;
            }

            const travelStatus = getCountryTravelStatus(selectedCountry.name);
            let nextStatus = "visited";

            if (travelStatus === "visited") {
                nextStatus = "";
            }

            setCountryTravelStatus(selectedCountry.name, nextStatus);
            updateCountryActionButtons();
        });
    }

    if (elements.wantToVisitCountryButton) {
        elements.wantToVisitCountryButton.addEventListener("click", () => {
            if (!selectedCountry) {
                return;
            }

            const travelStatus = getCountryTravelStatus(selectedCountry.name);
            let nextStatus = "want";

            if (travelStatus === "want") {
                nextStatus = "";
            }

            setCountryTravelStatus(selectedCountry.name, nextStatus);
            updateCountryActionButtons();
        });
    }
}

/* Loads the selected country and then applies the optional background image */
async function loadCountryPage() {
    const countryName = getQueryParam("name");

    if (!countryName) {
        showPageError("No country was selected.");
        return;
    }

    try {
        const country = await fetchCountryByName(countryName);
        renderCountryDetails(country);
        saveRecentCountry(country.name);
    } catch (error) {
        let errorMessage = "Something went wrong while loading the country.";

        if (error instanceof Error) {
            errorMessage = error.message;
        }

        showPageError(errorMessage);
        return;
    }

    try {
        const backgroundImage = await fetchCountryBackgroundImage(selectedCountry);
        applyBackgroundImage(backgroundImage);
    } catch {
        /* Background images are optional, so the page should stay usable without one. */
    }
}

initHeaderAuth();
bindCountryActionButtons();
bindPopularPlacesButton();
loadCountryPage();

/* Keeps the country map sized correctly if the window changes */
window.addEventListener("resize", () => {
    if (countryMap) {
        countryMap.invalidateSize({ pan: false });
    }
});
