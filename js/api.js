const REST_COUNTRIES_BASE_URL = "https://restcountries.com/v3.1";
const PIXABAY_BASE_URL = "https://pixabay.com/api/";
const PIXABAY_API_KEY = "";

/* Sends a fetch request and returns the parsed JSON response */
async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
    }

    return response.json();
}

/* Converts the REST Countries response into a simpler UI-friendly object */
function mapCountryResponse(country) {
    const languages = country.languages ? Object.values(country.languages) : [];
    const currencies = country.currencies ? Object.values(country.currencies) : [];

    return {
        name: country.name?.common ?? "Unknown Country",
        flagUrl: country.flags?.svg || country.flags?.png || "",
        capital: country.capital?.[0] ?? "Unknown",
        population: country.population ?? 0,
        languages,
        currencies,
        latlng: Array.isArray(country.latlng) ? country.latlng : []
    };
}

/* Fetches one country by name from REST Countries */
export async function fetchCountryByName(countryName) {
    const encodedCountryName = encodeURIComponent(countryName);
    const url = `${REST_COUNTRIES_BASE_URL}/name/${encodedCountryName}?fullText=true`;

    try {
        const results = await fetchJson(url);
        const [country] = results;

        if (!country) {
            throw new Error("Country not found.");
        }

        return mapCountryResponse(country);
    } catch (error) {
        if (error instanceof Error && error.message.includes("404")) {
            throw new Error("Country not found.");
        }

        throw error;
    }
}

/* Fetches a landscape photo related to the selected country */
export async function fetchCountryBackgroundImage(countryName) {
    if (!PIXABAY_API_KEY) {
        return null;
    }

    const searchParams = new URLSearchParams({
        key: PIXABAY_API_KEY,
        q: `${countryName} landscape`,
        image_type: "photo",
        orientation: "horizontal",
        category: "places",
        safesearch: "true",
        order: "popular",
        per_page: "3"
    });

    const url = `${PIXABAY_BASE_URL}?${searchParams.toString()}`;
    const imageData = await fetchJson(url);
    const [image] = imageData.hits ?? [];

    if (!image) {
        return null;
    }

    return {
        imageUrl: image.largeImageURL || image.webformatURL || "",
        altText: image.tags || `${countryName} landscape`,
        photographerName: image.user || "",
        photographerProfile: image.user_id
            ? `https://pixabay.com/users/${image.user}-${image.user_id}/`
            : ""
    };
}
