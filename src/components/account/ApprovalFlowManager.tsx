'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from '@/components/commercetools-ui/atoms/link';
import {
    decideApprovalFlow,
    getApprovalFlows,
    type ApprovalFlow,
} from '@/lib/approvals';

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

function eligibleForCurrentAssociate(flow: ApprovalFlow, roleKeys: string[]) {
    const roles = new Set(roleKeys);
    return (flow.eligibleApprovers ?? []).some((approver) =>
        roles.has(approver.associateRole.key),
    );
}

export default function ApprovalFlowManager({
    unitKey,
    unitName,
    initialFlows,
    initialTotal,
    initialLimit,
    initialCanApprove,
    initialRoleKeys,
    initialError,
}: {
    unitKey: string;
    unitName: string;
    initialFlows: ApprovalFlow[];
    initialTotal: number;
    initialLimit: number;
    initialCanApprove: boolean;
    initialRoleKeys: string[];
    initialError?: string;
}) {
    const t = useTranslations('approvalRules');
    const router = useRouter();
    const [flows, setFlows] = useState(initialFlows);
    const [total, setTotal] = useState(initialTotal);
    const [pageLimit, setPageLimit] = useState(initialLimit);
    const [offset, setOffset] = useState(0);
    const [filter, setFilter] = useState<StatusFilter>('All');
    const [canApprove, setCanApprove] = useState(initialCanApprove);
    const [roleKeys, setRoleKeys] = useState(initialRoleKeys);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState('');
    const [error, setError] = useState(initialError ?? '');
    const [notice, setNotice] = useState('');

    async function loadFlows(nextFilter: StatusFilter, nextOffset: number) {
        setLoading(true);
        setError('');
        try {
            const result = await getApprovalFlows(
                unitKey,
                nextFilter === 'All' ? undefined : nextFilter,
                nextOffset,
            );
            if (!result.success) {
                setError(result.error);
                return;
            }
            setFlows(result.flows);
            setTotal(result.total);
            setOffset(result.offset);
            setPageLimit(result.limit);
            setCanApprove(result.canApprove);
            setRoleKeys(result.roleKeys);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : t('flowsLoadError'));
        } finally {
            setLoading(false);
        }
    }

    async function decide(flow: ApprovalFlow, action: 'approve' | 'reject') {
        const reason = action === 'reject'
            ? window.prompt(t('rejectionReasonPrompt'))
            : undefined;
        if (action === 'reject' && reason === null) return;
        if (!window.confirm(t(action === 'approve' ? 'confirmApprove' : 'confirmReject'))) return;

        setSavingId(flow.id);
        setError('');
        setNotice('');
        try {
            const result = await decideApprovalFlow(unitKey, flow.id, action, reason || undefined);
            if (!result.success) {
                setError(result.error);
                return;
            }
            setNotice(t(action === 'approve' ? 'flowApproved' : 'flowRejected'));
            await loadFlows(filter, offset);
            router.refresh();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : t('decisionError'));
        } finally {
            setSavingId('');
        }
    }

    return (
        <section className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold">{t('flowsTitle')}</h1>
                <p className="mt-1 text-sm text-gray-600">{unitName}</p>
            </header>

            {error && <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-md bg-green-50 p-4 text-sm text-green-800">{notice}</div>}

            <div className="flex flex-wrap gap-2" role="group" aria-label={t('filterFlows')}>
                {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
                    <button
                        key={status}
                        type="button"
                        aria-pressed={filter === status}
                        onClick={() => {
                            setFilter(status);
                            setOffset(0);
                            void loadFlows(status, 0);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-sm ${filter === status ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        {t(status.toLowerCase())}
                    </button>
                ))}
            </div>

            <section className="rounded-lg border border-gray-100 bg-white shadow-sm">
                {loading ? (
                    <div className="space-y-3 p-5" role="status" aria-label={t('loading')}>
                        {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded bg-gray-100" />)}
                    </div>
                ) : flows.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">{t('emptyFlows')}</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {flows.map((flow) => {
                            const canAct = canApprove && flow.status === 'Pending' && eligibleForCurrentAssociate(flow, roleKeys);
                            const order = flow.order?.obj;
                            return (
                                <article key={flow.id} className="p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="font-semibold">
                                                {t('order')}{' '}
                                                {order?.id ? (
                                                    <Link link={`/account/orders/${encodeURIComponent(order.id)}`} className="text-blue-700 hover:underline">
                                                        {order.orderNumber ?? order.id}
                                                    </Link>
                                                ) : flow.order?.id ?? t('orderUnavailable')}
                                            </h2>
                                            {order?.totalPrice && (
                                                <p className="mt-1 text-sm text-gray-600">
                                                    {(order.totalPrice.centAmount / 100).toFixed(2)} {order.totalPrice.currencyCode}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${flow.status === 'Pending' ? 'bg-amber-100 text-amber-800' : flow.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {t(flow.status.toLowerCase())}
                                        </span>
                                    </div>
                                    <details className="mt-3 text-sm">
                                        <summary className="cursor-pointer font-medium text-blue-700">{t('viewDetails')}</summary>
                                        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <dt className="font-medium text-gray-700">{t('flowId')}</dt>
                                                <dd className="mt-1 break-all text-gray-600">{flow.id}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium text-gray-700">{t('approvalRules')}</dt>
                                                <dd className="mt-1 text-gray-600">
                                                    {flow.rules?.length
                                                        ? flow.rules.map((rule) => (
                                                              <div key={rule.id} className="mb-2">
                                                                  <p>{rule.obj?.name ?? rule.id}</p>
                                                                  {rule.obj?.approvers.tiers.map((tier, tierIndex) => (
                                                                      <p key={tierIndex} className="text-xs text-gray-500">
                                                                          {t('tier', { number: tierIndex + 1 })}: {tier.and.map((group) => group.or.map(({ associateRole }) => associateRole.key).join(` ${t('or')} `)).join(` ${t('and')} `)}
                                                                      </p>
                                                                  ))}
                                                              </div>
                                                          ))
                                                        : t('noRuleReference')}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium text-gray-700">{t('approvalProgress')}</dt>
                                                <dd className="mt-1 text-gray-600">
                                                    {t('approvedAndPending', {
                                                        approved: flow.approvals?.length ?? 0,
                                                        pending: flow.pendingApprovers?.length ?? 0,
                                                    })}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium text-gray-700">{t('currentTier')}</dt>
                                                <dd className="mt-1 text-gray-600">
                                                    {flow.currentTierPendingApprovers?.map((approver) => approver.associateRole.key).join(', ') || '—'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium text-gray-700">{t('decisions')}</dt>
                                                <dd className="mt-1 space-y-1 text-gray-600">
                                                    {flow.approvals?.length ? flow.approvals.map((approval, index) => (
                                                        <p key={`${approval.approvedAt ?? 'approval'}-${index}`}>
                                                            {approval.approver?.associateRole?.key ?? t('approver')} — {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString() : '—'}
                                                        </p>
                                                    )) : <p>{t('noDecisions')}</p>}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium text-gray-700">{t('createdAt')}</dt>
                                                <dd className="mt-1 text-gray-600">{new Date(flow.createdAt).toLocaleString()}</dd>
                                            </div>
                                            <div>
                                                <dt className="font-medium text-gray-700">{t('updatedAt')}</dt>
                                                <dd className="mt-1 text-gray-600">{new Date(flow.lastModifiedAt).toLocaleString()}</dd>
                                            </div>
                                            {flow.rejection && (
                                                <div className="sm:col-span-2">
                                                    <dt className="font-medium text-gray-700">{t('rejection')}</dt>
                                                    <dd className="mt-1 text-gray-600">
                                                        {flow.rejection.reason || t('noRejectionReason')}
                                                        {flow.rejection.rejectedAt && ` — ${new Date(flow.rejection.rejectedAt).toLocaleString()}`}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </details>
                                    {canAct && (
                                        <div className="mt-4 flex gap-3">
                                            <button
                                                type="button"
                                                disabled={savingId !== ''}
                                                onClick={() => void decide(flow, 'approve')}
                                                className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                                            >
                                                {savingId === flow.id ? t('saving') : t('approve')}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={savingId !== ''}
                                                onClick={() => void decide(flow, 'reject')}
                                                className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                {t('reject')}
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm">
                    <span className="text-gray-600">{t('flowCount', { count: total })}</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={loading || offset === 0}
                            onClick={() => void loadFlows(filter, Math.max(offset - pageLimit, 0))}
                            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
                        >
                            {t('previous')}
                        </button>
                        <button
                            type="button"
                            disabled={loading || offset + flows.length >= total}
                            onClick={() => void loadFlows(filter, offset + pageLimit)}
                            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
                        >
                            {t('next')}
                        </button>
                    </div>
                </div>
            </section>
        </section>
    );
}
