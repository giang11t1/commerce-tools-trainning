'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/commercetools-ui/atoms/button';
import Input from '@/components/commercetools-ui/atoms/input';
import Link from '@/components/commercetools-ui/atoms/link';

export default function ResetPasswordPage() {
    const t = useTranslations('passwordRecovery');
    const initialized = useRef(false);
    const [credentials, setCredentials] = useState<{ token: string; store?: string } | null>(null);
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const token = fragment.get('token');
        const store = fragment.get('store');
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
        queueMicrotask(() => {
            if (token) setCredentials({ token, ...(store ? { store } : {}) });
            setReady(true);
        });
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const password = data.get('password');
        if (password !== data.get('confirmPassword')) {
            setError(t('passwordMismatch'));
            return;
        }
        if (!credentials) return;
        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...credentials, password }),
            });
            if (!response.ok) {
                setError(response.status === 400 ? t('invalidReset') : t('unavailable'));
            } else {
                setCredentials(null);
                setDone(true);
            }
        } catch {
            setError(t('unavailable'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 rounded-xl border border-gray-100 bg-white p-8 shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('resetTitle')}</h1>
                    {done && <p className="mt-2 text-sm text-gray-600" role="status">{t('resetDone')}</p>}
                </div>
                {ready && !done && !credentials && (
                    <p className="text-sm text-red-700" role="alert">{t('invalidLink')}</p>
                )}
                {credentials && !done && (
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && <p role="alert" className="rounded border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}
                        <Input name="password" type="password" label={t('newPassword')} autoComplete="new-password" minLength={8} maxLength={256} required />
                        <Input name="confirmPassword" type="password" label={t('confirmPassword')} autoComplete="new-password" minLength={8} maxLength={256} required />
                        <p className="text-sm text-gray-600">{t('passwordHint')}</p>
                        <Button type="submit" size="full" loading={loading}>
                            {loading ? t('saving') : t('savePassword')}
                        </Button>
                    </form>
                )}
                <div className="text-center text-sm">
                    <Link link={done ? '/login' : '/forgot-password'} className="font-medium text-blue-600 hover:text-blue-700">
                        {done ? t('backToLogin') : t('requestAnother')}
                    </Link>
                </div>
            </div>
        </main>
    );
}
