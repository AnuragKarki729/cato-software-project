// client/src/api.js
export function setUserId(id) {
  localStorage.setItem("userId", String(id));
}

export function getUserId() {
  return localStorage.getItem("userId");
}

export function setRole(role) {
  localStorage.setItem("role", role);
}

export function getRole() {
  return localStorage.getItem("role");
}

export function clearUser() {
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
}

export const api = {
  async get(path) {
    const url = `/api${path}`;
    const headers = {};
    
    const userId = getUserId();
    if (userId !== null) {
      headers["X-User-Id"] = userId;
    }
    
    const response = await fetch(url, { method: "GET", headers });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || response.statusText);
    }
    
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  },

  async post(path, body) {
    const url = `/api${path}`;
    const headers = {};
    
    const userId = getUserId();
    if (userId !== null) {
      headers["X-User-Id"] = userId;
    }
    
    // Set Content-Type only for JSON bodies
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || response.statusText);
    }
    
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  },

  async delete(path) {
    const url = `/api${path}`;
    const headers = {};
    
    const userId = getUserId();
    if (userId !== null) {
      headers["X-User-Id"] = userId;
    }
    
    const response = await fetch(url, { method: "DELETE", headers });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || response.statusText);
    }
    
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  }
};