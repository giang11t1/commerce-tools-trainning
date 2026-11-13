import { getTranslations } from 'next-intl/server';

export default async function SubscriptionsLoading() {
    const translate = await getTranslations('subscriptions');

    return (
        <div
            role="status"
            aria-busy="true"
            className="container mx-auto flex min-h-64 items-center justify-center px-4 py-8 text-gray-600"
        >
            <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-700" />
            {translate('loading')}
        </div>
    );
}
