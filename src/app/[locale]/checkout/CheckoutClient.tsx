'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from '@/../i18n/routing';
import Link from '@/components/commercetools-ui/atoms/link';
import type { Address } from '@commercetools/platform-sdk';
import { ShippingInfo } from '@/components/checkout/ShippingInfo';
import { ShippingSummary } from '@/components/checkout/ShippingSummary';
import { PaymentInfo } from '@/components/checkout/PaymentInfo';
import  OrderSummary  from '@/components/checkout/OrderSummary';
import { EmptyCart } from '@/components/checkout/EmptyCart';
import { useCheckoutForm } from '@/hooks/checkout/useCheckoutForm';
import { usePaymentMethods } from '@/hooks/checkout/usePaymentMethods';
import { useAdyenSession } from '@/hooks/checkout/useAdyenSession';
import { useCheckoutPaymentFlow } from '@/hooks/checkout/useCheckoutPaymentFlow';
import {useCart} from '@/context/CartContext';
import { createMockOrder } from '@/lib/checkout-client';
import { clearStoredCartIds } from '@/lib/cart-lifecycle';
import { useLocale, useTranslations } from 'use-intl';
import type { CheckoutShippingOption } from '@/components/checkout/types';
import { getCommerceMarket } from '@/lib/commerce-market';
import { preserveAvailableShippingMethod } from '@/lib/checkout-utils';
import {
    evaluateBusinessCartApproval,
    selectCheckoutBusinessUnit,
    submitBusinessOrderForApproval,
} from '@/lib/b2b-checkout';

type ApprovalStatus = 'loading' | 'approval-required' | 'no-approval-required' | 'error';

interface CheckoutClientProps {
    shippingAddress?: Address | null;
    billingAddress?: Address | null;
    customerEmail?: string | null;
    businessUnits: { key: string; name: string }[];
    businessUnitError?: string;
}

