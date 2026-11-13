import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type {
    Order,
    RecurrencePolicySchedule,
    RecurringOrder,
} from '@commercetools/platform-sdk';
import Link from '@/components/commercetools-ui/atoms/link';
import AccountSidebar from '@/components/AccountSidebar';
import PriceDisplay from '@/components/PriceDisplay';
import { getSession } from '@/lib/auth';
import {
    getMyRecurringOrder,
    getMyRecurringOrderOrders,
} from '@/lib/recurring-orders';
import RecurringOrderActions from './RecurringOrderActions';
import { getLocalizationInfo } from '@/../project.config';

export default async function RecurringOrderDetailPage({
    params,
}: {
    params: Promise<{ locale: string; recurringOrderId: string }>;
}) {
    const { locale, recurringOrderId } = await params;
    const customerId = await getSession();
    if (!customerId) {
        redirect(
            `/login?redirect=${encodeURIComponent(`/account/subscriptions/${recurringOrderId}`)}`,
        );
    }

    const translate = await getTranslations('subscriptions');
    let recurringOrder: RecurringOrder | undefined;
    let linkedOrders: Order[] = [];
    let loadError = false;
    try {
        recurringOrder = await getMyRecurringOrder(recurringOrderId);
        if (recurringOrder) {
            linkedOrders = await getMyRecurringOrderOrders(recurringOrderId);
        }
    } catch (error) {
        console.error('Failed to load customer recurring order details:', error);
        loadError = true;
    }

    if (!recurringOrder && !loadError) notFound();

    const formatSchedule = (schedule: RecurrencePolicySchedule) => {
        if (schedule.type === 'dayOfMonth') {
            return translate('dayOfMonth', { day: schedule.day });
        }

        const unit =
            schedule.intervalUnit === 'Days'
                ? translate(schedule.value === 1 ? 'day' : 'days')
                : schedule.intervalUnit === 'Weeks'
                  ? translate(schedule.value === 1 ? 'week' : 'weeks')
                  : translate(schedule.value === 1 ? 'month' : 'months');

        return schedule.value === 1
            ? translate('frequencyEveryOne', { unit })
            : translate('frequencyEvery', { count: schedule.value, unit });
    };
    const formatDate = (value?: string) =>
        value
            ? new Date(value).toLocaleString(getLocalizationInfo(locale).locale, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              })
            : translate('notScheduled');

    if (loadError || !recurringOrder) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    <div className="md:col-span-1">
                        <AccountSidebar />
                    </div>
                    <main className="md:col-span-3">
                        <h1 className="mb-6 text-3xl font-bold">{translate('title')}</h1>
                        <p role="alert" className="rounded-md bg-red-50 p-4 text-red-800">
                            {translate('loadError')}
                        </p>
                    </main>
                </div>
            </div>
        );
    }

    const lineItems = recurringOrder.cart?.obj?.lineItems ?? [];
    const hasPendingSkip = Boolean(
        recurringOrder.skipConfiguration &&
            recurringOrder.skipConfiguration.totalToSkip >
                recurringOrder.skipConfiguration.skipped,
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Link
                    link="/account/subscriptions"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    {translate('backToSubscriptions')}
                </Link>
                <h1 className="mt-3 text-3xl font-bold">
                    {translate('subscriptionNumber', {
                        number: recurringOrder.key ?? recurringOrder.id.slice(0, 8),
                    })}
                </h1>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                <div className="md:col-span-1">
                    <AccountSidebar />
                </div>
                <main className="space-y-6 md:col-span-3">
                    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {translate('scheduleAndStatus')}
                            </h2>
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                                {translate(`status.${recurringOrder.recurringOrderState}`)}
                            </span>
                        </div>
                        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm text-gray-500">{translate('frequency')}</dt>
                                <dd className="mt-1 font-medium text-gray-900">
                                    {formatSchedule(recurringOrder.schedule)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-500">{translate('nextOrderAt')}</dt>
                                <dd className="mt-1 font-medium text-gray-900">
                                    {formatDate(recurringOrder.nextOrderAt)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-500">{translate('startsAt')}</dt>
                                <dd className="mt-1 font-medium text-gray-900">
                                    {formatDate(recurringOrder.startsAt)}
                                </dd>
                            </div>
                            {recurringOrder.resumesAt && (
                                <div>
                                    <dt className="text-sm text-gray-500">{translate('resumesAt')}</dt>
                                    <dd className="mt-1 font-medium text-gray-900">
                                        {formatDate(recurringOrder.resumesAt)}
                                    </dd>
                                </div>
                            )}
                            {recurringOrder.expiresAt && (
                                <div>
                                    <dt className="text-sm text-gray-500">{translate('expiresAt')}</dt>
                                    <dd className="mt-1 font-medium text-gray-900">
                                        {formatDate(recurringOrder.expiresAt)}
                                    </dd>
                                </div>
                            )}
                            {recurringOrder.lastOrderAt && (
                                <div>
                                    <dt className="text-sm text-gray-500">{translate('lastOrderAt')}</dt>
                                    <dd className="mt-1 font-medium text-gray-900">
                                        {formatDate(recurringOrder.lastOrderAt)}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-semibold text-gray-900">
                            {translate('products')}
                        </h2>
                        {lineItems.length === 0 ? (
                            <p className="text-gray-600">{translate('productsUnavailable')}</p>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {lineItems.map((item) => {
                                    const name =
                                        item.name[locale] ??
                                        item.name[getLocalizationInfo(locale).locale] ??
                                        item.name['en-US'] ??
                                        Object.values(item.name)[0];
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex flex-wrap justify-between gap-3 py-4"
                                        >
                                            <div>
                                                <h3 className="font-medium text-gray-900">{name}</h3>
                                                <p className="mt-1 text-sm text-gray-600">
                                                    {translate('quantity')}: {item.quantity}
                                                    {item.variant.sku ? ` · ${item.variant.sku}` : ''}
                                                </p>
                                            </div>
                                            <p className="font-medium text-gray-900">
                                                <PriceDisplay money={item.price.value} locale={getLocalizationInfo(locale).locale} />
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-semibold text-gray-900">
                            {translate('linkedOrders')}
                        </h2>
                        {linkedOrders.length === 0 ? (
                            <p className="text-gray-600">{translate('noLinkedOrders')}</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {linkedOrders.map((order) => (
                                    <li
                                        key={order.id}
                                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                                    >
                                        <div>
                                            <Link
                                                link={`/account/orders/${encodeURIComponent(order.id)}`}
                                                className="font-medium text-blue-700 hover:underline"
                                            >
                                                {order.orderNumber ?? order.id}
                                            </Link>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {formatDate(order.createdAt)}
                                            </p>
                                        </div>
                                        <span className="text-sm text-gray-700">
                                            {translate(`orderStatus.${order.orderState}`)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-semibold text-gray-900">
                            {translate('manageSubscription')}
                        </h2>
                        <RecurringOrderActions
                            recurringOrderId={recurringOrder.id}
                            state={recurringOrder.recurringOrderState}
                            hasPendingSkip={hasPendingSkip}
                        />
                    </section>
                </main>
            </div>
        </div>
    );
}
