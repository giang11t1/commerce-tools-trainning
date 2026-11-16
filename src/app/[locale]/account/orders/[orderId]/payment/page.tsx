import { getLocale } from 'next-intl/server';
import { redirect } from '@/../i18n/routing';

// Legacy URL: approved-order payment now happens in the checkout Payment Step.
export default async function OrderPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params;
    redirect({
        href: `/checkout?step=payment&orderId=${encodeURIComponent(orderId)}`,
        locale: await getLocale(),
    });
}
