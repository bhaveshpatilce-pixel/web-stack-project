const API_BASE = "/api";

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "fas fa-info-circle";
    if (type === "success") icon = "fas fa-check-circle";
    if (type === "error") icon = "fas fa-exclamation-circle";

    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }
    return data;
}

function saveSession({ token, user }) {
    localStorage.setItem("token", token);
    localStorage.setItem("loggedInUser", JSON.stringify(user));
}

function checkAlreadyLoggedIn() {
    const token = localStorage.getItem("token");
    const onPublicPage =
        window.location.pathname.endsWith("index.html") ||
        window.location.pathname.endsWith("/") ||
        window.location.pathname.endsWith("signup.html");

    if (token && onPublicPage) {
        window.location.href = "dashboard.html";
    }
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }

        if (password.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, password }),
            });
            const data = await handleResponse(response);
            saveSession(data);
            showToast("Registration successful!", "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);
        } catch (error) {
            showToast(error.message, "error");
        }
    });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await handleResponse(response);
            saveSession(data);
            showToast("Login successful! Welcome back.", "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);
        } catch (error) {
            showToast(error.message, "error");
        }
    });
}

document.addEventListener("DOMContentLoaded", checkAlreadyLoggedIn);
