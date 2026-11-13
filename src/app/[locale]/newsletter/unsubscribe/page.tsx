
'use client';

import { useState } from 'react';

export default function UnsubscribePage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    async function handleUnsubscribe() {
        const fragment = window.location.hash.slice(1);
        const params = new URLSearchParams(fragment);
        const token = params.get('token') || '';

        if (!token) {
            setMessage('Invalid unsubscribe link.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(
                '/api/newsletter/unsubscribe',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to unsubscribe.'
                );
            }

            // Remove the token from the browser URL.
            window.history.replaceState(
                null,
                '',
                window.location.pathname +
                window.location.search
            );

            setSuccess(true);
            setMessage(
                'You have unsubscribed successfully.'
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Please try again later.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="mx-auto max-w-md px-4 py-16 text-center">
            <h1 className="text-2xl font-bold">
                Unsubscribe from Newsletter
            </h1>

            <p className="mt-4 text-gray-600">
                Would you like to stop receiving our
                marketing emails?
            </p>

            {message && (
                <p
                    role="status"
                    className={
                        success
                            ? 'mt-6 text-green-600'
                            : 'mt-6 text-red-600'
                    }
                >
                    {message}
                </p>
            )}

            {!success && (
                <button
                    type="button"
                    disabled={loading}
                    onClick={handleUnsubscribe}
                    className="mt-6 rounded bg-blue-600 px-6 py-3 text-white disabled:opacity-50"
                >
                    {loading
                        ? 'Processing...'
                        : 'Unsubscribe'}
                </button>
            )}
        </main>
    );
}
