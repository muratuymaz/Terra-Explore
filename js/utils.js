/* Reads and trims a query parameter from the current page URL */
export function getQueryParam(paramName) {
    return new URLSearchParams(window.location.search).get(paramName)?.trim() ?? "";
}

/* Formats numeric values for the UI */
export function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value);
}

/* Joins list values into a readable string */
export function formatList(values, fallbackText = "Unknown") {
    if (!values.length) {
        return fallbackText;
    }

    return values.join(", ");
}

/* Formats currency objects returned by the API */
export function formatCurrencies(currencies) {
    if (!currencies.length) {
        return "Unknown";
    }

    return currencies
        .map((currency) => {
            const currencyName = currency.name ?? "Unknown currency";
            let currencySymbol = "";

            if (currency.symbol) {
                currencySymbol = " (" + currency.symbol + ")";
            }

            return currencyName + currencySymbol;
        })
        .join(", ");
}

/* Converts plain text labels into title case */
export function toTitleCase(value) {
    return value
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/* Normalizes text so small spelling and accent differences compare more reliably */
export function normalizeText(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("en")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* Removes generic tokens from a normalized label and falls back to the full normalized text */
export function cleanPlaceName(value, ignoredTokens = new Set()) {
    const normalizedValue = normalizeText(value);
    const meaningfulTokens = normalizedValue
        .split(" ")
        .filter((token) => token && !ignoredTokens.has(token));

    return meaningfulTokens.join(" ") || normalizedValue;
}

/* Checks whether a value is effectively a duplicate of an existing normalized value */
export function isSimilarName(existingValues, candidateValue) {
    return existingValues.some((existingValue) => (
        existingValue === candidateValue
        || existingValue.includes(candidateValue)
        || candidateValue.includes(existingValue)
    ));
}

/* Builds a stable cache entry key from a user-facing name */
export function makeCacheKey(value) {
    return value.trim().toLowerCase();
}

/* Reads a JSON object from localStorage */
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

/* Saves a JSON object to localStorage */
export function writeStorageObject(storageKey, value) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
        /* Ignore storage errors so the app can continue normally */
    }
}

/* Returns a fresh cached value when it has not expired yet */
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

/* Stores a cache entry using the shared savedAt structure */
export function setCacheValue(cacheConfig, entryKey, data) {
    const cache = readStorageObject(cacheConfig.key);

    cache[entryKey] = {
        data,
        savedAt: Date.now()
    };

    writeStorageObject(cacheConfig.key, cache);
}

/* Loads JSONP data for endpoints that do not allow cross-origin fetch requests */
export function fetchJsonp(url, callbackParam = "callback", callbackName = "") {
    return new Promise((resolve, reject) => {
        const resolvedCallbackName = callbackName || ("jsonpCallback" + Date.now());
        const script = document.createElement("script");
        let isSettled = false;

        const finalize = () => {
            script.remove();
            delete window[resolvedCallbackName];
            delete globalThis[resolvedCallbackName];
        };

        const timeoutId = window.setTimeout(() => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            finalize();
            reject(new Error("JSONP request timed out: " + script.src));
        }, 10000);

        const handleJsonpResponse = (data) => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            window.clearTimeout(timeoutId);
            finalize();
            resolve(data);
        };

        window[resolvedCallbackName] = handleJsonpResponse;
        globalThis[resolvedCallbackName] = handleJsonpResponse;

        script.onerror = () => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            window.clearTimeout(timeoutId);
            finalize();
            reject(new Error("JSONP request failed: " + script.src));
        };

        script.async = true;
        script.type = "text/javascript";
        script.charset = "UTF-8";
        let separator = "?";

        if (url.includes("?")) {
            separator = "&";
        }

        script.src = url + separator + callbackParam + "=" + encodeURIComponent(resolvedCallbackName);
        document.head.append(script);
    });
}
