import { getCurrentUser, initHeaderAuth, saveCurrentUser } from "./auth.js";
import {
    getFavoriteCountries,
    getFavoritePlaces,
    getVisitedCountries,
    getWantToVisitCountries
} from "./travel-data.js";

const signupElements = {
    form: document.querySelector("#signupForm"),
    feedback: document.querySelector("#signupFeedback"),
    submitButton: document.querySelector('#signupForm button[type="submit"]')
};

const profileElements = {
    greeting: document.querySelector("#profileGreeting"),
    subtitle: document.querySelector("#profileSubtitle"),
    name: document.querySelector("#profileName"),
    email: document.querySelector("#profileEmail"),
    country: document.querySelector("#profileCountry"),
    favoriteCountries: document.querySelector("#favoriteCountriesList"),
    favoritePlaces: document.querySelector("#favoritePlacesList"),
    visitedCountries: document.querySelector("#visitedCountriesList"),
    wantToVisitCountries: document.querySelector("#wantToVisitCountriesList")
};

/* Validates the demo form, stores the user, and redirects to the profile page */
function handleSignupSubmit(event) {
    event.preventDefault();

    if (!signupElements.form || !signupElements.form.reportValidity()) {
        return;
    }

    const formData = new FormData(signupElements.form);
    const user = {
        name: String(formData.get("fullName") || "").trim(),
        country: String(formData.get("country") || "").trim(),
        email: String(formData.get("email") || "").trim()
    };

    saveCurrentUser(user);

    if (signupElements.feedback) {
        signupElements.feedback.textContent = "Account created successfully! Redirecting to your profile...";
        signupElements.feedback.hidden = false;
    }

    if (signupElements.submitButton) {
        signupElements.submitButton.disabled = true;
    }

    window.setTimeout(() => {
        window.location.href = "profile.html";
    }, 900);
}

/* Fills the profile page with saved user data */
function fillProfile() {
    const savedUser = getCurrentUser();
    const name = savedUser?.name || "";
    const email = savedUser?.email || "";
    const country = savedUser?.country || "";

    if (name) {
        profileElements.greeting.textContent = "Welcome, " + name;
        profileElements.name.textContent = name;
    }

    if (email) {
        profileElements.email.textContent = email;
    }

    if (country) {
        profileElements.country.textContent = country;
    }

    if (name || country) {
        const placeText = country ? " from " + country : "";

        profileElements.subtitle.textContent = "Your TerraExplore profile is ready" + placeText + ". Start exploring your next destination.";
    }
}

function renderCountryTags(container, countries, emptyText) {
    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!countries.length) {
        container.innerHTML = '<p class="profile-empty">' + emptyText + "</p>";
        return;
    }

    countries.forEach((country) => {
        const countryLink = document.createElement("a");

        countryLink.className = "profile-tag";
        countryLink.href = "country.html?name=" + encodeURIComponent(country);
        countryLink.textContent = country;
        container.append(countryLink);
    });
}

function renderFavoritePlaces() {
    if (!profileElements.favoritePlaces) {
        return;
    }

    const favoritePlaces = getFavoritePlaces();
    profileElements.favoritePlaces.innerHTML = "";

    if (!favoritePlaces.length) {
        profileElements.favoritePlaces.innerHTML = '<p class="profile-empty">No favorite places yet.</p>';
        return;
    }

    favoritePlaces.forEach((place) => {
        const placeItem = document.createElement("article");
        const title = document.createElement("strong");
        const details = document.createElement("span");

        placeItem.className = "profile-place-item";
        title.textContent = place.name;
        details.textContent = [place.sourceCity, place.country].filter(Boolean).join(", ");
        placeItem.append(title, details);
        profileElements.favoritePlaces.append(placeItem);
    });
}

function fillTravelLists() {
    renderCountryTags(profileElements.favoriteCountries, getFavoriteCountries(), "No favorite countries yet.");
    renderCountryTags(profileElements.visitedCountries, getVisitedCountries(), "No visited countries yet.");
    renderCountryTags(profileElements.wantToVisitCountries, getWantToVisitCountries(), "No countries in your wishlist yet.");
    renderFavoritePlaces();
}

initHeaderAuth();
signupElements.form?.addEventListener("submit", handleSignupSubmit);

if (profileElements.greeting) {
    fillProfile();
    fillTravelLists();
}
