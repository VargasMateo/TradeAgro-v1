/**
 * Centralized API utility for authenticated requests.
 * Automatically adds the Authorization header and handles auth errors (401/403).
 */

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
  };

  // If it's FormData, let the browser set the Content-Type automatically with the boundary
  if (headers['Content-Type'] === undefined) {
    delete (headers as any)['Content-Type'];
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    console.warn('[AUTH] Authentication error detected (401/403). Forcing logout.');
    window.dispatchEvent(new CustomEvent('force-logout'));
  }

  return response;
};
