/**
 * Standard fetch wrapper sending demo-user header and parsing errors
 *
 * SECURITY NOTE:
 * - localStorage only stores user ID (no secrets, tokens, or passwords)
 * - The client-side user ID and role are NOT trusted by the server
 * - Server validates EVERY request against event membership (see requireEventAccess middleware)
 * - Users can only access events they are collaborators on, regardless of localStorage tampering
 * - Changing localStorage values CANNOT escalate privileges or access other users' data
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
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.error?.message || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMessage);
  }

  return data.data !== undefined ? data.data : data;
}
