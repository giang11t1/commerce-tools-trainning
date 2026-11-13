'use client';

import { FormEvent, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Button from '@/components/commercetools-ui/atoms/button';
import Input from '@/components/commercetools-ui/atoms/input';
import Link from '@/components/commercetools-ui/atoms/link';

export default function ForgotPasswordPage() {
    const t = useTranslations('passwordRecovery');
    const locale = useLocale();
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const email = new FormData(event.currentTarget).get('email');
        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, locale }),
            });
            if (!response.ok) {
                setError(response.status === 400 ? t('invalidEmail') : t('unavailable'));
            } else {
                setSent(true);
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
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('requestTitle')}</h1>
                    <p className="mt-2 text-sm text-gray-600" role={sent ? 'status' : undefined}>
                        {sent ? t('sent') : t('requestDescription')}
                    </p>
                </div>
                {!sent && (
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && <p role="alert" className="rounded border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}
                        <Input name="email" type="email" label={t('email')} autoComplete="email" maxLength={254} required />
                        <Button type="submit" size="full" loading={loading}>
                            {loading ? t('sending') : t('sendLink')}
                        </Button>
                    </form>
                )}
                <div className="text-center text-sm">
                    <Link link="/login" className="font-medium text-blue-600 hover:text-blue-700">{t('backToLogin')}</Link>
                </div>
            </div>
        </main>
    );
}
