const STORAGE_KEYS = {
    recentCountries: "terraExploreRecentCountries",
    favoriteCountries: "terraExploreFavoriteCountries",
    favoritePlaces: "terraExploreFavoritePlaces",
    visitedCountries: "terraExploreVisitedCountries",
    wantToVisitCountries: "terraExploreWantToVisitCountries"
};

const MAX_RECENT_COUNTRIES = 6;

/* Reads one saved list from localStorage and safely falls back to an empty array */
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
        /* Ignore storage errors so the app can keep working. */
    }

    return [];
}

/* Saves one list back to localStorage without breaking the UI on storage errors */
function writeList(storageKey, value) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
        /* Ignore storage errors so the app can keep working. */
    }
}

/* Normalizes text values so country and place comparisons stay consistent */
function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
}

/* Builds one stable key for a place using its name, city, and country */
function buildPlaceKey(place, countryName) {
    return [
        place.name,
        place.sourceCity,
        countryName
    ]
        .map(normalizeKey)
        .filter(Boolean)
        .join("|");
}

/* Toggles a country in one saved list and returns the new active state */
function toggleCountryInList(storageKey, countryName) {
    const trimmedCountryName = String(countryName || "").trim();

    if (!trimmedCountryName) {
        return false;
    }

    const countries = readList(storageKey);
    const countryKey = normalizeKey(trimmedCountryName);
    const existingIndex = countries.findIndex((country) => normalizeKey(country) === countryKey);

    if (existingIndex >= 0) {
        countries.splice(existingIndex, 1);
        writeList(storageKey, countries);
        return false;
    }

    countries.unshift(trimmedCountryName);
    writeList(storageKey, countries);
    return true;
}

/* Checks whether a country already exists in one saved list */
function hasCountryInList(storageKey, countryName) {
    const countryKey = normalizeKey(countryName);

    return readList(storageKey).some((country) => normalizeKey(country) === countryKey);
}

/* Keeps the recent country list fresh and limited to the latest few entries */
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

/* Returns the countries shown in the recent searches area */
export function getRecentCountries() {
    return readList(STORAGE_KEYS.recentCountries);
}

/* Adds or removes one country from the favorites list */
export function toggleFavoriteCountry(countryName) {
    return toggleCountryInList(STORAGE_KEYS.favoriteCountries, countryName);
}

/* Checks whether the selected country is already favorited */
export function isFavoriteCountry(countryName) {
    return hasCountryInList(STORAGE_KEYS.favoriteCountries, countryName);
}

/* Returns all saved favorite countries for the profile page */
export function getFavoriteCountries() {
    return readList(STORAGE_KEYS.favoriteCountries);
}

/* Adds or removes one popular place from the saved favorite places list */
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

/* Checks whether one popular place is already saved as a favorite */
export function isFavoritePlace(place, countryName) {
    const placeKey = buildPlaceKey(place, countryName);

    return readList(STORAGE_KEYS.favoritePlaces).some((savedPlace) => savedPlace.key === placeKey);
}

/* Returns the saved favorite places for the profile page */
export function getFavoritePlaces() {
    return readList(STORAGE_KEYS.favoritePlaces);
}

/* Stores whether a country is marked as visited or as a future destination */
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

/* Returns the current travel status for one country */
export function getCountryTravelStatus(countryName) {
    if (hasCountryInList(STORAGE_KEYS.visitedCountries, countryName)) {
        return "visited";
    }

    if (hasCountryInList(STORAGE_KEYS.wantToVisitCountries, countryName)) {
        return "want";
    }

    return "";
}

/* Returns all countries marked as visited */
export function getVisitedCountries() {
    return readList(STORAGE_KEYS.visitedCountries);
}

/* Returns all countries marked for future travel */
export function getWantToVisitCountries() {
    return readList(STORAGE_KEYS.wantToVisitCountries);
}
