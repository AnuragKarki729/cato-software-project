// Responsibility 7 — Aye Myo Myat (6837919)
// Keep the shared helpers so existing upload and feature pages keep working.
const TOKEN_KEY = 'catoToken';
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('devUserId'); // retire the old impersonation header
}

async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const response = await fetch(`/api${path}`, { method, headers, body: payload });
  let data = null;
  if (response.status !== 204) {
    try { data = await response.json(); }
    catch { throw new Error('The server returned an unexpected response. Please try again.'); }
  }
  if (!response.ok) {
    if (response.status === 401 && token && token === getToken()) {
      setToken(null);
      window.dispatchEvent(new Event('cato:session-expired'));
    }
    const detail = Array.isArray(data?.detail)
      ? data.detail.map(item => item.msg.replace(/^Value error, /, '')).join('. ')
      : data?.detail;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return data;
}
export const api = {
  get: path => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: path => request('DELETE', path),
};
