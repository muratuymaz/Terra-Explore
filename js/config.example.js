const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const API_BASE_URLS = {
    restCountries: "https://api.restcountries.com/countries/v5",
    pixabay: "https://pixabay.com/api/",
    openTripMap: "https://api.opentripmap.com/0.1/en/places"
};

export const API_KEYS = {
    restCountries: "YOUR_REST_COUNTRIES_API_KEY",
    pixabay: "YOUR_PIXABAY_API_KEY",
    geoNamesUsername: "YOUR_GEONAMES_USERNAME",
    openTripMap: "YOUR_OPENTRIPMAP_API_KEY"
};

export const CACHE_CONFIG = {
    restCountries: {
        key: "terraExploreRestCountriesCacheV1",
        maxAge: DAY_IN_MS
    },
    pixabay: {
        key: "terraExplorePixabayCache",
        maxAge: DAY_IN_MS
    },
    geoNames: {
        key: "terraExploreGeoNamesCache",
        maxAge: DAY_IN_MS
    },
    popularPlaces: {
        key: "terraExplorePopularPlacesCacheV13",
        maxAge: DAY_IN_MS
    }
};

export const GEONAMES_CONFIG = {
    endpoint: "http://api.geonames.org/searchJSON",
    callbackParam: "callback",
    language: "en",
    maxRowsMultiplier: 4
};

export const POPULAR_PLACES_CONFIG = {
    cityCount: 2,
    cityRadiusInMeters: 35000,
    cityFetchLimit: 18,
    cityResultDistribution: [5, 4],
    totalLimit: 9,
    rate: "3",
    excludedKinds: [
        "battlefields",
        "settlements",
        "adult",
        "restaurants",
        "shops"
    ],
    genericNameTokens: [
        "monument",
        "mosque",
        "church",
        "cathedral",
        "complex",
        "camii",
        "cami"
    ]
};
