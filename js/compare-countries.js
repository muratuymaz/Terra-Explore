import { initHeaderAuth } from "./auth.js";
import { fetchCountriesForMap, fetchCountryByName } from "./api.js";
import { formatCurrencies, formatList, formatNumber } from "./utils.js";

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

/* Renders one country's details inside the comparison result */
function renderCountryColumn(country) {
    return `
        <article class="compare-column">
            <h4>${country.name}</h4>
            <div class="compare-country-summary">
                <p class="compare-stat"><strong>Capital:</strong> ${country.capital}</p>
                <p class="compare-stat"><strong>Population:</strong> ${formatNumber(country.population)}</p>
                <p class="compare-stat"><strong>Languages:</strong> ${formatList(country.languages)}</p>
                <p class="compare-stat"><strong>Currency:</strong> ${formatCurrencies(country.currencies)}</p>
            </div>
        </article>
    `;
}

/* Renders the side-by-side country details after both lookups succeed */
function renderCountryComparison(countryOne, countryTwo) {
    if (!elements.compareResult) {
        return;
    }

    elements.compareResult.innerHTML = renderCountryColumn(countryOne)
        + renderCountryColumn(countryTwo);
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
        setCompareFeedback();
        renderCountryComparison(countryOne, countryTwo);
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
