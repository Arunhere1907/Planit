/**
 * Standard fetch wrapper sending demo-user header and parsing errors
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const activeUserId = localStorage.getItem('planit_demo_user') || 'user_owner_1';

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('x-demo-user-id', activeUserId);

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.error?.message || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMessage);
  }

  return data.data !== undefined ? data.data : data;
}
