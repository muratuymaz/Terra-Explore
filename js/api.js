import {
    cleanPlaceName,
    fetchJsonp,
    getCacheValue,
    isSimilarName,
    makeCacheKey,
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
        throw new Error("Request failed with status " + response.status + ".");
    }

    return response.json();
}

/* Requests top city data from one GeoNames endpoint */
async function fetchGeoNamesCities(endpoint, queryString, callbackSuffix) {
    const response = await fetchJsonp(
        endpoint + "?" + queryString,
        geoNamesCallbackParam,
        "terraExploreGeoNamesCallback" + Date.now() + callbackSuffix
    );

    if (response.status) {
        throw new Error("Map data is unavailable right now.");
    }

    const cityResults = response.geonames || [];

    return cityResults
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
    let languages = [];
    let currencies = [];
    let name = "Unknown Country";
    let countryCode = "";
    let flagUrl = "";
    let capital = "Unknown";
    let population = 0;
    let lat = Number.NaN;
    let lng = Number.NaN;
    let capitalLat = Number.NaN;
    let capitalLng = Number.NaN;

    if (country.languages) {
        languages = Object.values(country.languages);
    }

    if (country.currencies) {
        currencies = Object.values(country.currencies);
    }

    if (country.name && country.name.common) {
        name = country.name.common;
    }

    if (country.cca2) {
        countryCode = country.cca2.toLowerCase();
    }

    if (country.flags) {
        flagUrl = country.flags.svg || country.flags.png || "";
    }

    if (Array.isArray(country.capital) && country.capital.length) {
        capital = country.capital[0];
    }

    if (typeof country.population === "number") {
        population = country.population;
    }

    if (Array.isArray(country.latlng)) {
        lat = Number(country.latlng[0]);
        lng = Number(country.latlng[1]);
    }

    if (country.capitalInfo && Array.isArray(country.capitalInfo.latlng)) {
        capitalLat = Number(country.capitalInfo.latlng[0]);
        capitalLng = Number(country.capitalInfo.latlng[1]);
    }

    return {
        name,
        countryCode,
        flagUrl,
        capital,
        population,
        lat,
        lng,
        capitalLat,
        capitalLng,
        languages,
        currencies
    };
}

/* Fetches the largest cities for the selected country */
async function fetchTopCitiesByCountry(countryCode, limit = cityCount) {
    if (!geoNamesUsername) {
        throw new Error("City data is unavailable right now.");
    }

    const cacheKey = makeCacheKey(countryCode);
    const cachedCities = getCacheValue(geoNamesCache, cacheKey);

    if (cachedCities) {
        return cachedCities.slice(0, limit);
    }

    const searchParams = [
        "country=" + countryCode.toUpperCase(),
        "featureClass=P",
        "cities=cities15000",
        "maxRows=" + String(cityCount * geoNamesMaxRowsMultiplier),
        "orderby=population",
        "lang=" + geoNamesLanguage,
        "username=" + geoNamesUsername
    ].join("&");

    try {
        const cities = await fetchGeoNamesCities(geoNamesEndpoint, searchParams, 0);

        if (!cities.length) {
            throw new Error("No cities found.");
        }

        setCacheValue(geoNamesCache, cacheKey, cities);
        return cities.slice(0, limit);
    } catch {
        throw new Error("Cities could not be loaded right now.");
    }
}

/* Fetches popular place candidates around a city center */
async function fetchPopularPlacesNearCity(city) {
    const searchParams = [
        "apikey=" + openTripMapApiKey,
        "radius=" + String(cityRadiusInMeters),
        "lon=" + String(city.lng),
        "lat=" + String(city.lat),
        "format=json",
        "limit=" + String(cityFetchLimit),
        "rate=" + popularPlacesRate
    ].join("&");

    return fetchJson(API_BASE_URLS.openTripMap + "/radius?" + searchParams);
}

/* Fetches one country by name from REST Countries */
export async function fetchCountryByName(countryName) {
    const encodedCountryName = encodeURIComponent(countryName);
    const url = API_BASE_URLS.restCountries + "/name/" + encodedCountryName + "?fullText=true";

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

        throw new Error("Country details could not be loaded.");
    }
}

/* Loads the country list used by the home map and comparison inputs */
export async function fetchCountriesForMap() {
    const fields = "name,capital,capitalInfo,latlng,flags";
    const countries = await fetchJson(API_BASE_URLS.restCountries + "/all?fields=" + fields);

    return countries
        .filter((country) => country.name && country.name.common)
        .map((country) => {
            let coordinates = [];
            let capital = "";
            let flagUrl = "";

            if (Array.isArray(country.latlng)) {
                coordinates = country.latlng;
            }

            if (country.capitalInfo && Array.isArray(country.capitalInfo.latlng) && country.capitalInfo.latlng.length >= 2) {
                coordinates = country.capitalInfo.latlng;
            }

            if (Array.isArray(country.capital) && country.capital.length) {
                capital = country.capital[0];
            }

            if (country.flags) {
                flagUrl = country.flags.svg || country.flags.png || "";
            }

            const [capitalLat, capitalLng] = coordinates;

            return {
                name: country.name.common,
                capital,
                lat: Number(capitalLat),
                lng: Number(capitalLng),
                flagUrl
            };
        })
        .filter((country) => Number.isFinite(country.lat) && Number.isFinite(country.lng));
}

