const STORAGE_KEYS = {
    recentCountries: "terraExploreRecentCountries",
    favoriteCountries: "terraExploreFavoriteCountries",
    favoritePlaces: "terraExploreFavoritePlaces",
    visitedCountries: "terraExploreVisitedCountries",
    wantToVisitCountries: "terraExploreWantToVisitCountries"
};

const MAX_RECENT_COUNTRIES = 6;

/* Reads one saved list from localStorage */
function readList(storageKey) {
    try {
        const storedValue = localStorage.getItem(storageKey);

        if (!storedValue) {
            return [];
        }

        const parsedValue = JSON.parse(storedValue);

        if (Array.isArray(parsedValue)) {
            return parsedValue;
        }
    } catch {
        /* Ignore storage errors. */
    }

    return [];
}

/* Saves one list back to localStorage */
function writeList(storageKey, value) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
        /* Ignore storage errors. */
    }
}

/* Normalizes text for consistent comparisons */
function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
}

/* Builds one stable key for a place */
function buildPlaceKey(place, countryName) {
    const placeName = normalizeKey(place.name);
    const cityName = normalizeKey(place.sourceCity);
    const normalizedCountryName = normalizeKey(countryName);

    return [placeName, cityName, normalizedCountryName].filter(Boolean).join("|");
}

/* Saves a recent country */
export function saveRecentCountry(countryName) {
    const trimmedCountryName = String(countryName || "").trim();

    if (!trimmedCountryName) {
        return;
    }

    const recentCountries = readList(STORAGE_KEYS.recentCountries)
        .filter((country) => normalizeKey(country) !== normalizeKey(trimmedCountryName));

    recentCountries.unshift(trimmedCountryName);
    writeList(STORAGE_KEYS.recentCountries, recentCountries.slice(0, MAX_RECENT_COUNTRIES));
}

/* Returns the recent countries */
export function getRecentCountries() {
    return readList(STORAGE_KEYS.recentCountries);
}

/* Toggles one country in favorites */
export function toggleFavoriteCountry(countryName) {
    const trimmedCountryName = String(countryName || "").trim();

    if (!trimmedCountryName) {
        return false;
    }

    const favoriteCountries = readList(STORAGE_KEYS.favoriteCountries);
    const countryKey = normalizeKey(trimmedCountryName);
    const existingIndex = favoriteCountries.findIndex((country) => normalizeKey(country) === countryKey);

    if (existingIndex >= 0) {
        favoriteCountries.splice(existingIndex, 1);
        writeList(STORAGE_KEYS.favoriteCountries, favoriteCountries);
        return false;
    }

    favoriteCountries.unshift(trimmedCountryName);
    writeList(STORAGE_KEYS.favoriteCountries, favoriteCountries);
    return true;
}

/* Checks whether a country is favorited */
export function isFavoriteCountry(countryName) {
    const countryKey = normalizeKey(countryName);

    return readList(STORAGE_KEYS.favoriteCountries)
        .some((country) => normalizeKey(country) === countryKey);
}

/* Returns all favorite countries */
export function getFavoriteCountries() {
    return readList(STORAGE_KEYS.favoriteCountries);
}

/* Toggles one place in favorites */
export function toggleFavoritePlace(place, countryName) {
    const favoritePlaces = readList(STORAGE_KEYS.favoritePlaces);
    const placeKey = buildPlaceKey(place, countryName);
    const existingIndex = favoritePlaces.findIndex((savedPlace) => savedPlace.key === placeKey);

    if (existingIndex >= 0) {
        favoritePlaces.splice(existingIndex, 1);
        writeList(STORAGE_KEYS.favoritePlaces, favoritePlaces);
        return false;
    }

    favoritePlaces.unshift({
        key: placeKey,
        name: place.name,
        sourceCity: place.sourceCity || "",
        country: countryName,
        kinds: place.kinds || ""
    });
    writeList(STORAGE_KEYS.favoritePlaces, favoritePlaces);
    return true;
}

/* Checks whether a place is favorited */
export function isFavoritePlace(place, countryName) {
    const placeKey = buildPlaceKey(place, countryName);

    return readList(STORAGE_KEYS.favoritePlaces).some((savedPlace) => savedPlace.key === placeKey);
}

/* Returns all favorite places */
export function getFavoritePlaces() {
    return readList(STORAGE_KEYS.favoritePlaces);
}

/* Stores the travel status for one country */
export function setCountryTravelStatus(countryName, status) {
    const trimmedCountryName = String(countryName || "").trim();

    if (!trimmedCountryName) {
        return;
    }

    let visitedCountries = readList(STORAGE_KEYS.visitedCountries)
        .filter((country) => normalizeKey(country) !== normalizeKey(trimmedCountryName));
    let wantToVisitCountries = readList(STORAGE_KEYS.wantToVisitCountries)
        .filter((country) => normalizeKey(country) !== normalizeKey(trimmedCountryName));

    if (status === "visited") {
        visitedCountries.unshift(trimmedCountryName);
    }

    if (status === "want") {
        wantToVisitCountries.unshift(trimmedCountryName);
    }

    writeList(STORAGE_KEYS.visitedCountries, visitedCountries);
    writeList(STORAGE_KEYS.wantToVisitCountries, wantToVisitCountries);
}

/* Returns the saved travel status */
export function getCountryTravelStatus(countryName) {
    const countryKey = normalizeKey(countryName);
    const isVisited = readList(STORAGE_KEYS.visitedCountries)
        .some((country) => normalizeKey(country) === countryKey);

    if (isVisited) {
        return "visited";
    }

    const wantsToVisit = readList(STORAGE_KEYS.wantToVisitCountries)
        .some((country) => normalizeKey(country) === countryKey);

    if (wantsToVisit) {
        return "want";
    }

    return "";
}

/* Returns the visited countries */
export function getVisitedCountries() {
    return readList(STORAGE_KEYS.visitedCountries);
}

/* Returns the wishlist countries */
export function getWantToVisitCountries() {
    return readList(STORAGE_KEYS.wantToVisitCountries);
}
