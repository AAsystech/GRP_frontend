// GRP_frontend/assets/js/auth.js
import { api, wakeBackend, onBackendStatusChange } from "./api.js";

const TOKEN_KEY = "grp_access_token";
const USER_KEY = "grp_user";
const ROLES_KEY = "grp_roles";
const ORGS_KEY = "grp_org_mappings";

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLES_KEY);
    localStorage.removeItem(ORGS_KEY);
}

export async function login(email, password) {
    const data = await api.post("/auth/login", { email, password }, { auth: false });

    if (!data?.access_token) throw new Error("Login succeeded but no token returned.");

    setToken(data.access_token);

    if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    if (data.roles) localStorage.setItem(ROLES_KEY, JSON.stringify(data.roles));
    if (data.org_mappings) localStorage.setItem(ORGS_KEY, JSON.stringify(data.org_mappings));

    return data;
}

export function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

function showError(msg) {
    const el = document.getElementById("login-error");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
}

function hideError() {
    const el = document.getElementById("login-error");
    if (!el) return;
    el.textContent = "";
    el.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const banner = document.getElementById("backend-status-banner");

    let isSubmitting = false;

    function updateLoginUI(status) {
        if (banner) {
            if (status.waking) {
                banner.className = "alert alert-info mb-3";
                banner.textContent = "Starting services. First load may take up to 60 seconds.";
            } else if (status.failed) {
                banner.className = "alert alert-warning mb-3";
                banner.textContent = "Server is taking longer than expected. Please wait or refresh the page.";
            } else {
                banner.className = "alert alert-info d-none mb-3";
            }
        }

        if (submitBtn) {
            submitBtn.disabled = status.waking || isSubmitting;

            if (status.waking) {
                submitBtn.textContent = "Starting Server...";
            } else if (isSubmitting) {
                submitBtn.textContent = "Please wait...";
            } else {
                submitBtn.textContent = "Login";
            }
        }
    }

    onBackendStatusChange(updateLoginUI);
    wakeBackend();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideError();

        const email = document.getElementById("email")?.value?.trim();
        const password = document.getElementById("password")?.value;

        if (!email || !password) {
            showError("Please enter email and password.");
            return;
        }

        try {
            isSubmitting = true;
            updateLoginUI({ waking: false, failed: false });

            await login(email, password);
            window.location.href = "dashboard.html";
        } catch (err) {
            showError(err?.message || "Login failed.");
            console.error("Login error:", err);
        } finally {
            isSubmitting = false;
            updateLoginUI({ waking: false, failed: false });
        }
    });
});