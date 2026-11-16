import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import AccountSidebar from '@/components/AccountSidebar';
import ApprovalRuleManager from '@/components/account/ApprovalRuleManager';
import Link from '@/components/commercetools-ui/atoms/link';
import { getSession } from '@/lib/auth';
import {
    getApprovalBusinessUnits,
    getApprovalRoles,
    getApprovalRules,
} from '@/lib/approvals';

type ApprovalRulesPageProps = {
    searchParams: Promise<{ unit?: string }>;
};

export default async function ApprovalRulesPage({ searchParams }: ApprovalRulesPageProps) {
    const t = await getTranslations('approvalRules');
    if (!(await getSession())) redirect('/login');

    const [{ unit }, unitsResult] = await Promise.all([
        searchParams,
        getApprovalBusinessUnits(),
    ]);
    const units = unitsResult.success ? unitsResult.businessUnits : [];
    const selectedUnit = units.find((item) => item.key === unit) ?? units[0];
    const [result, rolesResult] = selectedUnit
        ? await Promise.all([
              getApprovalRules(selectedUnit.key),
              getApprovalRoles(selectedUnit.key),
          ])
        : [undefined, undefined];
    const roles = rolesResult?.success ? rolesResult.roles : [];
    const loadError = !unitsResult.success
        ? unitsResult.error
        : !selectedUnit
          ? t('noBusinessUnit')
          : result && !result.success
            ? result.error
            : rolesResult && !rolesResult.success
              ? rolesResult.error
              : undefined;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                <aside className="md:col-span-1">
                    <AccountSidebar />
                </aside>
                <main className="space-y-6 md:col-span-3">
                    {units.length > 1 && (
                        <nav aria-label={t('businessUnits')} className="flex flex-wrap gap-2">
                            {units.map((businessUnit) => (
                                <Link
                                    key={businessUnit.id}
                                    link={`/account/approval-rules?unit=${encodeURIComponent(businessUnit.key)}`}
                                    aria-current={businessUnit.key === selectedUnit?.key ? 'page' : undefined}
                                    className={`rounded-md border px-3 py-2 text-sm ${businessUnit.key === selectedUnit?.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {businessUnit.name}
                                </Link>
                            ))}
                        </nav>
                    )}
                    {selectedUnit && result?.success ? (
                        <ApprovalRuleManager
                            unitKey={selectedUnit.key}
                            unitName={selectedUnit.name}
                            rules={result.rules}
                            roles={roles}
                            canCreateRules={result.canCreateRules}
                            canUpdateRules={result.canUpdateRules}
                            error={rolesResult && !rolesResult.success ? rolesResult.error : undefined}
                        />
                    ) : (
                        <section className="rounded-lg border border-gray-100 bg-white p-8 shadow-sm">
                            <h1 className="text-3xl font-bold">{t('rulesTitle')}</h1>
                            <p role="alert" className="mt-4 text-sm text-red-700">{loadError}</p>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}
