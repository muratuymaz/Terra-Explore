const USER_STORAGE_KEY = "terraExploreUser";

/* Reads the locally saved user from browser storage */
export function getCurrentUser() {
    try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);
    } catch {
        return null;
    }
}

/* Saves the current user so the profile flow can stay visible across pages */
export function saveCurrentUser(user) {
    try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
        /* Ignore storage errors so the app can keep working. */
    }
}

/* Clears the locally saved user during logout */
export function clearCurrentUser() {
    try {
        localStorage.removeItem(USER_STORAGE_KEY);
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

    logoutButton?.addEventListener("click", () => {
        clearCurrentUser();
        window.location.href = "index.html";
    });
}
