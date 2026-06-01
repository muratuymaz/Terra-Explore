const REGISTERED_USER_STORAGE_KEY = "terraExploreRegisteredUser";
const SESSION_USER_STORAGE_KEY = "terraExploreSessionUser";

function readStoredUser(storage, key) {
    try {
        const storedUser = storage.getItem(key);

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);
    } catch {
        return null;
    }
}

function writeStoredUser(storage, key, user) {
    try {
        storage.setItem(key, JSON.stringify(user));
    } catch {
        /* Ignore storage errors so the app can keep working. */
    }
}

function clearStoredUser(storage, key) {
    try {
        storage.removeItem(key);
    } catch {
        /* Ignore storage errors so the app can keep working. */
    }
}

/* Reads the saved account from browser storage */
export function getRegisteredUser() {
    const localUser = readStoredUser(localStorage, REGISTERED_USER_STORAGE_KEY);

    if (localUser) {
        return localUser;
    }

    return readStoredUser(localStorage, "terraExploreUser");
}

/* Reads the current session user from browser storage */
export function getCurrentUser() {
    return readStoredUser(sessionStorage, SESSION_USER_STORAGE_KEY);
}

/* Saves the registered account in local storage */
export function saveRegisteredUser(user) {
    writeStoredUser(localStorage, REGISTERED_USER_STORAGE_KEY, user);
}

/* Saves the current session user so the profile flow can stay visible across pages */
export function saveCurrentUser(user) {
    writeStoredUser(sessionStorage, SESSION_USER_STORAGE_KEY, user);
}

/* Clears the current session during logout */
export function clearCurrentUser() {
    clearStoredUser(sessionStorage, SESSION_USER_STORAGE_KEY);
}

/* Swaps the default header action with profile and logout controls */
export function initHeaderAuth() {
    const menuActions = document.querySelector("[data-auth-menu]");
    const currentUser = getCurrentUser();

    if (!menuActions || !currentUser) {
        return;
    }

    menuActions.innerHTML = `
        <a class="button-light" href="profile.html">Profile</a>
        <button type="button" class="button-text menu-logout-button">Log Out</button>
    `;

    const logoutButton = menuActions.querySelector(".menu-logout-button");

    logoutButton?.addEventListener("click", () => {
        clearCurrentUser();
        window.location.href = "index.html";
    });
}
