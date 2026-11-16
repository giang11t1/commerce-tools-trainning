import { getSession } from '@/lib/auth';
import { getCustomerById } from '@/lib/customer';
import CheckoutClient from './CheckoutClient';
import { getBusinessCheckoutOptions } from '@/lib/b2b-checkout';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/../i18n/routing';
import Link from '@/components/commercetools-ui/atoms/link';
import { getOrderPaymentDetails, mockOrderPaymentEnabled } from '@/lib/order-mock-payment';
import { OrderPaymentError } from '@/lib/order-mock-payment-core';
import ApprovedOrderPayment from './ApprovedOrderPayment';

type CheckoutPageProps = {
    searchParams: Promise<{ step?: string | string[]; orderId?: string | string[] }>;
};

async function ApprovedOrderCheckout({ orderId }: { orderId: string }) {
    const t = await getTranslations('orderMockPayment');
    let code = 'disabled';
    let details: Awaited<ReturnType<typeof getOrderPaymentDetails>> | undefined;
    if (mockOrderPaymentEnabled()) {
        try {
            // Approval, ownership, Business Unit and payment state are all re-read from commercetools here.
            details = await getOrderPaymentDetails(orderId);
            code = details.eligibility;
        } catch (error) {
            const status = (error as { statusCode?: number })?.statusCode;
            code = error instanceof OrderPaymentError ? error.code : status === 404 ? 'notFound' : 'upstream';
            console.error('Approved order checkout lookup failed:', code);
        }
    }
    if (details?.eligibility === 'paid') {
        redirect({ href: `/confirmation/${encodeURIComponent(orderId)}`, locale: await getLocale() });
    }
    if (details?.eligibility === 'eligible') {
        return <ApprovedOrderPayment order={details.order} />;
    }

    return (
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-16 text-center">
            <p role="alert" className="text-danger">{t.has(code) ? t(code) : t('upstream')}</p>
            {code === 'unauthorized' ? (
                <Link link="/login" className="text-brand underline">{t('signIn')}</Link>
            ) : (
                <Link link={`/account/orders/${encodeURIComponent(orderId)}`} className="text-brand underline">{t('back')}</Link>
            )}
        </main>
    );
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
    const { orderId } = await searchParams;
    // orderId is navigation context only; ApprovedOrderCheckout validates it server-side.
    if (orderId !== undefined) {
        return <ApprovedOrderCheckout orderId={typeof orderId === 'string' ? orderId : ''} />;
    }

    const customerId = await getSession();
    const customer = customerId ? await getCustomerById(customerId) : null;
    const shippingAddress = customer?.addresses.find(
        (address) => address.id === customer.defaultShippingAddressId,
    ) ?? null;
    const billingAddress = customer?.addresses.find(
        (address) => address.id === customer.defaultBillingAddressId,
    ) ?? null;
    let businessUnits: { key: string; name: string }[] = [];
    let businessUnitError: string | undefined;
    try {
        businessUnits = await getBusinessCheckoutOptions();
    } catch (error) {
        businessUnitError = error instanceof Error ? error.message : 'Business Unit lookup failed.';
    }

    return (
        <CheckoutClient
            shippingAddress={shippingAddress}
            billingAddress={billingAddress}
            customerEmail={customer?.email ?? null}
            businessUnits={businessUnits}
            businessUnitError={businessUnitError}
        />
    );
}
