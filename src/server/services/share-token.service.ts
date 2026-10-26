import crypto from 'crypto';

/**
 * Share Token Service - Generates cryptographically secure read-only share links
 * 
 * Security Requirements:
 * - Tokens must be crypto-random with >= 128 bits of entropy
 * - Share links are read-only (no mutations allowed)
 * - Tokens can expire or be revoked
 * - Never expose internal event IDs in the token
 */

export interface ShareToken {
  token: string; // Cryptographically random, URL-safe
  eventId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null; // null = never expires
  isRevoked: boolean;
}

// In-memory token store (in production, use database)
const tokenStore = new Map<string, ShareToken>();

/**
 * Generate a cryptographically secure random token
 * Uses 256 bits (32 bytes) of entropy, URL-safe base64 encoded
 */
function generateSecureToken(): string {
  // Generate 32 bytes (256 bits) of crypto-random data
  // This exceeds the 128-bit minimum requirement
  const buffer = crypto.randomBytes(32);
  
  // Convert to URL-safe base64 (replace +/= with -_~)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '~');
}

/**
 * Create a new share token for an event
 * 
 * @param eventId - The event to share
 * @param createdBy - User ID who created the share link
 * @param expiresInDays - Optional expiration in days (null = never expires)
 * @returns ShareToken object with secure token
 */
export function createShareToken(
  eventId: string,
  createdBy: string,
  expiresInDays: number | null = null
): ShareToken {
  const token = generateSecureToken();
  
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const shareToken: ShareToken = {
    token,
    eventId,
    createdBy,
    createdAt: new Date(),
    expiresAt,
    isRevoked: false,
  };

  tokenStore.set(token, shareToken);
  return shareToken;
}

/**
 * Validate a share token and return the associated event ID
 * 
 * @param token - The share token to validate
 * @returns Event ID if valid, null if invalid/expired/revoked
 */
export function validateShareToken(token: string): string | null {
  const shareToken = tokenStore.get(token);
  
  if (!shareToken) {
    return null; // Token not found
  }

  if (shareToken.isRevoked) {
    return null; // Token has been revoked
  }

  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    return null; // Token has expired
  }

  return shareToken.eventId;
}

/**
 * Revoke a share token (make it invalid)
 * 
 * @param token - The token to revoke
 * @returns true if revoked, false if token not found
 */
export function revokeShareToken(token: string): boolean {
  const shareToken = tokenStore.get(token);
  
  if (!shareToken) {
    return false;
  }

  shareToken.isRevoked = true;
  return true;
}

/**
 * List all active share tokens for an event
 * 
 * @param eventId - The event ID
 * @returns Array of active (non-revoked, non-expired) share tokens
 */
export function listShareTokensForEvent(eventId: string): ShareToken[] {
  const tokens: ShareToken[] = [];
  const now = new Date();

  for (const shareToken of tokenStore.values()) {
    if (
      shareToken.eventId === eventId &&
      !shareToken.isRevoked &&
      (!shareToken.expiresAt || shareToken.expiresAt > now)
    ) {
      tokens.push(shareToken);
    }
  }

  return tokens;
}

/**
 * Middleware helper to extract token from request
 * Supports both query param (?token=xxx) and Authorization header
 */
export function extractTokenFromRequest(req: { 
  query: { token?: string }; 
  headers: { authorization?: string } 
}): string | null {
  // Check query parameter first
  if (req.query.token) {
    return req.query.token;
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
