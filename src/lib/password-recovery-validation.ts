export function parseRecoveryRequest(body: unknown): { email: string; locale: 'en' | 'de' } | null {
    if (!body || typeof body !== 'object') return null;
    const { email, locale } = body as { email?: unknown; locale?: unknown };
    if (typeof email !== 'string' || email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        (locale !== 'en' && locale !== 'de')) return null;
    return { email: email.trim().toLowerCase(), locale };
}

export function parsePasswordReset(body: unknown) {
    if (!body || typeof body !== 'object') return null;
    const { token, password, store } = body as { token?: unknown; password?: unknown; store?: unknown };
    if (typeof token !== 'string' || !token || token.length > 1024 ||
        typeof password !== 'string' || password.length < 8 || password.length > 256 ||
        (store !== undefined && (typeof store !== 'string' || !store || store.length > 256))) return null;
    return { token, password, store };
}
