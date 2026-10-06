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

    // Without these, a server that never answers leaves the UI stuck at "Subiendo (100%)..."
    xhr.timeout = 120000;
    xhr.ontimeout = () => reject(new Error('Upload timed out waiting for server response'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    xhr.send(options.body);
  });
};

// The hosting layer in front of the API stalls request bodies >= 128 KB, so files go up in smaller pieces.
const UPLOAD_CHUNK_SIZE = 96 * 1024;
const CHUNK_RETRIES = 3;

export interface ChunkedUploadOptions {
  description?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Uploads one file to /work-orders/:id/attachments in chunks, then asks the server to assemble it.
 * `onProgress` receives the percentage (0-100) of this file's bytes already sent.
 */
export const uploadAttachmentInChunks = async (
  workOrderId: string,
  file: File,
  options: ChunkedUploadOptions = {}
): Promise<void> => {
  const uploadId = crypto.randomUUID();
  const base = `/backend/work-orders/${workOrderId}/attachments/chunks/${uploadId}`;
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE));

  for (let index = 0; index < totalChunks; index++) {
    const start = index * UPLOAD_CHUNK_SIZE;
    const slice = file.slice(start, Math.min(start + UPLOAD_CHUNK_SIZE, file.size));
    const body = new Blob([slice], { type: 'application/octet-stream' });

    for (let attempt = 1; ; attempt++) {
      try {
        const response = await authenticatedUpload(`${base}/${index}`, {
          method: 'PUT',
          body,
          onProgress: (pct) => {
            const sent = start + (slice.size * pct) / 100;
            options.onProgress?.(Math.min(99, Math.round((sent / file.size) * 100)));
          }
        });
        if (!response.ok) throw new Error(`Chunk ${index} failed with status ${response.status}`);
        break;
      } catch (err) {
        if (attempt >= CHUNK_RETRIES) throw err;
      }
    }
  }

  const response = await authenticatedFetch(`${base}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      totalChunks,
      description: options.description || ''
    })
  });
  if (!response.ok) throw new Error(`Assembling upload failed with status ${response.status}`);
  options.onProgress?.(100);
};
