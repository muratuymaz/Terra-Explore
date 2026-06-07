/* Reads one query value from the current URL */
export function getQueryParam(paramName) {
    const queryString = window.location.search.replace("?", "");

    if (!queryString) {
        return "";
    }

    const queryParts = queryString.split("&");

    for (const queryPart of queryParts) {
        const [key, value] = queryPart.split("=");

        if (key === paramName && value) {
            return decodeURIComponent(value).trim();
        }
    }

    return "";
}

/* Formats numbers for the UI */
export function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value);
}

/* Joins a list into readable text */
export function formatList(values, fallbackText = "Unknown") {
    if (!values.length) {
        return fallbackText;
    }

    return values.join(", ");
}

/* Formats the currency list */
export function formatCurrencies(currencies) {
    if (!currencies.length) {
        return "Unknown";
    }

    return currencies
        .map((currency) => {
            let currencyName = "Unknown currency";

            if (currency.name) {
                currencyName = currency.name;
            }
            let currencySymbol = "";

            if (currency.symbol) {
                currencySymbol = " (" + currency.symbol + ")";
            }

            return currencyName + currencySymbol;
        })
        .join(", ");
}

/* Converts text into title case */
export function toTitleCase(value) {
    return value
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/* Normalizes text for safer comparisons */
export function normalizeText(value) {
    let normalizedValue = String(value || "").trim().toLowerCase().replaceAll("_", " ");
    const specialCharacters = "çğıöşüáàâéèêíìîóòôúùû";
    const plainCharacters = "cgiosuaaaeeeiiiooouuu";

    normalizedValue = normalizedValue
        .split("")
        .map((character) => {
            const specialIndex = specialCharacters.indexOf(character);

            if (specialIndex >= 0) {
                return plainCharacters[specialIndex];
            }

            return character;
        })
        .join("");

    normalizedValue = normalizedValue
        .split("")
        .map((character) => {
            const isLowerLetter = character >= "a" && character <= "z";
            const isNumber = character >= "0" && character <= "9";

            if (isLowerLetter || isNumber || character === " ") {
                return character;
            }

            return " ";
        })
        .join("");

    return normalizedValue
        .split(" ")
        .filter(Boolean)
        .join(" ");
}

/* Removes generic tokens from a place name */
export function cleanPlaceName(value, ignoredTokens = []) {
    const normalizedValue = normalizeText(value);
    const meaningfulTokens = normalizedValue
        .split(" ")
        .filter((token) => token && !ignoredTokens.includes(token));

    return meaningfulTokens.join(" ") || normalizedValue;
}

/* Checks whether two names are basically the same */
export function isSimilarName(existingValues, candidateValue) {
    return existingValues.some((existingValue) => (
        existingValue === candidateValue
        || existingValue.includes(candidateValue)
        || candidateValue.includes(existingValue)
    ));
}

/* Builds a cache key from a display name */
export function makeCacheKey(value) {
    return value.trim().toLowerCase();
}

/* Reads one object from localStorage */
export function readStorageObject(storageKey) {
    try {
        const storedValue = localStorage.getItem(storageKey);

        if (!storedValue) {
            return {};
        }

        return JSON.parse(storedValue);
    } catch {
        return {};
    }
}

/* Saves one object to localStorage */
export function writeStorageObject(storageKey, value) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
        /* Ignore storage errors. */
    }
}

/* Returns a cached value while it is still fresh */
export function getCacheValue(cacheConfig, entryKey) {
    const cache = readStorageObject(cacheConfig.key);
    const cachedItem = cache[entryKey];

    if (!cachedItem) {
        return null;
    }

    const isExpired = Date.now() - cachedItem.savedAt > cacheConfig.maxAge;

    if (isExpired) {
        delete cache[entryKey];
        writeStorageObject(cacheConfig.key, cache);
        return null;
    }

    return cachedItem.data;
}

/* Stores one cache entry */
export function setCacheValue(cacheConfig, entryKey, data) {
    const cache = readStorageObject(cacheConfig.key);

    cache[entryKey] = {
        data,
        savedAt: Date.now()
    };

    writeStorageObject(cacheConfig.key, cache);
}

/* Loads JSONP data for endpoints without normal fetch support */
export function fetchJsonp(url, callbackParam = "callback", callbackName = "") {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const resolvedCallbackName = callbackName || "jsonpCallback" + Date.now();
        let separator = "?";

        if (url.includes("?")) {
            separator = "&";
        }
        let timeoutId = 0;
        let isDone = false;

        const finalize = () => {
            script.remove();
            delete window[resolvedCallbackName];
            window.clearTimeout(timeoutId);
        };

        timeoutId = window.setTimeout(() => {
            if (isDone) {
                return;
            }

            isDone = true;
            finalize();
            reject(new Error("City data could not be loaded right now."));
        }, 10000);

        window[resolvedCallbackName] = (data) => {
            if (isDone) {
                return;
            }

            isDone = true;
            finalize();
            resolve(data);
        };

        script.onerror = () => {
            if (isDone) {
                return;
            }

            isDone = true;
            finalize();
            reject(new Error("City data could not be loaded right now."));
        };

        script.async = true;
        script.src = url + separator + callbackParam + "=" + resolvedCallbackName;
        document.head.append(script);
    });
}
