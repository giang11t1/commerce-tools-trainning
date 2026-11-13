'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'use-intl';

type RecurringOrderAction = 'pause' | 'resume' | 'cancel' | 'skip';

export default function RecurringOrderActions({
    recurringOrderId,
    state,
    hasPendingSkip,
}: {
    recurringOrderId: string;
    state: string;
    hasPendingSkip: boolean;
}) {
    const translate = useTranslations('subscriptions');
    const router = useRouter();
    const [activeAction, setActiveAction] = useState<RecurringOrderAction | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const runAction = async (action: RecurringOrderAction) => {
        if (activeAction) return;
        if (action === 'cancel' && !window.confirm(translate('cancelConfirm'))) return;
        if (action === 'skip' && !window.confirm(translate('skipConfirm'))) return;

        setActiveAction(action);
        setError('');
        setSuccess('');
        try {
            const response = await fetch(
                `/api/recurring-orders/${encodeURIComponent(recurringOrderId)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action }),
                    cache: 'no-store',
                },
            );
            const result = await response.json();
            if (!response.ok) {
                if (result.code === 'skip-pending') {
                    throw new Error(translate('skipPending'));
                }
                if (result.code === 'invalid-state' || response.status === 409) {
                    throw new Error(translate('concurrentError'));
                }
                if (result.code === 'not-found') {
                    throw new Error(translate('notFound'));
                }
                throw new Error(result.error || translate('actionError'));
            }

            setSuccess(translate(`${action}Success`));
            router.refresh();
        } catch (actionError) {
            setError(
                actionError instanceof Error
                    ? actionError.message
                    : translate('actionError'),
            );
        } finally {
            setActiveAction(null);
        }
    };

    const buttons: RecurringOrderAction[] =
        state === 'Active'
            ? ['pause', 'skip', 'cancel']
            : state === 'Paused'
              ? ['resume', 'cancel']
              : [];

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
                {buttons.map((action) => {
                    if (action === 'skip' && hasPendingSkip) return null;
                    return (
                        <button
                            key={action}
                            type="button"
                            onClick={() => void runAction(action)}
                            disabled={activeAction !== null}
                            className={`rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                                action === 'cancel'
                                    ? 'border border-red-200 text-red-700 hover:bg-red-50'
                                    : 'bg-blue-700 text-white hover:bg-blue-800'
                            }`}
                        >
                            {activeAction === action
                                ? translate('processing')
                                : translate(action)}
                        </button>
                    );
                })}
                {state === 'Active' && hasPendingSkip && (
                    <span className="self-center text-sm text-gray-600">
                        {translate('skipPending')}
                    </span>
                )}
            </div>
            {error && (
                <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                    {error}
                </p>
            )}
            {success && (
                <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                    {success}
                </p>
            )}
        </div>
    );
}
