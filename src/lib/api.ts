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

  // Only force-logout on 401 (token invalid/expired), NOT on 403 (permission denied).
  // A 403 means the token is valid but the user lacks permission — not a session issue.
  if (response.status === 401) {
    console.warn('[AUTH] Authentication error detected (401). Forcing logout.');
    localStorage.removeItem("authToken");
    localStorage.removeItem("userProfile");
    window.location.href = '/?error=' + encodeURIComponent('Tu cuenta se encuentra desactivada o la sesión ha expirado.');
  }

  return response;
};

export interface UploadOptions {
  method?: string;
  body?: Document | XMLHttpRequestBodyInit | null;
  onProgress?: (progress: number) => void;
}

export const authenticatedUpload = (url: string, options: UploadOptions = {}): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = options.method || 'POST';
    xhr.open(method, url);

    const token = localStorage.getItem('authToken');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && options.onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.(percentComplete);
        }
      });
    }

    xhr.onload = () => {
      const responseBody = xhr.responseText;
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        text: async () => responseBody,
        json: async () => JSON.parse(responseBody),
        blob: async () => new Blob([responseBody]),
      } as Response;

      if (xhr.status === 401) {
        console.warn('[AUTH] Authentication error detected (401). Forcing logout.');
        localStorage.removeItem("authToken");
        localStorage.removeItem("userProfile");
        window.location.href = '/?error=' + encodeURIComponent('Tu cuenta se encuentra desactivada o la sesión ha expirado.');
      }

      resolve(response);
    };

    xhr.onerror = () => {
      reject(new Error('Network request failed'));
    };

    xhr.send(options.body);
  });
};

