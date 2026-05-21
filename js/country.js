import { fetchCountryBackgroundImage, fetchCountryByName } from "./api.js";

const elements = {
    pageBody: document.querySelector("#countryBody"),
    countryName: document.querySelector("#countryName"),
    countryFlag: document.querySelector("#countryFlag"),
    capitalText: document.querySelector("#capitalText"),
    populationText: document.querySelector("#populationText"),
    languageText: document.querySelector("#languageText"),
    currencyText: document.querySelector("#currencyText"),
    discoverGemsButton: document.querySelector("#discoverGemsBtn"),
    gemsGrid: document.querySelector("#gemsGrid")
};

/* Reads the selected country name from the query string */
function getCountryNameFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    const countryName = searchParams.get("name");

    return countryName ? countryName.trim() : "";
}

/* Formats large population values in a more readable way */
function formatPopulation(population) {
    return new Intl.NumberFormat("en-US").format(population);
}

/* Joins list values into a clean text string for the UI */
function formatList(values, fallbackText = "Unknown") {
    return values.length ? values.join(", ") : fallbackText;
}

/* Formats the currency object values returned by the API */
function formatCurrencies(currencies) {
    if (!currencies.length) {
        return "Unknown";
    }

    return currencies
        .map((currency) => {
            const currencyName = currency.name ?? "Unknown currency";
            const currencySymbol = currency.symbol ? ` (${currency.symbol})` : "";

            return `${currencyName}${currencySymbol}`;
        })
        .join(", ");
}

/* Renders the basic country details on the page */
function renderCountryDetails(country) {
    document.title = `TerraExplore | ${country.name}`;
    elements.countryName.textContent = country.name;
    elements.capitalText.textContent = country.capital;
    elements.populationText.textContent = formatPopulation(country.population);
    elements.languageText.textContent = formatList(country.languages);
    elements.currencyText.textContent = formatCurrencies(country.currencies);

    if (country.flagUrl) {
        elements.countryFlag.src = country.flagUrl;
        elements.countryFlag.alt = `${country.name} flag`;
        elements.countryFlag.hidden = false;
    }

    if (country.latlng.length === 2) {
        elements.discoverGemsButton?.removeAttribute("disabled");
    }
}

/* Applies the fetched background image if one is available */
function applyBackgroundImage(backgroundImage) {
    if (!backgroundImage?.imageUrl || !elements.pageBody) {
        return;
    }

    elements.pageBody.style.backgroundImage = `linear-gradient(rgba(250, 246, 240, 0.2), rgba(250, 246, 240, 0.2)), url("${backgroundImage.imageUrl}")`;
    elements.pageBody.setAttribute("aria-label", backgroundImage.altText || "Country background image");
}

/* Replaces the main content with a simple error message */
function showPageError(message) {
    if (!elements.countryName || !elements.gemsGrid) {
        return;
    }

    elements.countryName.textContent = message;
    elements.capitalText.textContent = "-";
    elements.populationText.textContent = "-";
    elements.languageText.textContent = "-";
    elements.currencyText.textContent = "-";
    elements.countryFlag.hidden = true;
    elements.discoverGemsButton?.setAttribute("disabled", "true");
    elements.gemsGrid.innerHTML = "";
}

/* Loads the country data and optional background image together */
async function loadCountryPage() {
    const countryName = getCountryNameFromUrl();

    if (!countryName) {
        showPageError("No country was selected.");
        return;
    }

    try {
        const country = await fetchCountryByName(countryName);

        renderCountryDetails(country);

        const backgroundImage = await fetchCountryBackgroundImage(country.name);
        applyBackgroundImage(backgroundImage);
    } catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : "Something went wrong while loading the country.";

        showPageError(errorMessage);
    }
}

loadCountryPage();
