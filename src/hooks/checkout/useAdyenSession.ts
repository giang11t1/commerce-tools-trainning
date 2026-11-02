'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'use-intl';
import type { AdyenSession } from '@/components/checkout/types';

export function useAdyenSession(enabled: boolean) {
    const locale = useLocale();
    const [adyenSession, setAdyenSession] = useState<AdyenSession | null>(null);
    const [adyenClientKey, setAdyenClientKey] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let cancelled = false;

        async function loadAdyenSession() {
            try {
                const response = await fetch('/api/checkout/adyen-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ locale }),
                });

                if (!response.ok) {
                    throw new Error('Failed to create Adyen session');
                }

                const data = await response.json();

                if (!data.session?.id) {
                    throw new Error('Adyen session id is missing');
                }

                if (!data.session?.sessionData) {
                    throw new Error('Adyen sessionData is missing');
                }

                if (!data.clientKey) {
                    throw new Error('Adyen clientKey is missing');
                }

                if (!cancelled) {
                    setAdyenSession(data.session);
                    setAdyenClientKey(data.clientKey);
                    setError('');
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load Adyen session:', error);
                    setError(
                        error instanceof Error
                            ? error.message
                            : 'Unable to initialize the payment session.',
                    );
                }
            }
        }

        loadAdyenSession();

        return () => {
            cancelled = true;
        };
    }, [enabled, locale]);

    return {
        adyenSession,
        adyenClientKey,
        error,
    };
}
