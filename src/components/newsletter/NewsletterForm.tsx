
'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Checkbox from '@/components/commercetools-ui/atoms/checkbox';
import Input from '@/components/commercetools-ui/atoms/input';
import Feedback from '@/components/commercetools-ui/organisms/account/account-atoms/feedback';

export default function NewsletterForm() {
    const locale = useLocale();
    const t = useTranslations('newsletter');

    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [consentError, setConsentError] = useState('');


    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch(
                '/api/newsletter/subscribe',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email,
                        locale,
                        consent,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (data.code === 'ALREADY_SUBSCRIBED') {
                    setEmailError(
                        'This email is already subscribed to our newsletter.'
                    );
                    return;
                }

                setEmailError(
                    data.message || 'Unable to subscribe. Please try again.'
                );
                return;
            }

            if (!response.ok) {
                setError(t('subscribeError'));
                return;
            }

            setMessage(t('confirmationSent'));
            setEmail('');
            setConsent(false);
        } catch {
            setError(t('subscribeError'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-[#b1e5de6e] py-12">
            <form
                onSubmit={handleSubmit}
                className="space-y-4 max-w-[800px] mx-auto"
            >
                <h3 className="text-lg font-semibold">
                    {t('subscribeTitle')}
                </h3>

                <p className="text-sm text-gray-600">
                    {t('subscribeDescription')}
                </p>

                <div className="flex justify-between flex-col items-start gap-2 sm:flex-row">
                    <div className="w-full flex-1" aria-live="polite">
                        <Input
                            name="newsletter-email"
                            type="email"
                            label={t('emailLabel')}
                            autoComplete="email"
                            required
                            maxLength={254}
                            value={email}
                            error={emailError}
                            aria-invalid={Boolean(emailError)}
                            onInvalid={(event) => {
                                event.preventDefault();
                                setEmailError(t('invalidEmail'));
                                event.currentTarget.focus();
                            }}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                setEmailError('');
                                setError('');
                                setMessage('');
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-md bg-blue-600 px-6 py-3 text-white disabled:opacity-50"
                    >
                        {loading ? t('subscribing') : t('cta-fallback')}
                    </button>
                </div>
                <Checkbox
                    name="newsletter-consent"
                    label={t('consentLabel')}
                    containerClassName="items-start gap-2"
                    required
                    checked={consent}
                    aria-invalid={Boolean(consentError)}
                    aria-describedby={consentError ? 'newsletter-consent-error' : undefined}
                    onInvalid={(event) => {
                        event.preventDefault();
                        setConsentError(t('consentRequired'));
                        if (event.currentTarget.form?.querySelector(':invalid') === event.currentTarget) {
                            event.currentTarget.focus();
                        }
                    }}
                    onChange={({ checked }) => {
                        setConsent(checked);
                        setConsentError('');
                        setError('');
                    }}
                />

                {consentError && (
                    <div id="newsletter-consent-error" role="alert">
                        <Feedback error={consentError} success="" />
                    </div>
                )}

                {emailError && (
                    <p
                        id="newsletter-email-error"
                        role="alert"
                        className="mt-2 text-sm text-red-600"
                    >
                        {emailError}
                    </p>
                )}

                {(error || message) && (
                    <div role={error ? 'alert' : 'status'}>
                        <Feedback error={error} success={message} />
                    </div>
                )}
            </form>
        </div>
    );
}
