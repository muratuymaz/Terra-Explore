import {
    buildCanonicalText,
    buildCacheEntryKey,
    fetchJsonp,
    getCacheValue,
    hasSimilarValue,
    setCacheValue
} from "./utils.js";
import {
    API_BASE_URLS,
    API_KEYS,
    CACHE_CONFIG,
    GEONAMES_CONFIG,
    POPULAR_PLACES_CONFIG
} from "./config.js";
const { pixabay: pixabayCache, geoNames: geoNamesCache } = CACHE_CONFIG;
const {
    pixabay: pixabayApiKey,
    geoNamesUsername,
    openTripMap: openTripMapApiKey
} = API_KEYS;
const {
    endpoint: geoNamesEndpoint,
    callbackParam: geoNamesCallbackParam,
    language: geoNamesLanguage,
    maxRowsMultiplier: geoNamesMaxRowsMultiplier
} = GEONAMES_CONFIG;
const {
    cityCount,
    cityRadiusInMeters,
    cityFetchLimit,
    cityResultDistribution,
    excludedKinds,
    genericNameTokens,
    rate: popularPlacesRate
} = POPULAR_PLACES_CONFIG;

/* Sends a fetch request and returns the parsed JSON response */
async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
    }

    return response.json();
}

/* Requests top city data from one GeoNames endpoint */
async function fetchGeoNamesCities(endpoint, searchParams, callbackSuffix) {
    const response = await fetchJsonp(
        `${endpoint}?${searchParams.toString()}`,
        geoNamesCallbackParam,
        `terraExploreGeoNamesCallback${Date.now()}${callbackSuffix}`
    );

    if (response.status) {
        throw new Error(response.status.message || "GeoNames request failed.");
    }

    return (response.geonames ?? [])
        .filter((city) => city.name && Number(city.population) > 0)
        .sort((firstCity, secondCity) => Number(secondCity.population) - Number(firstCity.population))
        .slice(0, cityCount)
        .map((city) => ({
            name: city.name,
            population: Number(city.population) || 0,
            lat: Number(city.lat),
            lng: Number(city.lng)
        }));
}

/* Converts the REST Countries response into a simpler UI-friendly object */
function mapCountryResponse(country) {
    return {
        name: country.name?.common ?? "Unknown Country",
        countryCode: country.cca2?.toLowerCase() ?? "",
        flagUrl: country.flags?.svg || country.flags?.png || "",
        capital: country.capital?.[0] ?? "Unknown",
        population: country.population ?? 0,
        languages: country.languages ? Object.values(country.languages) : [],
        currencies: country.currencies ? Object.values(country.currencies) : []
    };
}

/* Fetches the largest cities for the selected country */
async function fetchTopCitiesByCountry(countryCode) {
    if (!geoNamesUsername) {
        throw new Error("GeoNames username is missing.");
    }

    const cacheKey = buildCacheEntryKey(countryCode);
    const cachedCities = getCacheValue(geoNamesCache, cacheKey);

    if (cachedCities) return cachedCities;

    const searchParams = new URLSearchParams({
        country: countryCode.toUpperCase(),
        featureClass: "P",
        cities: "cities15000",
        maxRows: String(cityCount * geoNamesMaxRowsMultiplier),
        orderby: "population",
        lang: geoNamesLanguage,
        username: geoNamesUsername
    });

    const cities = await fetchGeoNamesCities(geoNamesEndpoint, searchParams, 0);

    if (cities.length) {
        setCacheValue(geoNamesCache, cacheKey, cities);
        return cities;
    }

    throw new Error("Top cities could not be loaded right now. Please try again.");
}

/* Fetches popular place candidates around a city center */
async function fetchPopularPlacesNearCity(city) {
    const searchParams = new URLSearchParams({
        apikey: openTripMapApiKey,
        radius: String(cityRadiusInMeters),
        lon: String(city.lng),
        lat: String(city.lat),
        format: "json",
        limit: String(cityFetchLimit),
        rate: popularPlacesRate
    });

    return fetchJson(`${API_BASE_URLS.openTripMap}/radius?${searchParams.toString()}`);
}

