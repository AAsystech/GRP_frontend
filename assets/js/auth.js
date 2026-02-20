// GRP_frontend/assets/js/auth.js
import { api } from "./api.js";

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
    // backend expects JSON: { email, password }
    const data = await api.post("/auth/login", { email, password }, { auth: false });

    // expected response:
    // { access_token, token_type, user, roles, org_mappings }
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

// Auto-wire the login form if present on the page
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    if (!form) return;

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
            await login(email, password);

            // redirect after success
            window.location.href = "dashboard.html";
        } catch (err) {
            showError(err?.message || "Login failed.");
            console.error("Login error:", err);
        }
    });
});