export default function CheckoutClient({
    shippingAddress,
    billingAddress,
    customerEmail,
    businessUnits,
    businessUnitError,
}: CheckoutClientProps) {
    const { clearCart, replaceCart, marketSyncError, cart } = useCart();
    const locale = useLocale();
    const marketLocale = getCommerceMarket(locale).locale;
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [checkoutAddressError, setCheckoutAddressError] = useState('');
    const [shippingMethods, setShippingMethods] = useState<CheckoutShippingOption[]>([]);
    const [isLoadingShippingMethods, setIsLoadingShippingMethods] = useState(false);
    const [isUpdatingShippingMethod, setIsUpdatingShippingMethod] = useState(false);
    const [hasLoadedShippingMethods, setHasLoadedShippingMethods] = useState(false);
    const [isPlacingMockOrder, setIsPlacingMockOrder] = useState(false);
    const [mockOrderError, setMockOrderError] = useState('');
    const paymentElementRef = useRef<HTMLDivElement | null>(null);
    const mockOrderRequestStarted = useRef(false);
    const loadedAddressKey = useRef('');
    const inFlightAddressKey = useRef('');
    const selectionRequestId = useRef(0);
    const componentMounted = useRef(true);
    const translate = useTranslations('checkout');
    const businessCheckout = Boolean(businessUnits.length || businessUnitError || cart?.businessUnit);
    const [selectedUnitKey, setSelectedUnitKey] = useState('');
    const [businessError, setBusinessError] = useState('');
    const [businessBusy, setBusinessBusy] = useState(false);
    const businessRequestStarted = useRef(false);
    const [approval, setApproval] = useState<{ key: string; status: ApprovalStatus; error?: string } | null>(null);
    const [approvalAttempt, setApprovalAttempt] = useState(0);
    // Business Unit selection alone never decides the payment UI; commercetools Approval Rules do.
    const approvalKey = cart?.businessUnit && currentStep === 2 ? `${cart.id}:${cart.version}` : '';
    const approvalStatus: ApprovalStatus = approval && approval.key === approvalKey ? approval.status : 'loading';
    const paymentBlocked = businessCheckout && (!cart?.businessUnit || approvalStatus !== 'no-approval-required');

    const { formData, setFormData, handleInputChange } =
        useCheckoutForm(shippingAddress, billingAddress, customerEmail);
    const { paymentMethods, isLoadingPayments } =
        usePaymentMethods(setFormData);
    const { adyenSession, adyenClientKey, error: adyenSessionError } = useAdyenSession(
        !paymentBlocked && currentStep === 2 &&
            !!cart &&
            !isLoadingPayments &&
            formData.paymentMethod !== 'credit_card_sample',
    );
    const {
        isSubmitting,
        paymentFlowError,
        paymentCompleted,
        setPaymentCompleted,
        ensurePaymentFlowInitialized,
        prepareCheckoutCart,
        selectShippingMethod,
    } = useCheckoutPaymentFlow({
        formData,
        currentStep,
        hasCart: !!cart,
        cart,
        replaceCart,
        paymentBlocked,
    });

    const lineItems = cart?.lineItems ?? [];
    const shippingAddressKey = JSON.stringify([
        formData.firstName,
        formData.lastName,
        formData.address || formData.streetName,
        formData.streetNumber,
        formData.additionalStreetInfo,
        formData.city,
        formData.postalCode,
        formData.state,
        formData.region,
        formData.country,
    ]);
    const selectedShippingMethod = shippingMethods.find(
        (method) => method.id === formData.shippingMethod,
    );
    const canContinue =
        !!cart &&
        !!selectedShippingMethod &&
        cart.shippingInfo?.shippingMethod?.id === selectedShippingMethod.id &&
        cart.shippingInfo?.shippingMethodState === 'MatchesCart';
    const activeCartId = cart?.id;

    const loadShippingMethods = useCallback(async () => {
        if (!cart) return;
        const requestKey = `${cart.id}:${shippingAddressKey}`;
        if (inFlightAddressKey.current === requestKey) return;

        inFlightAddressKey.current = requestKey;
        setIsLoadingShippingMethods(true);
        setCheckoutAddressError('');
        try {
            const result = await prepareCheckoutCart(formData);
            if (!componentMounted.current || inFlightAddressKey.current !== requestKey) return;

            setShippingMethods(result.shippingMethods);
            setHasLoadedShippingMethods(true);
            loadedAddressKey.current = requestKey;
            const existingMethodId =
                result.cart.shippingInfo?.shippingMethodState === 'MatchesCart'
                    ? result.cart.shippingInfo.shippingMethod?.id
                    : undefined;
            const selectedMethodId = preserveAvailableShippingMethod(
                result.shippingMethods.map((method) => method.id),
                existingMethodId,
            );
            setFormData((previous) => ({
                ...previous,
                shippingMethod: selectedMethodId,
            }));
            if (result.shippingMethods.length === 0) {
                setCheckoutAddressError(translate('shippingMethodsUnavailable'));
            }
        } catch (error) {
            if (!componentMounted.current || inFlightAddressKey.current !== requestKey) return;
            console.error('Failed to load checkout shipping methods:', error);
            loadedAddressKey.current = '';
            setHasLoadedShippingMethods(false);
            setCheckoutAddressError(
                error instanceof Error
                    ? error.message
                    : translate('shippingMethodsUnavailable'),
            );
        } finally {
            if (componentMounted.current && inFlightAddressKey.current === requestKey) {
                inFlightAddressKey.current = '';
                setIsLoadingShippingMethods(false);
            }
        }
    }, [cart, formData, prepareCheckoutCart, setFormData, shippingAddressKey, translate]);

    useEffect(() => {
        componentMounted.current = true;
        return () => {
            componentMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (
            !shippingAddress ||
            !activeCartId ||
            loadedAddressKey.current === `${activeCartId}:${shippingAddressKey}` ||
            inFlightAddressKey.current === `${activeCartId}:${shippingAddressKey}`
        ) {
            return;
        }

        void loadShippingMethods();
    }, [
        activeCartId,
        loadShippingMethods,
        shippingAddress,
        shippingAddressKey,
    ]);

    useEffect(() => {
        if (!approvalKey || !activeCartId) return;
        let cancelled = false;
        evaluateBusinessCartApproval(activeCartId)
            .catch(() => ({ success: false as const, error: translate('approvalCheckFailed') }))
            .then((result) => {
                if (cancelled) return;
                if (!result.success) {
                    setApproval({ key: approvalKey, status: 'error', error: result.error });
                    return;
                }
                const evaluatedKey = `${result.cart.id}:${result.cart.version}`;
                if (evaluatedKey !== approvalKey) replaceCart(result.cart);
                setApproval({ key: evaluatedKey, status: result.status });
            });
        return () => {
            cancelled = true;
        };
    }, [activeCartId, approvalAttempt, approvalKey, replaceCart, translate]);

    useEffect(() => {
        if (!cart && !paymentCompleted) router.replace('/cart');
    }, [cart, paymentCompleted, router]);

    const handleCheckoutInputChange = async (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const fieldName = event.target.name;
        const value = event.target.value;
        handleInputChange(event);
        setCheckoutAddressError('');
        if (fieldName === 'shippingMethod') {
            if (!shippingMethods.some((method) => method.id === value)) {
                setCheckoutAddressError(translate('selectShippingMethod'));
                return;
            }

            const requestId = selectionRequestId.current + 1;
            selectionRequestId.current = requestId;
            setIsUpdatingShippingMethod(true);
            try {
                const updatedCart = await selectShippingMethod(value);
                if (selectionRequestId.current === requestId) {
                    setFormData((previous) => ({
                        ...previous,
                        shippingMethod: updatedCart.shippingInfo?.shippingMethod?.id ?? '',
                    }));
                }
            } catch (error) {
                if (selectionRequestId.current === requestId) {
                    setFormData((previous) => ({
                        ...previous,
                        shippingMethod:
                            cart?.shippingInfo?.shippingMethod?.id ?? '',
                    }));
                    setCheckoutAddressError(
                        error instanceof Error
                            ? error.message
                            : translate('shippingMethodsUnavailable'),
                    );
                }
            } finally {
                if (selectionRequestId.current === requestId) {
                    setIsUpdatingShippingMethod(false);
                }
            }
            return;
        }

        if (
            ['firstName', 'lastName', 'address', 'streetName', 'streetNumber',
                'additionalStreetInfo', 'city', 'postalCode', 'state', 'region',
                'country'].includes(fieldName)
        ) {
            setShippingMethods([]);
            setHasLoadedShippingMethods(false);
            loadedAddressKey.current = '';
            inFlightAddressKey.current = '';
            setIsLoadingShippingMethods(false);
            selectionRequestId.current += 1;
            setFormData((previous) => ({ ...previous, shippingMethod: '' }));
        }
    };

    if (marketSyncError) {
        return (
            <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
                {translate('marketSyncError')}
            </p>
        );
    }

    if (paymentCompleted) {
        return (
            <p className="mx-auto max-w-3xl py-16 text-center text-gray-700" role="status">
                {translate('orderProcessing')}
            </p>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (businessCheckout && (!cart?.businessUnit || businessUnitError)) {
            setBusinessError(translate('businessUnitRequired'));
            return;
        }

        if (currentStep === 1) {
            setCheckoutAddressError('');
            if (
                !hasLoadedShippingMethods ||
                loadedAddressKey.current !== `${cart?.id}:${shippingAddressKey}`
            ) {
                await loadShippingMethods();
                return;
            }

            if (!formData.shippingMethod) {
                setCheckoutAddressError(translate('selectShippingMethod'));
                return;
            }

            if (
                cart?.shippingInfo?.shippingMethod?.id !== formData.shippingMethod ||
                cart.shippingInfo.shippingMethodState !== 'MatchesCart'
            ) {
                setCheckoutAddressError(translate('selectShippingMethod'));
                return;
            }

            setCurrentStep(2);
            return;
        }

        if (paymentBlocked) {
            if (!cart || approvalStatus !== 'approval-required' || businessRequestStarted.current) return;
            businessRequestStarted.current = true;
            setBusinessBusy(true);
            setBusinessError('');
            try {
                const result = await submitBusinessOrderForApproval(cart.id, cart.version);
                if (!result.success) throw new Error(result.error);
                setPaymentCompleted(true);
                clearCart();
                for (const error of clearStoredCartIds([
                    () => window.localStorage,
                    () => window.sessionStorage,
                ])) {
                    console.error('Failed to clear a stored cart identifier:', error);
                }
                router.replace(`/confirmation/${encodeURIComponent(result.orderId)}`);
            } catch (error) {
                setBusinessError(error instanceof Error ? error.message : translate('businessSubmitError'));
                businessRequestStarted.current = false;
                setBusinessBusy(false);
            }
        } else if (formData.paymentMethod !== 'credit_card_sample') {
            await ensurePaymentFlowInitialized();
        }
    };

    const handleMockOrder = async () => {
        if (paymentBlocked || mockOrderRequestStarted.current) return;

        mockOrderRequestStarted.current = true;
        setIsPlacingMockOrder(true);
        setMockOrderError('');
        try {
            const result = await createMockOrder({
                email: formData.email,
                shippingMethod: formData.shippingMethod,
                shippingAddress: {
                    firstName: formData.firstName || shippingAddress?.firstName,
                    lastName: formData.lastName || shippingAddress?.lastName,
                    company: formData.company || shippingAddress?.company,
                    streetName:
                        formData.address ||
                        formData.streetName ||
                        shippingAddress?.streetName,
                    streetNumber:
                        formData.streetNumber || shippingAddress?.streetNumber,
                    additionalStreetInfo:
                        formData.additionalStreetInfo ||
                        shippingAddress?.additionalStreetInfo,
                    city: formData.city || shippingAddress?.city,
                    postalCode: formData.postalCode || shippingAddress?.postalCode,
                    state: formData.state || shippingAddress?.state,
                    region: formData.region || shippingAddress?.region,
                    country: formData.country || shippingAddress?.country,
                    phone: formData.phone || shippingAddress?.phone,
                },
                billingAddress: {
                    firstName:
                        formData.billingAddress.firstName || billingAddress?.firstName,
                    lastName:
                        formData.billingAddress.lastName || billingAddress?.lastName,
                    company:
                        formData.billingAddress.company || billingAddress?.company,
                    streetName:
                        formData.billingAddress.streetName || billingAddress?.streetName,
                    streetNumber:
                        formData.billingAddress.streetNumber || billingAddress?.streetNumber,
                    additionalStreetInfo:
                        formData.billingAddress.additionalStreetInfo ||
                        billingAddress?.additionalStreetInfo,
                    city: formData.billingAddress.city || billingAddress?.city,
                    postalCode:
                        formData.billingAddress.postalCode || billingAddress?.postalCode,
                    state: formData.billingAddress.state || billingAddress?.state,
                    region: formData.billingAddress.region || billingAddress?.region,
                    country:
                        formData.billingAddress.country || billingAddress?.country,
                    phone: formData.billingAddress.phone || billingAddress?.phone,
                },
            });
            setPaymentCompleted(true);
            clearCart();
            const storageErrors = clearStoredCartIds([
                () => window.localStorage,
                () => window.sessionStorage,
            ]);
            for (const error of storageErrors) {
                console.error('Failed to clear a stored cart identifier:', error);
            }
            router.replace(
                `/confirmation/${encodeURIComponent(result.orderId)}`,
            );
        } catch (error) {
            setMockOrderError(
                error instanceof Error
                    ? error.message
                    : 'We could not place the order. Please try again.',
            );
            mockOrderRequestStarted.current = false;
            setIsPlacingMockOrder(false);
        }
    };


    if (!cart) {
        return (
            <div className="mx-auto max-w-4xl py-16 px-4 text-center">
                <p className="mb-6 text-red-700" role="alert">
                    {translate('cartUnavailable')}
                </p>
                <Link link="/cart" className="text-blue-600 hover:underline">
                    {translate('returnToCart')}
                </Link>
            </div>
        );
    }

    if (lineItems.length === 0) {
        return <EmptyCart />;
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center mb-8 relative">
                {currentStep === 1 && (
                    <Link
                        link="/cart"
                        className="py-2 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all text-center absolute left-0 -top-11 lg:top-0"
                    >
                        Back to Cart
                    </Link>
                )}
                <h1 className="text-[40px] font-bold lg:mb-8 text-[#4a0f0a] text-center uppercase tracking-widest">
                    Checkout
                </h1>
            </div>

            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 gap-12"
            >
                <div className="space-y-10 lg:col-span-2">
                    {businessCheckout && (
                        <section className="space-y-3 rounded-lg border border-line bg-surface p-5">
                            <h2 className="text-xl font-semibold text-ink">{translate('businessUnit')}</h2>
                            <p className="text-sm text-ink-muted">{translate('businessApprovalNotice')}</p>
                            <label className="block text-sm">
                                {translate('businessUnit')}
                                <select
                                    value={selectedUnitKey || cart.businessUnit?.key || ''}
                                    disabled={businessBusy || currentStep !== 1}
                                    onChange={(event) => setSelectedUnitKey(event.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                >
                                    <option value="">{translate('businessUnitRequired')}</option>
                                    {businessUnits.map((unit) => <option key={unit.key} value={unit.key}>{unit.name}</option>)}
                                </select>
                            </label>
                            <button
                                type="button"
                                disabled={businessBusy || currentStep !== 1 || !(selectedUnitKey || cart.businessUnit?.key)}
                                onClick={async () => {
                                    if (businessRequestStarted.current) return;
                                    businessRequestStarted.current = true;
                                    setBusinessBusy(true);
                                    setBusinessError('');
                                    try {
                                        const result = await selectCheckoutBusinessUnit(selectedUnitKey || cart.businessUnit?.key || '');
                                        if (!result.success) throw new Error(result.error);
                                        replaceCart(result.cart);
                                        loadedAddressKey.current = '';
                                        setHasLoadedShippingMethods(false);
                                        router.refresh();
                                    } catch (error) {
                                        setBusinessError(error instanceof Error ? error.message : translate('businessSubmitError'));
                                    } finally {
                                        businessRequestStarted.current = false;
                                        setBusinessBusy(false);
                                    }
                                }}
                                className="rounded-md bg-brand px-4 py-2 text-brand-contrast disabled:opacity-50"
                            >
                                {translate(businessBusy ? 'businessSaving' : 'businessUseUnit')}
                            </button>
                            {(businessUnitError || businessError) && (
                                <p role="alert" className="text-sm text-danger">{businessUnitError || businessError}</p>
                            )}
                        </section>
                    )}
                    {checkoutAddressError && (
                        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
                            {checkoutAddressError}
                        </p>
                    )}
                    {paymentFlowError && currentStep === 2 && (
                        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
                            {paymentFlowError}
                        </p>
                    )}
                    {adyenSessionError && currentStep === 2 && (
                        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
                            {adyenSessionError}
                        </p>
                    )}
                    {currentStep === 1 ? (
                        <ShippingInfo
                            formData={formData}
                            handleInputChange={handleCheckoutInputChange}
                            isLoadingShippingMethods={isLoadingShippingMethods}
                            isUpdatingShippingMethod={isUpdatingShippingMethod}
                            shippingMethods={shippingMethods}
                            hasLoadedShippingMethods={hasLoadedShippingMethods}
                            hasShippingError={Boolean(checkoutAddressError)}
                            canContinue={canContinue}
                            onRetryShippingMethods={() => void loadShippingMethods()}
                            customerEmail={customerEmail}
                            shippingAddress={shippingAddress}
                            billingAddress={billingAddress}
                        />
                    ) : (
                        <>
                            <ShippingSummary
                                formData={formData}
                                setCurrentStep={setCurrentStep}
                                shippingMethodName={
                                    selectedShippingMethod?.localizedName?.[marketLocale] ??
                                    selectedShippingMethod?.name ??
                                    formData.shippingMethod
                                }
                            />

                            {currentStep === 2 && !paymentBlocked && (
                                <div
                                    ref={paymentElementRef}
                                    data-ctc
                                    className="mt-6"
                                />
                            )}

                            {paymentBlocked ? (
                                <section className="space-y-4" aria-live="polite">
                                    {!cart.businessUnit ? (
                                        <p role="alert" className="text-danger">{translate('businessUnitRequired')}</p>
                                    ) : approvalStatus === 'loading' ? (
                                        <p role="status" className="text-ink-muted">{translate('approvalChecking')}</p>
                                    ) : approvalStatus === 'error' ? (
                                        <div role="alert" className="space-y-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                                            <p>{translate('approvalCheckFailed')}</p>
                                            {approval?.error && <p className="text-sm">{approval.error}</p>}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setApproval(null);
                                                    setApprovalAttempt((attempt) => attempt + 1);
                                                }}
                                                className="rounded-md border border-red-300 bg-white px-3 py-1 text-sm"
                                            >
                                                {translate('approvalRetry')}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-ink-muted">{translate('approvalRequired')}</p>
                                    )}
                                    <div className="flex gap-3">
                                        <button type="button" disabled={businessBusy} onClick={() => setCurrentStep(1)} className="rounded-md border border-line px-4 py-2">
                                            {translate('businessBack')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={businessBusy || Boolean(businessUnitError) || approvalStatus !== 'approval-required'}
                                            className="rounded-md bg-brand px-4 py-2 text-brand-contrast disabled:opacity-50"
                                        >
                                            {translate(businessBusy ? 'businessSaving' : approvalStatus === 'approval-required' ? 'submitForApproval' : 'placeOrder')}
                                        </button>
                                    </div>
                                </section>
                            ) : <PaymentInfo
                                isLoadingPayments={isLoadingPayments}
                                paymentMethods={paymentMethods}
                                formData={formData}
                                setFormData={setFormData}
                                adyenSession={adyenSession}
                                adyenClientKey={adyenClientKey}
                                onPaymentSubmit={ensurePaymentFlowInitialized}
                                onMockOrderSubmit={handleMockOrder}
                                mockOrderError={mockOrderError}
                                currentStep={currentStep}
                                setCurrentStep={setCurrentStep}
                                isSubmitting={isSubmitting || isPlacingMockOrder}
                            />}
                        </>
                    )}
                </div>

                <OrderSummary />
            </form>
        </div>
    );
}
