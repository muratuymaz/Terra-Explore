const COUNTRY_PAGE_PATH = "country.html";

const elements = {
    searchInput: document.querySelector("#searchInput"),
    searchButton: document.querySelector("#searchBtn"),
    errorMessage: document.querySelector("#errorMessage"),
    worldMapContainer: document.querySelector("#worldMapContainer")
};

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

/* Leaves the page ready for clickable map countries later on */
function bindFutureMapSelection() {
    if (!elements.worldMapContainer) {
        return;
    }

    elements.worldMapContainer.addEventListener("click", (event) => {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const countryTrigger = target.closest("[data-country-name]");

        if (!countryTrigger) {
            return;
        }

        const selectedCountryName = countryTrigger.getAttribute("data-country-name");

        if (!selectedCountryName) {
            return;
        }

        redirectToCountry(selectedCountryName);
    });

    /* Also supports a custom event if the map is built separately */
    elements.worldMapContainer.addEventListener("countryselect", (event) => {
        const selectedCountryName = event.detail?.name;

        if (!selectedCountryName) {
            return;
        }

        redirectToCountry(selectedCountryName);
    });
}

bindSearchControls();
bindFutureMapSelection();
