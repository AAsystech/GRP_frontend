// GRP_frontend/assets/js/api.js

export const API_BASE_URL =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://localhost:8000"
        : "https://grp-backend.onrender.com";

let backendReady = false;
let backendWaking = false;
let backendFailed = false;

const listeners = new Set();

function emitBackendStatus() {
    const status = {
        ready: backendReady,
        waking: backendWaking,
        failed: backendFailed,
    };

    window.dispatchEvent(new CustomEvent("backend-status", { detail: status }));
    listeners.forEach((fn) => fn(status));
}

export function onBackendStatusChange(fn) {
    listeners.add(fn);
    fn({ ready: backendReady, waking: backendWaking, failed: backendFailed });
    return () => listeners.delete(fn);
}

export function getBackendStatus() {
    return {
        ready: backendReady,
        waking: backendWaking,
        failed: backendFailed,
    };
}

export async function wakeBackend() {
    if (backendReady) return true;
    if (backendWaking) {
        return new Promise((resolve) => {
            const off = onBackendStatusChange((status) => {
                if (status.ready || status.failed) {
                    off();
                    resolve(status.ready);
                }
            });
        });
    }

    backendWaking = true;
    backendFailed = false;
    emitBackendStatus();

    for (let i = 1; i <= 20; i++) {
        try {
            const res = await fetch(`${API_BASE_URL}/health`, {
                method: "GET",
                cache: "no-store",
            });

            if (res.ok) {
                backendReady = true;
                backendWaking = false;
                backendFailed = false;
                emitBackendStatus();
                return true;
            }
        } catch (err) {
            console.log(`Backend waking attempt ${i}/20...`, err);
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    backendReady = false;
    backendWaking = false;
    backendFailed = true;
    emitBackendStatus();
    return false;
}

function getToken() {
    return localStorage.getItem("grp_access_token");
}

export function debugAuthToken() {
    const token = getToken();

    console.log("SESSION EXISTS:", Boolean(token));

    if (token) {
        try {
            console.log("TOKEN PAYLOAD:", JSON.parse(atob(token.split(".")[1])));
        } catch (err) {
            console.log("Token exists but payload could not be decoded:", err);
        }
    } else {
        console.log("No auth token found");
    }
}

async function request(
    path,
    { method = "GET", body, auth = true, headers = {} } = {}
) {
    debugAuthToken();

    const status = getBackendStatus();
    if (!status.ready) {
        const ok = await wakeBackend();
        if (!ok) {
            throw new Error("Server is taking longer than expected. Please wait or refresh the page.");
        }
    }

    const isFormData = body instanceof FormData;

    const finalHeaders = {
        ...headers,
    };

    if (!isFormData && !finalHeaders["Content-Type"]) {
        finalHeaders["Content-Type"] = "application/json";
    }

    if (auth) {
        const token = getToken();
        if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });

    let data = null;
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        data = await res.json();
    } else {
        const text = await res.text();
        data = text ? { message: text } : null;
    }

    if (!res.ok) {
        const msg =
            (data && (data.detail || data.message)) ||
            `Request failed (${res.status})`;

        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}

export const api = {
    get: (path, opts = {}) => request(path, { ...opts, method: "GET" }),
    post: (path, body, opts = {}) => request(path, { ...opts, method: "POST", body }),
    put: (path, body, opts = {}) => request(path, { ...opts, method: "PUT", body }),
    del: (path, opts = {}) => request(path, { ...opts, method: "DELETE" }),
    upload: (path, formData, opts = {}) =>
        request(path, {
            ...opts,
            method: "POST",
            body: formData,
            headers: { ...(opts.headers || {}) },
        }),
};

// Do not block page render. Start wake-up in background.
wakeBackend();