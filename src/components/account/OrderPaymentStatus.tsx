import { getTranslations } from 'next-intl/server';
import Link from '@/components/commercetools-ui/atoms/link';
import { getOrderPaymentDetails } from '@/lib/order-mock-payment';
import { OrderPaymentError } from '@/lib/order-mock-payment-core';

export default async function OrderPaymentStatus({ orderId }: { orderId: string }) {
    const t = await getTranslations('orderMockPayment');
    let details;
    try {
        details = await getOrderPaymentDetails(orderId);
    } catch (error) {
        console.error('Order payment eligibility lookup failed:', error instanceof OrderPaymentError ? error.code : 'upstream');
        return <p role="alert" className="rounded-md border border-line p-4 text-danger">
            {t(error instanceof OrderPaymentError && t.has(error.code) ? error.code : 'upstream')}
        </p>;
    }
    return (
        <section className="space-y-3 rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">
                    {t('approval')}: {t(`approval${details.approval}`)}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-ink">
                    {t('payment')}: {t(`payment${details.order.paymentState ?? 'Unknown'}`)}
                </span>
            </div>
            <p role="status">{t(details.eligibility)}</p>
            {details.eligibility === 'eligible' && details.enabled && (
                <Link link={`/checkout?step=payment&orderId=${encodeURIComponent(orderId)}`}
                    className="inline-block rounded-md bg-brand px-4 py-2 text-brand-contrast hover:bg-brand-hover">
                    {t('eligible')}
                </Link>
            )}
            {!details.enabled && details.eligibility === 'eligible' && <p>{t('disabled')}</p>}
            {details.eligibility === 'paid' && (
                <Link link={`/confirmation/${encodeURIComponent(orderId)}`} className="text-brand underline">
                    {t('confirmation')}
                </Link>
            )}
        </section>
    );
}
