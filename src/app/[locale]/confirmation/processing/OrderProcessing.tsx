'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { useRouter } from '@/../i18n/routing';
import Link from '@/components/commercetools-ui/atoms/link';
import { useCart } from '@/context/CartContext';
import { resolveCompletedCheckoutOrder } from '@/lib/checkout';

type ResolutionState = 'loading' | 'pending' | 'error' | 'payment_failed';

export default function OrderProcessing({
    candidateOrderId,
}: {
    candidateOrderId?: string;
}) {
    const router = useRouter();
    const { clearCart } = useCart();
    const clearCartRef = useRef(clearCart);
    const translate = useTranslations('checkout');
    const [state, setState] = useState<ResolutionState>('loading');

    useEffect(() => {
        clearCartRef.current = clearCart;
    }, [clearCart]);

    const lookupOrder = useCallback(async (): Promise<ResolutionState | null> => {
        try {
            const resolution = await resolveCompletedCheckoutOrder(candidateOrderId);
            if (resolution.status === 'found') {
                clearCartRef.current();
                router.replace(
                    `/confirmation/${encodeURIComponent(resolution.orderId)}`,
                );
                return null;
            }

            return resolution.status;
        } catch (error) {
            console.error('Unable to resolve the completed checkout order:', error);
            return 'error';
        }
    }, [candidateOrderId, router]);

    useEffect(() => {
        let cancelled = false;
        void lookupOrder().then((result) => {
            if (!cancelled && result) setState(result);
        });

        return () => {
            cancelled = true;
        };
    }, [lookupOrder]);

    const retryOrderLookup = async () => {
        setState('loading');
        const result = await lookupOrder();
        if (result) setState(result);
    };

    return (
        <div className="mx-auto max-w-2xl py-16 px-4 text-center">
            <h1 className="mb-4 text-3xl font-bold text-gray-900">
                {state === 'payment_failed'
                    ? translate('payment-failed')
                    : translate('orderProcessingTitle')}
            </h1>
            <p className="mb-8 text-gray-600" role="status">
                {state === 'payment_failed'
                    ? translate('payment-failed')
                    : state === 'error'
                        ? translate('orderVerificationError')
                        : translate('orderProcessingHelp')}
            </p>
            {state !== 'payment_failed' && (
                <button
                    type="button"
                    onClick={() => void retryOrderLookup()}
                    className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                    disabled={state === 'loading'}
                >
                    {state === 'loading'
                        ? translate('orderProcessing')
                        : translate('retryOrderLookup')}
                </button>
            )}
            {state === 'payment_failed' && (
                <Link
                    link="/"
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
                >
                    {translate('continueShopping')}
                </Link>
            )}
        </div>
    );
}
