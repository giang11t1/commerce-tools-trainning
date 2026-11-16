'use client';

import { useRef, useState } from 'react';
import type { Address, Order } from '@commercetools/platform-sdk';
import { useTranslations } from 'use-intl';
import { useRouter } from '@/../i18n/routing';
import Link from '@/components/commercetools-ui/atoms/link';
import { PaymentInfo } from '@/components/checkout/PaymentInfo';
import OrderSummary from '@/components/checkout/OrderSummary';
import { useCheckoutForm } from '@/hooks/checkout/useCheckoutForm';
import { usePaymentMethods } from '@/hooks/checkout/usePaymentMethods';

// Only the mock method can pay an existing Order; the Checkout SDK/Adyen methods create a new Order from a cart.
const EXISTING_ORDER_METHOD = 'credit_card_sample';

function AddressBlock({ title, address }: { title: string; address?: Address }) {
    if (!address) return null;
    const lines = [
        [address.firstName, address.lastName].filter(Boolean).join(' '),
        address.company,
        [address.streetName, address.streetNumber].filter(Boolean).join(' '),
        address.additionalStreetInfo,
        [address.postalCode, address.city].filter(Boolean).join(' '),
        [address.state ?? address.region, address.country].filter(Boolean).join(', '),
    ].filter(Boolean);
    return (
        <div>
            <h3 className="font-semibold text-gray-700">{title}</h3>
            <address className="not-italic text-gray-600">
                {lines.map((line) => <div key={line}>{line}</div>)}
            </address>
        </div>
    );
}

export default function ApprovedOrderPayment({ order }: { order: Order }) {
    const t = useTranslations('orderMockPayment');
    const router = useRouter();
    const started = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { formData, setFormData } = useCheckoutForm(order.shippingAddress, order.billingAddress, order.customerEmail);
    const { paymentMethods, isLoadingPayments } = usePaymentMethods(setFormData);
    const methods = paymentMethods.filter((method) => method.id === EXISTING_ORDER_METHOD);
    const orderPath = `/account/orders/${encodeURIComponent(order.id)}`;

    async function pay() {
        if (started.current) return;
        started.current = true;
        setIsSubmitting(true);
        setError('');
        try {
            const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/mock-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(t(typeof body.error === 'string' && t.has(body.error) ? body.error : 'upstream'));
            } else if (body.orderId !== order.id || body.paymentState !== 'Paid') {
                setError(t('upstream'));
            } else {
                router.replace(`/confirmation/${encodeURIComponent(order.id)}`);
                return;
            }
        } catch {
            setError(t('upstream'));
        }
        started.current = false;
        setIsSubmitting(false);
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center mb-8 relative">
                <Link
                    link={orderPath}
                    className="py-2 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all text-center absolute left-0 -top-11 lg:top-0"
                >
                    {t('back')}
                </Link>
                <h1 className="text-[40px] font-bold lg:mb-8 text-[#4a0f0a] text-center uppercase tracking-widest">
                    Checkout
                </h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="space-y-10 lg:col-span-2">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-[#4a0f0a] border-b pb-2">
                            {t('order')} {order.orderNumber ?? order.id}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <AddressBlock title={t('shippingAddress')} address={order.shippingAddress} />
                            <AddressBlock title={t('billingAddress')} address={order.billingAddress ?? order.shippingAddress} />
                        </div>
                        <p role="note" className="rounded-md border border-yellow-300 bg-yellow-100 p-4">{t('testNotice')}</p>
                    </section>
                    {!isLoadingPayments && methods.length === 0 ? (
                        <p role="alert" className="text-danger">{t('disabled')}</p>
                    ) : (
                        <PaymentInfo
                            isLoadingPayments={isLoadingPayments}
                            paymentMethods={methods}
                            formData={{ ...formData, paymentMethod: EXISTING_ORDER_METHOD }}
                            setFormData={setFormData}
                            adyenSession={null}
                            adyenClientKey={null}
                            onPaymentSubmit={pay}
                            onMockOrderSubmit={pay}
                            mockOrderError={error}
                            mockPaymentLabels={{
                                description: t('testNotice'),
                                submit: t('simulate'),
                                submitting: t('processing'),
                            }}
                            currentStep={2}
                            setCurrentStep={() => undefined}
                            isSubmitting={isSubmitting}
                            showBackToShipping={false}
                        />
                    )}
                </div>
                <OrderSummary source={order} />
            </div>
        </div>
    );
}
