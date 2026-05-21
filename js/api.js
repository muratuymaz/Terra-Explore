const REST_COUNTRIES_BASE_URL = "https://restcountries.com/v3.1";
const PIXABAY_BASE_URL = "https://pixabay.com/api/";
const PIXABAY_API_KEY = "";
const PIXABAY_CACHE_KEY = "terraExplorePixabayCache";
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

/* Sends a fetch request and returns the parsed JSON response */
async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
    }

    return response.json();
}

/* Reads the saved Pixabay cache from localStorage */
function getPixabayCache() {
    try {
        const storedCache = localStorage.getItem(PIXABAY_CACHE_KEY);

        return storedCache ? JSON.parse(storedCache) : {};
    } catch {
        return {};
    }
}

/* Saves the updated Pixabay cache back to localStorage */
function savePixabayCache(cache) {
    try {
        localStorage.setItem(PIXABAY_CACHE_KEY, JSON.stringify(cache));
    } catch {
        /* Ignore storage errors so the app can continue normally */
    }
}

/* Creates a stable cache key for country-based image lookups */
function buildCountryImageCacheKey(countryName) {
    return countryName.trim().toLowerCase();
}

/* Returns a cached Pixabay image when it is still fresh enough */
function getCachedCountryImage(countryName) {
    const cache = getPixabayCache();
    const cacheKey = buildCountryImageCacheKey(countryName);
    const cachedItem = cache[cacheKey];

    if (!cachedItem) {
        return null;
    }

    const isExpired = Date.now() - cachedItem.savedAt > ONE_DAY_IN_MS;

    if (isExpired) {
        delete cache[cacheKey];
        savePixabayCache(cache);
        return null;
    }

    return cachedItem.data;
}

/* Stores the latest Pixabay result for the selected country */
function cacheCountryImage(countryName, imageData) {
    const cache = getPixabayCache();
    const cacheKey = buildCountryImageCacheKey(countryName);

    cache[cacheKey] = {
        data: imageData,
        savedAt: Date.now()
    };

    savePixabayCache(cache);
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

    const cachedImage = getCachedCountryImage(countryName);

    if (cachedImage) {
        return cachedImage;
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

    const backgroundImage = {
        imageUrl: image.largeImageURL || image.webformatURL || "",
        altText: image.tags || `${countryName} landscape`,
        photographerName: image.user || "",
        photographerProfile: image.user_id
            ? `https://pixabay.com/users/${image.user}-${image.user_id}/`
            : ""
    };

    cacheCountryImage(countryName, backgroundImage);

    return backgroundImage;
}
