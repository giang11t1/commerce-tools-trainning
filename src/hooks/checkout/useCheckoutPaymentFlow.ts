'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from '@/../i18n/routing';
import { useLocale, useTranslations } from 'use-intl';
import {
    paymentFlow,
    close,
    type Message,
} from '@commercetools/checkout-browser-sdk';
import type { Cart } from '@commercetools/platform-sdk';
import {
    setCheckoutShippingMethod,
    updateCartWithShippingAddress,
} from '@/lib/checkout';
import { createCheckoutSessionForCart } from '@/lib/checkout-client';
import type {
    CheckoutFormData,
    CheckoutShippingOption,
    CheckoutSessionState,
} from '@/components/checkout/types';
import { getCommerceMarket } from '@/lib/commerce-market';

type UseCheckoutPaymentFlowOptions = {
    formData: CheckoutFormData;
    currentStep: number;
    hasCart: boolean;
    cart: Cart | null;
    replaceCart: (cart: Cart) => void;
};

async function waitForCheckoutHost(): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (document.querySelector('[data-ctc]')) {
            return;
        }

        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
        });
    }

    throw new Error('Checkout payment container not found');
}

function getOrderIdFromPayload(payload: unknown): string | undefined {
    if (typeof payload !== 'object' || payload === null || !('order' in payload)) {
        return undefined;
    }

    const order = payload.order;
    if (typeof order !== 'object' || order === null || !('id' in order)) {
        return undefined;
    }

    return typeof order.id === 'string' ? order.id : undefined;
}

