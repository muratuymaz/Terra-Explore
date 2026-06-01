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
    let firstCountryName = "";
    let secondCountryName = "";

    if (elements.compareCountryOne) {
        firstCountryName = elements.compareCountryOne.value
            .trim()
            .split(" ")
            .filter(Boolean)
            .join(" ");
    }

    if (elements.compareCountryTwo) {
        secondCountryName = elements.compareCountryTwo.value
            .trim()
            .split(" ")
            .filter(Boolean)
            .join(" ");
    }

    if (!firstCountryName || !secondCountryName) {
        elements.compareResult.hidden = true;
        if (elements.compareFeedback) {
            elements.compareFeedback.textContent = "Please choose two countries to compare.";
            elements.compareFeedback.hidden = false;
        }
        return;
    }

    if (firstCountryName.toLowerCase() === secondCountryName.toLowerCase()) {
        elements.compareResult.hidden = true;
        if (elements.compareFeedback) {
            elements.compareFeedback.textContent = "Please choose two different countries.";
            elements.compareFeedback.hidden = false;
        }
        return;
    }

    try {
        if (elements.compareFeedback) {
            elements.compareFeedback.textContent = "Loading comparison...";
            elements.compareFeedback.hidden = false;
        }
        const [countryOne, countryTwo] = await Promise.all([
            fetchCountryByName(firstCountryName),
            fetchCountryByName(secondCountryName)
        ]);
        if (elements.compareFeedback) {
            elements.compareFeedback.textContent = "";
            elements.compareFeedback.hidden = true;
        }
        renderCountryComparison(countryOne, countryTwo);
    } catch {
        elements.compareResult.hidden = true;
        if (elements.compareFeedback) {
            elements.compareFeedback.textContent = "The comparison could not be loaded right now.";
            elements.compareFeedback.hidden = false;
        }
    }
}

/* Loads the available country names for the comparison form */
async function loadCountryOptions() {
    try {
        const countries = await fetchCountriesForMap();
        const countryNames = [];

        countries.forEach((country) => {
            if (!countryNames.includes(country.name)) {
                countryNames.push(country.name);
            }
        });

        countryNames.sort((firstCountry, secondCountry) => firstCountry.localeCompare(secondCountry));

        renderCountryOptions(countryNames);
    } catch {
        if (elements.compareFeedback) {
            elements.compareFeedback.textContent = "Country suggestions are unavailable right now.";
            elements.compareFeedback.hidden = false;
        }
    }
}

/* Starts the page behavior for the comparison screen */
initHeaderAuth();

if (elements.compareButton) {
    elements.compareButton.addEventListener("click", handleCompareCountries);
}

loadCountryOptions();
