// All calls to the server go through these helpers.
// The temporary development login sends the chosen user's id in "X-User-Id".
// Responsibility 7 will replace this with a real login token.

export function getDevUserId() {
  return localStorage.getItem("devUserId");
}

export function setDevUserId(id) {
  if (id) localStorage.setItem("devUserId", id);
  else localStorage.removeItem("devUserId");
}

async function request(method, path, body) {
  const headers = {};
  const userId = getDevUserId();
  if (userId) headers["X-User-Id"] = userId;

  let payload;
  if (body instanceof FormData) {
    payload = body; // file uploads
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`/api${path}`, { method, headers, body: payload });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.detail || `Request failed (${response.status})`);
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),
};
