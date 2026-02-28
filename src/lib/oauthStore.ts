/**
 * Shared in-memory store for OAuth pending authorization codes.
 * Extracted to a lib module to avoid cross-importing between Next.js route files.
 */

export interface PendingAuth {
    pilotId: string;
    codeChallenge: string;
    challengeMethod: string;
    redirectUri: string;
    createdAt: number;
}

export const pendingCodes = new Map<string, PendingAuth>();

// Cleanup expired codes every 60s (5 min TTL)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [code, entry] of pendingCodes) {
            if (now - entry.createdAt > 5 * 60 * 1000) {
                pendingCodes.delete(code);
            }
        }
    }, 60000);
}
