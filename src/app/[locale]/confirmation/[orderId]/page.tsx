import { notFound } from 'next/navigation';
import Link from '@/components/commercetools-ui/atoms/link';
import PriceDisplay from '@/components/PriceDisplay';
import { getCartShippingPrice, getCartTaxAmount, getSubtotalMoney } from '@/lib/checkout-utils';
import { getOrderById } from '@/lib/checkout';
import { getTranslations } from 'next-intl/server';

interface ConfirmationPageProps {
    params: Promise<{ locale: string; orderId: string }>;
}

export default async function ConfirmationPage({
    params,
}: ConfirmationPageProps) {
    const { locale, orderId } = await params;
    const order = await getOrderById(orderId);
    if (!order) notFound();

    const translate = await getTranslations({
        locale,
        namespace: 'checkout',
    });
    const formatLocale = locale === 'de' ? 'de-DE' : 'en-US';
    const orderDate = new Intl.DateTimeFormat(formatLocale, {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(new Date(order.createdAt));
    const subtotal = getSubtotalMoney(order.lineItems);
    const discount = order.discountOnTotalPrice?.discountedAmount;
    const shipping = getCartShippingPrice(order);
    const tax = getCartTaxAmount({ taxedPrice: order.taxedPrice });

    return (
        <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
            <header className="mb-10 text-center">
                <h1 className="mb-3 text-3xl font-bold text-blue-600">
                    {translate('orderConfirmed')}
                </h1>
                <p className="text-blue-600">{translate('orderSuccess')}</p>
            </header>

            <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <dt className="text-sm text-gray-500">{translate('orderNumber')}</dt>
                        <dd className="font-semibold text-gray-900">
                            {order.orderNumber ?? order.id}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm text-gray-500">{translate('orderDate')}</dt>
                        <dd className="font-semibold text-gray-900">{orderDate}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-gray-500">{translate('paymentStatus')}</dt>
                        <dd className="font-semibold text-gray-900">
                            {order.paymentState ?? translate('paymentStatusUnknown')}
                        </dd>
                    </div>
                </dl>
            </section>

            <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                    {translate('orderedProducts')}
                </h2>
                <div className="divide-y divide-gray-100">
                    {order.lineItems.map((item) => {
                        const name =
                            item.name[formatLocale] ??
                            item.name[locale] ??
                            Object.values(item.name)[0] ??
                            item.productId;

                        return (
                            <div
                                key={item.id}
                                className="flex items-start justify-between gap-6 py-4"
                            >
                                <div>
                                    <h3 className="font-medium text-gray-900">{name}</h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {translate('quantity')}: {item.quantity} ×{' '}
                                        <PriceDisplay money={item.price.value} locale={formatLocale} />
                                    </p>
                                </div>
                                <PriceDisplay
                                    money={item.totalPrice}
                                    locale={formatLocale}
                                    className="shrink-0 font-medium text-gray-900"
                                />
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                    {translate('orderSummary')}
                </h2>
                <dl className="space-y-3">
                    {subtotal && (
                        <div className="flex justify-between gap-6">
                            <dt>{translate('subtotal')}</dt>
                            <dd><PriceDisplay money={subtotal} locale={formatLocale} /></dd>
                        </div>
                    )}
                    {discount && (
                        <div className="flex justify-between gap-6">
                            <dt>{translate('discount')}</dt>
                            <dd>-<PriceDisplay money={discount} locale={formatLocale} /></dd>
                        </div>
                    )}
                    {shipping && (
                        <div className="flex justify-between gap-6">
                            <dt>{translate('shipping')}</dt>
                            <dd><PriceDisplay money={shipping} locale={formatLocale} /></dd>
                        </div>
                    )}
                    {tax && (
                        <div className="flex justify-between gap-6">
                            <dt>{translate('tax')}</dt>
                            <dd><PriceDisplay money={tax} locale={formatLocale} /></dd>
                        </div>
                    )}
                    <div className="flex justify-between gap-6 border-t border-gray-200 pt-3 text-lg font-bold">
                        <dt>{translate('grandTotal')}</dt>
                        <dd><PriceDisplay money={order.totalPrice} locale={formatLocale} /></dd>
                    </div>
                </dl>
            </section>

            <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                    {translate('shippingAddress')}
                </h2>
                {order.shippingAddress ? (
                    <address className="not-italic text-gray-700">
                        <p>
                            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                        </p>
                        {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
                        <p>
                            {order.shippingAddress.streetName}{' '}
                            {order.shippingAddress.streetNumber}
                        </p>
                        {order.shippingAddress.additionalStreetInfo && (
                            <p>{order.shippingAddress.additionalStreetInfo}</p>
                        )}
                        <p>
                            {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                        </p>
                        <p>{order.shippingAddress.country}</p>
                    </address>
                ) : (
                    <p className="text-gray-600">{translate('shippingAddressUnavailable')}</p>
                )}
            </section>

            <div className="text-center">
                <Link
                    link="/"
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                >
                    {translate('continueShopping')}
                </Link>
            </div>
        </div>
    );
}
