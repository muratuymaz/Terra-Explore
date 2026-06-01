import { initHeaderAuth } from "./auth.js";
import { fetchCountriesForMap, fetchCountryByName, fetchHistoricalPlacesByCountry } from "./api.js";
import { formatCurrencies, formatList, formatNumber, toTitleCase } from "./utils.js";

const elements = {
    compareCountryOne: document.querySelector("#compareCountryOne"),
    compareCountryTwo: document.querySelector("#compareCountryTwo"),
    compareButton: document.querySelector("#compareBtn"),
    compareFeedback: document.querySelector("#compareFeedback"),
    compareResult: document.querySelector("#compareResult"),
    countryOptions: document.querySelector("#countryOptions")
};

/* Shows helper text under the comparison form */
function setCompareFeedback(message = "") {
    if (!elements.compareFeedback) {
        return;
    }

    elements.compareFeedback.textContent = message;
    elements.compareFeedback.hidden = !message;
}

/* Formats the kind labels for a historical place card */
function formatPlaceKinds(kindsText = "") {
    const primaryKind = kindsText
        .split(",")
        .map((kind) => kind.trim())
        .find(Boolean);

    if (!primaryKind) {
        return "Historical place";
    }

    return toTitleCase(primaryKind.replace(/_/g, " "));
}

function buildPlaceMapUrl(place, countryName) {
    const query = [
        place.name,
        place.sourceCity,
        countryName
    ]
        .filter(Boolean)
        .join(", ");

    const searchParams = new URLSearchParams({
        api: "1",
        query
    });

    return "https://www.google.com/maps/search/?" + searchParams.toString();
}

/* Fills the datalist used by the country comparison inputs */
function renderCountryOptions(countries) {
    if (!elements.countryOptions) {
        return;
    }

    elements.countryOptions.innerHTML = "";

    countries.forEach((countryName) => {
        const option = document.createElement("option");

        option.value = countryName;
        elements.countryOptions.append(option);
    });
}

/* Renders one country's details and its top historical places */
function renderCountryColumn(country, historicalPlaces) {
    const historicalPlacesMarkup = historicalPlaces.length
        ? historicalPlaces.map((place, index) => `
            <li class="compare-place-item">
                <span class="compare-place-rank">${index + 1}.</span>
                <div class="compare-place-copy">
                    <h5>${place.name}</h5>
                    <p>${place.sourceCity || country.capital || country.name}</p>
                    <span>${formatPlaceKinds(place.kinds)}</span>
                    <div class="compare-place-actions">
                        <a
                            class="compare-place-map-link"
                            href="${buildPlaceMapUrl(place, country.name)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View on Map
                        </a>
                    </div>
                </div>
            </li>
        `).join("")
        : '<li class="compare-place-empty">Historical places could not be loaded for this country.</li>';

    return `
        <article class="compare-column">
            <div class="compare-country-summary">
                <h4>${country.name}</h4>
                <p class="compare-stat"><strong>Capital:</strong> ${country.capital}</p>
                <p class="compare-stat"><strong>Population:</strong> ${formatNumber(country.population)}</p>
                <p class="compare-stat"><strong>Languages:</strong> ${formatList(country.languages)}</p>
                <p class="compare-stat"><strong>Currency:</strong> ${formatCurrencies(country.currencies)}</p>
            </div>

            <div class="compare-places-block">
                <h5>Top 5 Historical Places</h5>
                <ol class="compare-place-list">
                    ${historicalPlacesMarkup}
                </ol>
            </div>
        </article>
    `;
}

/* Renders the side-by-side country details after both lookups succeed */
function renderCountryComparison(countryOne, countryTwo, historicalPlacesOne = [], historicalPlacesTwo = []) {
    if (!elements.compareResult) {
        return;
    }

    elements.compareResult.innerHTML = renderCountryColumn(countryOne, historicalPlacesOne)
        + renderCountryColumn(countryTwo, historicalPlacesTwo);
    elements.compareResult.hidden = false;
}

/* Loads both selected countries and shows their key details together */
async function handleCompareCountries() {
    const firstCountryName = (elements.compareCountryOne?.value ?? "")
        .trim()
        .split(" ")
        .filter(Boolean)
        .join(" ");
    const secondCountryName = (elements.compareCountryTwo?.value ?? "")
        .trim()
        .split(" ")
        .filter(Boolean)
        .join(" ");

    if (!firstCountryName || !secondCountryName) {
        elements.compareResult.hidden = true;
        setCompareFeedback("Please choose two countries to compare.");
        return;
    }

    if (firstCountryName.toLowerCase() === secondCountryName.toLowerCase()) {
        elements.compareResult.hidden = true;
        setCompareFeedback("Please choose two different countries.");
        return;
    }

    try {
        setCompareFeedback("Loading comparison...");
        const [countryOne, countryTwo] = await Promise.all([
            fetchCountryByName(firstCountryName),
            fetchCountryByName(secondCountryName)
        ]);

        const [historicalPlacesOneResult, historicalPlacesTwoResult] = await Promise.allSettled([
            fetchHistoricalPlacesByCountry(countryOne, 5),
            fetchHistoricalPlacesByCountry(countryTwo, 5)
        ]);

        const historicalPlacesOne = historicalPlacesOneResult.status === "fulfilled" ? historicalPlacesOneResult.value : [];
        const historicalPlacesTwo = historicalPlacesTwoResult.status === "fulfilled" ? historicalPlacesTwoResult.value : [];

        if (historicalPlacesOneResult.status === "rejected" || historicalPlacesTwoResult.status === "rejected") {
            setCompareFeedback("Country details loaded, but some historical places could not be loaded.");
        } else {
            setCompareFeedback();
        }

        renderCountryComparison(countryOne, countryTwo, historicalPlacesOne, historicalPlacesTwo);
    } catch {
        elements.compareResult.hidden = true;
        setCompareFeedback("The comparison could not be loaded right now.");
    }
}

/* Loads the available country names for the comparison form */
async function loadCountryOptions() {
    try {
        const countries = await fetchCountriesForMap();
        const countryNames = [...new Set(countries.map((country) => country.name))]
            .sort((firstCountry, secondCountry) => firstCountry.localeCompare(secondCountry));

        renderCountryOptions(countryNames);
    } catch {
        setCompareFeedback("Country suggestions are unavailable right now.");
    }
}

/* Starts the page behavior for the comparison screen */
initHeaderAuth();
elements.compareButton?.addEventListener("click", handleCompareCountries);
loadCountryOptions();