/* Fetches a country photo using a more specific travel-focused search */
export async function fetchCountryBackgroundImage(country) {
    if (!pixabayApiKey) {
        return null;
    }

    let countryName = "";
    let countryCapital = "";

    if (typeof country === "string") {
        countryName = country;
    } else if (country) {
        countryName = country.name || "";
        countryCapital = country.capital || "";
    }

    let preferredCity = countryCapital;

    if (["turkey", "türkiye"].includes(countryName.trim().toLowerCase())) {
        preferredCity = "Istanbul";
    }

    if (!countryName) {
        return null;
    }

    const cacheKey = makeCacheKey(countryName);
    const cachedImage = getCacheValue(pixabayCache, cacheKey);

    if (cachedImage) return cachedImage;

    let searchQuery = countryName + " landmark travel";

    if (preferredCity) {
        searchQuery = preferredCity + " " + countryName + " landmark travel";
    }

    const searchParams = [
        "key=" + pixabayApiKey,
        "q=" + encodeURIComponent(searchQuery),
        "image_type=photo",
        "orientation=horizontal",
        "category=places",
        "safesearch=true",
        "order=popular",
        "per_page=3"
    ].join("&");
    let hits = [];

    try {
        ({ hits = [] } = await fetchJson(API_BASE_URLS.pixabay + "?" + searchParams));
    } catch {
        return null;
    }

    const [image] = hits;

    if (!image) {
        return null;
    }

    const backgroundImage = {
        imageUrl: image.largeImageURL || image.webformatURL || "",
        altText: image.tags || countryName + " travel view",
        photographerName: image.user || "",
        photographerProfile: ""
    };

    if (image.user_id) {
        backgroundImage.photographerProfile = "https://pixabay.com/users/" + image.user + "-" + image.user_id + "/";
    }

    setCacheValue(pixabayCache, cacheKey, backgroundImage);
    return backgroundImage;
}

/* Fetches popular places by combining the country's selected largest cities */
export async function fetchPopularPlacesByCountry(country, limit = POPULAR_PLACES_CONFIG.totalLimit) {
    if (!openTripMapApiKey) {
        throw new Error("Popular places are unavailable right now.");
    }

    let topCities = [];

    try {
        topCities = await fetchTopCitiesByCountry(country.countryCode);
    } catch {
        throw new Error("Popular places could not be loaded right now.");
    }

    if (!topCities.length) {
        throw new Error("Popular places could not be found for this country.");
    }

    const seenPlaceIds = [];
    const seenPlaceNamesByCity = {};
    const popularPlaces = [];

    try {
        for (const [cityIndex, city] of topCities.entries()) {
            const cityPlaces = await fetchPopularPlacesNearCity(city);
            const citySeenNames = seenPlaceNamesByCity[city.name] || [];
            const rankedCityPlaces = cityPlaces
                .filter((place) => {
                    const kinds = (place.kinds || "").split(",");
                    const placeName = (place.name || "").trim();

                    return !seenPlaceIds.includes(place.xid)
                        && Boolean(placeName)
                        && !kinds.some((kind) => excludedKinds.includes(kind));
                })
                .sort((firstPlace, secondPlace) => (secondPlace.rate || 0) - (firstPlace.rate || 0));
            const cityLimit = cityResultDistribution[cityIndex] || 0;
            let addedPlaceCount = 0;

            for (const place of rankedCityPlaces) {
                if (addedPlaceCount >= cityLimit || popularPlaces.length >= limit) {
                    break;
                }

                const normalizedPlaceName = cleanPlaceName(place.name || "", genericNameTokens);

                if (!normalizedPlaceName || isSimilarName(citySeenNames, normalizedPlaceName)) {
                    continue;
                }

                seenPlaceIds.push(place.xid);
                citySeenNames.push(normalizedPlaceName);
                seenPlaceNamesByCity[city.name] = citySeenNames;
                popularPlaces.push({
                    id: place.xid,
                    name: place.name,
                    kinds: place.kinds || "",
                    sourceCity: city.name,
                    lat: Number(place.point && place.point.lat),
                    lng: Number(place.point && place.point.lon)
                });
                addedPlaceCount += 1;
            }
        }
    } catch {
        throw new Error("Popular places could not be loaded right now.");
    }

    return popularPlaces;
}
