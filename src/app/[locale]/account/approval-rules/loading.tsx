import { getTranslations } from 'next-intl/server';

export default async function ApprovalRulesLoading() {
    const t = await getTranslations('approvalRules');
    return (
        <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-8 md:grid-cols-4" role="status" aria-label={t('loading')}>
            <div className="h-56 animate-pulse rounded-lg bg-gray-100" />
            <div className="space-y-4 md:col-span-3">
                <div className="h-10 w-1/3 animate-pulse rounded bg-gray-100" />
                {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-gray-100" />)}
            </div>
        </div>
    );
}
