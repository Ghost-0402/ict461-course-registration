// api.js — Fetch helper module, imported into app.js as a JS module.
// Centralises all calls to the API at http://localhost:3000.

const API_BASE = "http://localhost:3000";

/**
 * Low-level helper: wraps fetch, always checks response.ok, and never
 * tries to parse a 204 (No Content) response as JSON.
 */
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    // Try to extract a useful error message; fall back to statusText.
    let message = response.statusText;
    try {
      const data = await response.json();
      if (data && data.error) message = data.error;
      if (data && data.errors) message = data.errors.join(" ");
    } catch {
      /* body wasn't JSON — ignore and use statusText */
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null; // No body to parse
  }

  return response.json();
}

export function fetchCourses() {
  return request("/api/courses");
}

export function fetchRegistration(id) {
  return request(`/api/registrations/${encodeURIComponent(id)}`);
}

export function createRegistration(data) {
  return request("/api/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateRegistration(id, data) {
  return request(`/api/registrations/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function patchRegistration(id, data) {
  return request(`/api/registrations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteRegistration(id) {
  return request(`/api/registrations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Cookie demo — needs credentials: "include" so the browser sends/stores
// the cookie across the cross-origin request (Task 4.1).
export function setDemoCookie() {
  return request("/api/demo-cookie", { credentials: "include" });
}
