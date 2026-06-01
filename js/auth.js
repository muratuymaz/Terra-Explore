const REGISTERED_USER_STORAGE_KEY = "terraExploreRegisteredUser";
const SESSION_USER_STORAGE_KEY = "terraExploreSessionUser";

/* Reads the saved account from browser storage */
export function getRegisteredUser() {
    try {
        const storedUser = localStorage.getItem(REGISTERED_USER_STORAGE_KEY);

        if (storedUser) {
            return JSON.parse(storedUser);
        }

        const legacyUser = localStorage.getItem("terraExploreUser");

        if (legacyUser) {
            return JSON.parse(legacyUser);
        }
    } catch {
        return null;
    }

    return null;
}

/* Reads the current session user from browser storage */
export function getCurrentUser() {
    try {
        const storedUser = sessionStorage.getItem(SESSION_USER_STORAGE_KEY);

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);
    } catch {
        return null;
    }
}

/* Saves the registered account in local storage */
export function saveRegisteredUser(user) {
    try {
        localStorage.setItem(REGISTERED_USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
        /* Ignore storage errors so the app can keep working. */
    }
}

/* Saves the current session user so the profile flow can stay visible across pages */
export function saveCurrentUser(user) {
    try {
        sessionStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
        /* Ignore storage errors so the app can keep working. */
    }
}

/* Clears the current session during logout */
export function clearCurrentUser() {
    try {
        sessionStorage.removeItem(SESSION_USER_STORAGE_KEY);
    } catch {
        /* Ignore storage errors so the app can keep working. */
    }
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

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            clearCurrentUser();
            window.location.href = "index.html";
        });
    }
}