export function useCheckoutPaymentFlow({
    formData,
    currentStep,
    hasCart,
    cart,
    replaceCart,
}: UseCheckoutPaymentFlowOptions) {
    const router = useRouter();
    const locale = useLocale();
    const translate = useTranslations('checkout');
    const checkoutLocale = getCommerceMarket(locale).locale;
    const paymentFlowInitialized = useRef(false);
    const preparedCartId = useRef<string | null>(null);
    const completionHandled = useRef(false);
    const paymentFailed = useRef(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentFlowError, setPaymentFlowError] = useState('');
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [checkoutSession, setCheckoutSession] =
        useState<CheckoutSessionState | null>(null);

    useEffect(() => {
        return () => {
            close();
        };
    }, []);

    const prepareCheckoutCart = useCallback(async (
        checkoutFormData: CheckoutFormData,
    ): Promise<{ cart: Cart; shippingMethods: CheckoutShippingOption[] }> => {
        if (!hasCart) {
            throw new Error('An active cart is required to continue checkout.');
        }

        const prepared = await updateCartWithShippingAddress(checkoutFormData);
        replaceCart(prepared.cart);
        preparedCartId.current = prepared.cart.id;
        return prepared;
    }, [hasCart, replaceCart]);

    const selectShippingMethod = useCallback(async (shippingMethodId: string) => {
        const updatedCart = await setCheckoutShippingMethod(shippingMethodId);
        replaceCart(updatedCart);
        preparedCartId.current = updatedCart.id;
        return updatedCart;
    }, [replaceCart]);

    const createFreshCheckoutSession = useCallback(async () => {
        close();
        const session = await createCheckoutSessionForCart(checkoutLocale);
        setPaymentFlowError('');

        setCheckoutSession({
            sessionId: session.id,
            projectKey: session.projectKey,
            region: session.region,
        });

        return session;
    }, [checkoutLocale]);

    const completeCheckout = useCallback((payload: unknown) => {
        if (completionHandled.current || paymentFailed.current) return;

        completionHandled.current = true;
        setPaymentCompleted(true);
        setIsSubmitting(true);
        setPaymentFlowError('');

        const orderId = getOrderIdFromPayload(payload);
        const orderQuery = orderId
            ? `?orderId=${encodeURIComponent(orderId)}`
            : '';
        router.replace(`/confirmation/processing${orderQuery}`);
        setIsSubmitting(false);
    }, [router]);

    const handleCheckoutMessage = useCallback(
        (event: Message) => {
            if (event.code === 'checkout_completed') {
                void completeCheckout(event.payload);
                return;
            }

            if (event.code === 'payment_validation_started') {
                if (!completionHandled.current) {
                    paymentFailed.current = false;
                }
                setIsSubmitting(true);
                setPaymentFlowError('');
                return;
            }

            if (event.code === 'payment_failed' || event.code === 'order_creation_error') {
                paymentFailed.current = true;
                setIsSubmitting(false);
                setPaymentFlowError(translate('payment-failed'));
                return;
            }

            if (
                event.code === 'order_verification_timeout' ||
                event.code === 'order_verification_retry_error'
            ) {
                void completeCheckout(undefined);
                return;
            }

            console.log('CHECKOUT EVENT:', event.code, event);
        },
        [completeCheckout, translate]
    );

    const startPaymentFlow = useCallback(
        (session: { id: string; projectKey: string; region: string }) => {
            paymentFlow({
                projectKey: session.projectKey,
                region: session.region,
                sessionId: session.id,
                locale: checkoutLocale,
                logInfo: true,
                logWarn: true,
                logError: true,
                onInfo: handleCheckoutMessage,
                onError: (event: Message) => {
                    console.error('CHECKOUT ERROR:', event);
                    if (
                        event.code === 'order_verification_timeout' ||
                        event.code === 'order_verification_retry_error'
                    ) {
                        void completeCheckout(undefined);
                        return;
                    }
                    if (
                        event.code === 'payment_failed' ||
                        event.code === 'order_creation_error'
                    ) {
                        paymentFailed.current = true;
                    }
                    paymentFlowInitialized.current = false;
                    setPaymentFlowError(translate('payment-failed'));
                    setIsSubmitting(false);
                },
            });
        },
        [checkoutLocale, completeCheckout, handleCheckoutMessage, translate]
    );

    const initializePaymentFlow = useCallback(async () => {
        if (!hasCart) {
            throw new Error('An active cart is required to initialize payment.');
        }

        if (
            !cart ||
            preparedCartId.current !== cart.id ||
            !cart.shippingInfo?.shippingMethod?.id ||
            cart.shippingInfo.shippingMethodState !== 'MatchesCart'
        ) {
            throw new Error('Choose an available shipping method before continuing.');
        }

        const session = await createFreshCheckoutSession();
        await waitForCheckoutHost();
        startPaymentFlow(session);
    }, [cart, createFreshCheckoutSession, hasCart, startPaymentFlow]);

    const ensurePaymentFlowInitialized = useCallback(async () => {
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setPaymentFlowError('');

        try {
            if (!paymentFlowInitialized.current) {
                await initializePaymentFlow();
                paymentFlowInitialized.current = true;
            }
        } catch (error) {
            console.error('Payment submission failed:', error);
            setPaymentFlowError(
                error instanceof Error
                    ? error.message
                    : 'Unable to initialize checkout payment.',
            );
            setIsSubmitting(false);
        }
    }, [initializePaymentFlow, isSubmitting]);

    useEffect(() => {
        if (currentStep !== 2 || !hasCart) {
            paymentFlowInitialized.current = false;
            return;
        }

        if (formData.paymentMethod === 'credit_card_sample') {
            paymentFlowInitialized.current = false;
            close();
            return;
        }

        if (paymentFlowInitialized.current) {
            return;
        }

        let cancelled = false;

        const initPayment = async () => {
            try {
                paymentFlowInitialized.current = true;
                await initializePaymentFlow();
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        'Failed to initialize checkout payment flow:',
                        error
                    );
                    setPaymentFlowError(
                        error instanceof Error
                            ? error.message
                            : 'Unable to initialize checkout payment.',
                    );
                    paymentFlowInitialized.current = false;
                }
            }
        };

        initPayment();

        return () => {
            cancelled = true;
        };
    }, [currentStep, formData.paymentMethod, hasCart, initializePaymentFlow]);

    return {
        checkoutSession,
        isSubmitting,
        paymentFlowError,
        paymentCompleted,
        setPaymentCompleted,
        ensurePaymentFlowInitialized,
        prepareCheckoutCart,
        selectShippingMethod,
    };
}
