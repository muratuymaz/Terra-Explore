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

const elements = {
    pageBody: document.querySelector("#countryBody"),
    countryName: document.querySelector("#countryName"),
    countryFlag: document.querySelector("#countryFlag"),
    capitalText: document.querySelector("#capitalText"),
    populationText: document.querySelector("#populationText"),
    languageText: document.querySelector("#languageText"),
    currencyText: document.querySelector("#currencyText"),
    popularPlacesButton: document.querySelector("#popularPlacesBtn"),
    popularPlacesGrid: document.querySelector("#popularPlacesGrid"),
    popularPlacesFeedback: document.querySelector("#popularPlacesFeedback")
};

let selectedCountry = null;
let isPopularPlacesLoading = false;

/* Formats OpenTripMap kinds into a cleaner card label */
function getPlaceCategory(kindsText = "") {
    const category = kindsText
        .split(",")
        .find((kind) => kind && kind !== "interesting_places")
        ?? "popular place";

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

function buildPlaceMapUrl(place) {
    const query = [
        place.name,
        place.sourceCity,
        selectedCountry?.name
    ]
        .filter(Boolean)
        .join(", ");

    const searchParams = new URLSearchParams({
        api: "1",
        query
    });

    return "https://www.google.com/maps/search/?" + searchParams.toString();
}

/* Renders the popular places list as simple cards */
function renderPopularPlaces(places) {
    if (!elements.popularPlacesGrid) {
        return;
    }

    elements.popularPlacesGrid.innerHTML = "";

    places.forEach((place) => {
        const placeLink = document.createElement("a");
        const placeCard = document.createElement("article");
        const title = document.createElement("h3");
        const category = document.createElement("p");
        const location = document.createElement("p");
        const action = document.createElement("p");

        placeLink.className = "place-card-link";
        placeLink.href = buildPlaceMapUrl(place);
        placeLink.target = "_blank";
        placeLink.rel = "noopener noreferrer";
        placeCard.className = "place-card";
        title.textContent = place.name;
        category.textContent = getPlaceCategory(place.kinds);
        location.textContent = "Location details not available";

        if (place.sourceCity) {
            location.textContent = place.sourceCity;
        }
        action.textContent = "Open in Google Maps";
        action.className = "place-card-action";

        placeCard.append(title, category, location, action);
        placeLink.append(placeCard);
        elements.popularPlacesGrid.append(placeLink);
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

    setPopularPlacesLoadingState(false);
    setPopularPlacesFeedback();
}

/* Applies the fetched background image if one is available */
function applyBackgroundImage(backgroundImage) {
    if (!backgroundImage?.imageUrl || !elements.pageBody) {
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
    elements.popularPlacesButton?.setAttribute("disabled", "true");
    setPopularPlacesFeedback(message);
    elements.popularPlacesGrid.innerHTML = "";
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
        return renderPopularPlaces(cachedPlaces);
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
    elements.popularPlacesButton?.addEventListener("click", handlePopularPlacesRequest);
}

/* Loads the country data and optional background image together */
async function loadCountryPage() {
    const countryName = getQueryParam("name");

    if (!countryName) {
        showPageError("No country was selected.");
        return;
    }

    try {
        const country = await fetchCountryByName(countryName);
        renderCountryDetails(country);
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
bindPopularPlacesButton();
loadCountryPage();
