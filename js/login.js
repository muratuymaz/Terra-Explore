import { getRegisteredUser, initHeaderAuth, saveCurrentUser } from "./auth.js";

const loginElements = {
    form: document.querySelector("#loginForm"),
    feedback: document.querySelector("#loginFeedback")
};

/* Checks the local demo account and opens the profile page */
function handleLoginSubmit(event) {
    event.preventDefault();

    if (!loginElements.form || !loginElements.form.reportValidity()) {
        return;
    }

    const formData = new FormData(loginElements.form);
    const enteredEmail = String(formData.get("email") || "").trim();
    const enteredPassword = String(formData.get("password") || "");
    const savedUser = getRegisteredUser();

    if (!savedUser) {
        if (loginElements.feedback) {
            loginElements.feedback.textContent = "Please sign up first.";
            loginElements.feedback.hidden = false;
        }

        return;
    }

    if (savedUser.email !== enteredEmail || savedUser.password !== enteredPassword) {
        if (loginElements.feedback) {
            loginElements.feedback.textContent = "Email or password is wrong.";
            loginElements.feedback.hidden = false;
        }

        return;
    }

    saveCurrentUser(savedUser);

    if (loginElements.feedback) {
        loginElements.feedback.textContent = "Login success. Redirecting to your profile...";
        loginElements.feedback.hidden = false;
    }

    window.setTimeout(() => {
        window.location.href = "profile.html";
    }, 900);
}

initHeaderAuth();
loginElements.form?.addEventListener("submit", handleLoginSubmit);