/* Fetches one country by name from REST Countries */
export async function fetchCountryByName(countryName) {
    const encodedCountryName = encodeURIComponent(countryName);
    const url = `${API_BASE_URLS.restCountries}/name/${encodedCountryName}?fullText=true`;

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

export async function fetchCountriesForMap() {
    const fields = "name,latlng";
    const countries = await fetchJson(`${API_BASE_URLS.restCountries}/all?fields=${fields}`);

    return countries
        .filter((country) => Array.isArray(country.latlng) && country.latlng.length >= 2 && country.name?.common)
        .map((country) => ({
            name: country.name.common,
            lat: country.latlng[0],
            lng: country.latlng[1]
        }));
}

/* Fetches a landscape photo related to the selected country */
export async function fetchCountryBackgroundImage(countryName) {
    if (!pixabayApiKey) {
        return null;
    }

    const cacheKey = buildCacheEntryKey(countryName);
    const cachedImage = getCacheValue(pixabayCache, cacheKey);

    if (cachedImage) return cachedImage;

    const searchParams = new URLSearchParams({
        key: pixabayApiKey,
        q: `${countryName} landscape`,
        image_type: "photo",
        orientation: "horizontal",
        category: "places",
        safesearch: "true",
        order: "popular",
        per_page: "3"
    });
    const { hits = [] } = await fetchJson(`${API_BASE_URLS.pixabay}?${searchParams.toString()}`);
    const [image] = hits;

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

    setCacheValue(pixabayCache, cacheKey, backgroundImage);
    return backgroundImage;
}

/* Fetches popular places by combining the country's selected largest cities */
export async function fetchPopularPlacesByCountry(country, limit = POPULAR_PLACES_CONFIG.totalLimit) {
    if (!openTripMapApiKey) {
        throw new Error("OpenTripMap API key is missing.");
    }

    const topCities = await fetchTopCitiesByCountry(country.countryCode);

    if (!topCities.length) {
        throw new Error("Top cities could not be found for this country.");
    }

    const seenPlaceIds = new Set();
    const seenPlaceNamesByCity = new Map();
    const popularPlaces = [];

    for (const [cityIndex, city] of topCities.entries()) {
        const cityPlaces = await fetchPopularPlacesNearCity(city);
        const citySeenNames = seenPlaceNamesByCity.get(city.name) ?? [];
        const rankedCityPlaces = cityPlaces
            .filter((place) => {
                const kinds = (place.kinds ?? "").split(",");

                return !seenPlaceIds.has(place.xid)
                    && Boolean(place.name?.trim())
                    && !kinds.some((kind) => excludedKinds.has(kind));
            })
            .sort((firstPlace, secondPlace) => (secondPlace.rate ?? 0) - (firstPlace.rate ?? 0));
        const cityLimit = cityResultDistribution[cityIndex] ?? 0;
        let addedPlaceCount = 0;

        for (const place of rankedCityPlaces) {
            if (addedPlaceCount >= cityLimit || popularPlaces.length >= limit) {
                break;
            }

            const normalizedPlaceName = buildCanonicalText(place.name ?? "", genericNameTokens);

            if (!normalizedPlaceName || hasSimilarValue(citySeenNames, normalizedPlaceName)) {
                continue;
            }

            seenPlaceIds.add(place.xid);
            citySeenNames.push(normalizedPlaceName);
            seenPlaceNamesByCity.set(city.name, citySeenNames);
            popularPlaces.push({
                id: place.xid,
                name: place.name,
                kinds: place.kinds ?? "",
                sourceCity: city.name
            });
            addedPlaceCount += 1;
        }
    }

    return popularPlaces;
}
