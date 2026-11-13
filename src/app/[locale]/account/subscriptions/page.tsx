import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from '@/components/commercetools-ui/atoms/link';
import AccountSidebar from '@/components/AccountSidebar';
import { getSession } from '@/lib/auth';
import { getMyRecurringOrders } from '@/lib/recurring-orders';
import type {
    RecurrencePolicySchedule,
    RecurringOrder,
} from '@commercetools/platform-sdk';
import { getLocalizationInfo } from '@/../project.config';

export default async function SubscriptionsPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const customerId = await getSession();
    if (!customerId) {
        redirect('/login?redirect=%2Faccount%2Fsubscriptions');
    }

    const translate = await getTranslations('subscriptions');
    let recurringOrders: RecurringOrder[] = [];
    let loadError = false;
    try {
        recurringOrders = await getMyRecurringOrders();
    } catch (error) {
        console.error('Failed to load customer recurring orders:', error);
        loadError = true;
    }

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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                <div className="md:col-span-1">
                    <AccountSidebar />
                </div>
                <main className="md:col-span-3">
                    <h1 className="mb-6 text-3xl font-bold">
                        {translate('title')}
                    </h1>

                    {loadError ? (
                        <div role="alert" className="rounded-md bg-red-50 p-4 text-red-800">
                            {translate('loadError')}
                        </div>
                    ) : recurringOrders.length === 0 ? (
                        <div className="rounded-lg border border-gray-100 bg-white p-8 text-center text-gray-600">
                            <h2 className="mb-2 text-xl font-semibold text-gray-900">
                                {translate('emptyTitle')}
                            </h2>
                            <p>{translate('emptyDescription')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recurringOrders.map((recurringOrder) => (
                                <article
                                    key={recurringOrder.id}
                                    className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm"
                                >
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">
                                                {translate('subscriptionNumber', {
                                                    number: recurringOrder.key ?? recurringOrder.id.slice(0, 8),
                                                })}
                                            </h2>
                                            <p className="mt-1 text-sm text-gray-600">
                                                {formatSchedule(recurringOrder.schedule)}
                                            </p>
                                        </div>
                                        <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                                            {translate(`status.${recurringOrder.recurringOrderState}`)}
                                        </span>
                                    </div>
                                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                                        <div>
                                            <dt className="text-gray-500">{translate('nextOrderAt')}</dt>
                                            <dd className="mt-1 font-medium text-gray-900">
                                                {formatDate(recurringOrder.nextOrderAt)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-gray-500">{translate('startsAt')}</dt>
                                            <dd className="mt-1 font-medium text-gray-900">
                                                {formatDate(recurringOrder.startsAt)}
                                            </dd>
                                        </div>
                                    </dl>
                                    <Link
                                        link={`/account/subscriptions/${encodeURIComponent(recurringOrder.id)}`}
                                        className="mt-5 inline-flex font-medium text-blue-700 hover:underline"
                                    >
                                        {translate('viewDetails')}
                                    </Link>
                                </article>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
