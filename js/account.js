import { getCurrentUser, initHeaderAuth, saveCurrentUser } from "./auth.js";
import { getQueryParam } from "./utils.js";

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
    country: document.querySelector("#profileCountry")
};

/* Shows the short success message under the sign up form */
function showSignupFeedback(message) {
    if (!signupElements.feedback) {
        return;
    }

    signupElements.feedback.textContent = message;
    signupElements.feedback.hidden = false;
}

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
    showSignupFeedback("Account created successfully! Redirecting to your profile...");

    if (signupElements.submitButton) {
        signupElements.submitButton.disabled = true;
    }

    window.setTimeout(() => {
        window.location.href = "profile.html";
    }, 900);
}

/* Fills the profile page with saved user data or fallback query values */
function fillProfile() {
    let name = getQueryParam("name");
    let email = getQueryParam("email");
    let country = getQueryParam("country");
    const savedUser = getCurrentUser();

    if (savedUser) {
        name = savedUser.name || name;
        email = savedUser.email || email;
        country = savedUser.country || country;
    } else if (name || email || country) {
        saveCurrentUser({ name, email, country });
    }

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
        let placeText = "";

        if (country) {
            placeText = " from " + country;
        }

        profileElements.subtitle.textContent = "Your TerraExplore profile is ready" + placeText + ". Start exploring your next destination.";
    }
}

initHeaderAuth();
signupElements.form?.addEventListener("submit", handleSignupSubmit);

if (profileElements.greeting) {
    fillProfile();
}
