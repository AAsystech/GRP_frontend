// GRP_frontend/assets/js/api.js

const API_BASE_URL = "https://grp-backend.onrender.com";

function getToken() {
    return localStorage.getItem("grp_access_token");
}

async function request(path, { method = "GET", body, auth = true, headers = {} } = {}) {
    const finalHeaders = {
        "Content-Type": "application/json",
        ...headers,
    };

    if (auth) {
        const token = getToken();
        if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    // Try to parse JSON (even on errors, backend often returns JSON detail)
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

// Convenience helpers
export const api = {
    get: (path, opts = {}) => request(path, { ...opts, method: "GET" }),
    post: (path, body, opts = {}) => request(path, { ...opts, method: "POST", body }),
    put: (path, body, opts = {}) => request(path, { ...opts, method: "PUT", body }),
    del: (path, opts = {}) => request(path, { ...opts, method: "DELETE" }),
};