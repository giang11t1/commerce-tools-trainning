'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    createApprovalRule,
    updateApprovalRuleStatus,
    type ApprovalRule,
    type ApprovalRuleDraftInput,
} from '@/lib/approvals';
import type { ApprovalCondition } from '@/lib/approval-predicate';

type RoleOption = { key: string; name: string };
type ConditionDraft = {
    field: 'totalPrice' | 'currency' | 'country';
    operator: '=' | '>' | '>=' | '<' | '<=';
    value: string;
    currency: string;
};
type TierDraft = { operator: 'and' | 'or'; roleKeys: string[] };

const initialCondition: ConditionDraft = {
    field: 'totalPrice',
    operator: '>=',
    value: '',
    currency: 'USD',
};

function roleKeys(ruleRoles: { associateRole: { key: string } }[] = []) {
    return ruleRoles.map(({ associateRole }) => associateRole.key);
}

export default function ApprovalRuleManager({
    unitKey,
    unitName,
    rules: initialRules,
    roles,
    canCreateRules,
    canUpdateRules,
    error: initialError,
}: {
    unitKey: string;
    unitName: string;
    rules: ApprovalRule[];
    roles: RoleOption[];
    canCreateRules: boolean;
    canUpdateRules: boolean;
    error?: string;
}) {
    const t = useTranslations('approvalRules');
    const router = useRouter();
    const [rules, setRules] = useState(initialRules);
    const [error, setError] = useState(initialError ?? '');
    const [notice, setNotice] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ruleName, setRuleName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [requesterRoleKeys, setRequesterRoleKeys] = useState<string[]>([]);
    const [conditions, setConditions] = useState<ConditionDraft[]>([{ ...initialCondition }]);
    const [conditionOperator, setConditionOperator] = useState<'and' | 'or'>('and');
    const [tiers, setTiers] = useState<TierDraft[]>([{ operator: 'or', roleKeys: [] }]);

    const visibleRules = rules.filter((rule) => {
        const matchesText = `${rule.name} ${rule.description ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return matchesText && (statusFilter === 'All' || rule.status === statusFilter);
    });

    function toggleKey(keys: string[], key: string, selected: boolean) {
        return selected ? [...new Set([...keys, key])] : keys.filter((item) => item !== key);
    }

    function updateCondition(index: number, patch: Partial<ConditionDraft>) {
        setConditions((items) =>
            items.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                          ...item,
                          ...patch,
                          ...(patch.field === 'totalPrice' && !item.currency
                              ? { currency: 'USD' }
                              : {}),
                      }
                    : item,
            ),
        );
    }

    async function submitRule(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setNotice('');
        setSaving(true);

        const validConditions: ApprovalCondition[] = conditions.map((condition) => {
            if (condition.field === 'totalPrice') {
                return {
                    field: 'totalPrice',
                    operator: condition.operator,
                    value: condition.value,
                    currency: condition.currency.toUpperCase(),
                };
            }
            if (condition.field === 'currency') {
                return { field: 'currency', value: condition.value.toUpperCase() };
            }
            return { field: 'country', value: condition.value.toUpperCase() };
        });
        const input: ApprovalRuleDraftInput = {
            name: ruleName,
            description,
            status,
            requesterRoleKeys,
            conditions: validConditions,
            conditionOperator,
            tiers,
        };

        try {
            const result = await createApprovalRule(unitKey, input);
            if (!result.success) {
                setError(result.error);
                return;
            }
            setNotice(t('created'));
            setShowForm(false);
            setRuleName('');
            setDescription('');
            setRequesterRoleKeys([]);
            setConditions([{ ...initialCondition }]);
            setTiers([{ operator: 'or', roleKeys: [] }]);
            setRules((items) => [result.rule, ...items]);
            router.refresh();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : t('saveError'));
        } finally {
            setSaving(false);
        }
    }

    async function toggleStatus(rule: ApprovalRule) {
        const nextStatus = rule.status === 'Active' ? 'Inactive' : 'Active';
        if (!window.confirm(t('confirmStatus', { status: t(nextStatus.toLowerCase()) }))) return;
        setError('');
        setNotice('');
        setSaving(true);
        try {
            const result = await updateApprovalRuleStatus(
                unitKey,
                rule.id,
                rule.version,
                nextStatus,
            );
            if (!result.success) {
                setError(result.error);
                return;
            }
            setRules((items) =>
                items.map((item) => (item.id === rule.id ? result.rule : item)),
            );
            setNotice(t('statusUpdated'));
            router.refresh();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : t('saveError'));
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{t('rulesTitle')}</h1>
                    <p className="mt-1 text-sm text-gray-600">{unitName}</p>
                </div>
                {canCreateRules && (
                    <button
                        type="button"
                        onClick={() => setShowForm((value) => !value)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        {showForm ? t('cancel') : t('createRule')}
                    </button>
                )}
            </header>

            {error && <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-md bg-green-50 p-4 text-sm text-green-800">{notice}</div>}

            {showForm && canCreateRules && (
                <form onSubmit={submitRule} className="space-y-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-semibold">{t('newRule')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm font-medium">
                            {t('name')}
                            <input
                                required
                                maxLength={256}
                                value={ruleName}
                                onChange={(event) => setRuleName(event.target.value)}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                            />
                        </label>
                        <label className="space-y-1 text-sm font-medium">
                            {t('status')}
                            <select
                                value={status}
                                onChange={(event) => setStatus(event.target.value as 'Active' | 'Inactive')}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                            >
                                <option value="Active">{t('active')}</option>
                                <option value="Inactive">{t('inactive')}</option>
                            </select>
                        </label>
                    </div>
                    <label className="block space-y-1 text-sm font-medium">
                        {t('description')}
                        <textarea
                            maxLength={2000}
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                            rows={2}
                        />
                    </label>

                    <fieldset className="space-y-2">
                        <legend className="font-semibold">{t('requesterRoles')}</legend>
                        {roles.length === 0 ? <p className="text-sm text-gray-500">{t('noRoles')}</p> : (
                            <div className="flex flex-wrap gap-3">
                                {roles.map((role) => (
                                    <label key={role.key} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={requesterRoleKeys.includes(role.key)}
                                            onChange={(event) =>
                                                setRequesterRoleKeys((keys) =>
                                                    toggleKey(keys, role.key, event.target.checked),
                                                )
                                            }
                                        />
                                        {role.name}
                                    </label>
                                ))}
                            </div>
                        )}
                    </fieldset>

                    <fieldset className="space-y-3">
                        <legend className="font-semibold">{t('conditions')}</legend>
                        <label className="flex items-center gap-2 text-sm">
                            {t('combineConditions')}
                            <select
                                value={conditionOperator}
                                onChange={(event) => setConditionOperator(event.target.value as 'and' | 'or')}
                                className="rounded-md border border-gray-300 px-2 py-1"
                            >
                                <option value="and">{t('and')}</option>
                                <option value="or">{t('or')}</option>
                            </select>
                        </label>
                        {conditions.map((condition, index) => (
                            <div key={index} className="flex flex-wrap items-end gap-2 rounded-md bg-gray-50 p-3">
                                <label className="space-y-1 text-xs font-medium">
                                    {t('conditionType')}
                                    <select
                                        value={condition.field}
                                        onChange={(event) =>
                                            updateCondition(index, {
                                                field: event.target.value as ConditionDraft['field'],
                                            })
                                        }
                                        className="block rounded-md border border-gray-300 px-2 py-2 text-sm"
                                    >
                                        <option value="totalPrice">{t('totalPrice')}</option>
                                        <option value="currency">{t('currency')}</option>
                                        <option value="country">{t('country')}</option>
                                    </select>
                                </label>
                                {condition.field === 'totalPrice' && (
                                    <>
                                        <label className="space-y-1 text-xs font-medium">
                                            {t('operator')}
                                            <select
                                                value={condition.operator}
                                                onChange={(event) =>
                                                    updateCondition(index, {
                                                        operator: event.target.value as ConditionDraft['operator'],
                                                    })
                                                }
                                                className="block rounded-md border border-gray-300 px-2 py-2 text-sm"
                                            >
                                                {['=', '>', '>=', '<', '<='].map((operator) => (
                                                    <option key={operator} value={operator}>{operator}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="space-y-1 text-xs font-medium">
                                            {t('amount')}
                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={condition.value}
                                                onChange={(event) => updateCondition(index, { value: event.target.value })}
                                                className="block w-32 rounded-md border border-gray-300 px-2 py-2 text-sm"
                                            />
                                        </label>
                                        <label className="space-y-1 text-xs font-medium">
                                            {t('currencyCode')}
                                            <input
                                                required
                                                maxLength={3}
                                                value={condition.currency}
                                                onChange={(event) => updateCondition(index, { currency: event.target.value.toUpperCase() })}
                                                className="block w-20 rounded-md border border-gray-300 px-2 py-2 text-sm uppercase"
                                            />
                                        </label>
                                    </>
                                )}
                                {condition.field !== 'totalPrice' && (
                                    <label className="space-y-1 text-xs font-medium">
                                        {condition.field === 'currency' ? t('currencyCode') : t('countryCode')}
                                        <input
                                            required
                                            maxLength={condition.field === 'currency' ? 3 : 2}
                                            value={condition.value}
                                            onChange={(event) => updateCondition(index, { value: event.target.value.toUpperCase() })}
                                            className="block w-24 rounded-md border border-gray-300 px-2 py-2 text-sm uppercase"
                                        />
                                    </label>
                                )}
                                <button
                                    type="button"
                                    disabled={conditions.length === 1}
                                    onClick={() => setConditions((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                                    className="rounded-md px-2 py-2 text-sm text-red-700 disabled:opacity-40"
                                >
                                    {t('remove')}
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            disabled={conditions.length >= 10}
                            onClick={() => setConditions((items) => [...items, { ...initialCondition }])}
                            className="text-sm font-medium text-blue-700 disabled:opacity-40"
                        >
                            {t('addCondition')}
                        </button>
                    </fieldset>

                    <fieldset className="space-y-3">
                        <legend className="font-semibold">{t('approverTiers')}</legend>
                        {tiers.map((tier, index) => (
                            <div key={index} className="space-y-2 rounded-md border border-gray-200 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-medium">{t('tier', { number: index + 1 })}</span>
                                    <label className="flex items-center gap-2 text-sm">
                                        {t('rolesMust')}
                                        <select
                                            value={tier.operator}
                                            onChange={(event) =>
                                                setTiers((items) =>
                                                    items.map((item, itemIndex) =>
                                                        itemIndex === index
                                                            ? { ...item, operator: event.target.value as 'and' | 'or' }
                                                            : item,
                                                    ),
                                                )
                                            }
                                            className="rounded-md border border-gray-300 px-2 py-1"
                                        >
                                            <option value="or">{t('anyRole')}</option>
                                            <option value="and">{t('allRoles')}</option>
                                        </select>
                                    </label>
                                    <button
                                        type="button"
                                        disabled={tiers.length === 1}
                                        onClick={() => setTiers((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                                        className="text-sm text-red-700 disabled:opacity-40"
                                    >
                                        {t('remove')}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {roles.map((role) => (
                                        <label key={role.key} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={tier.roleKeys.includes(role.key)}
                                                onChange={(event) =>
                                                    setTiers((items) =>
                                                        items.map((item, itemIndex) =>
                                                            itemIndex === index
                                                                ? {
                                                                      ...item,
                                                                      roleKeys: toggleKey(
                                                                          item.roleKeys,
                                                                          role.key,
                                                                          event.target.checked,
                                                                      ),
                                                                  }
                                                                : item,
                                                        ),
                                                    )
                                                }
                                            />
                                            {role.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            disabled={tiers.length >= 5}
                            onClick={() => setTiers((items) => [...items, { operator: 'or', roleKeys: [] }])}
                            className="text-sm font-medium text-blue-700 disabled:opacity-40"
                        >
                            {t('addTier')}
                        </button>
                    </fieldset>

                    <button
                        type="submit"
                        disabled={saving || requesterRoleKeys.length === 0 || tiers.some((tier) => tier.roleKeys.length === 0)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? t('saving') : t('saveRule')}
                    </button>
                </form>
            )}

            {!canCreateRules && !canUpdateRules && (
                <p className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">{t('readOnly')}</p>
            )}

            <section className="space-y-4 rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-3">
                    <label className="min-w-52 flex-1 space-y-1 text-sm font-medium">
                        {t('search')}
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="block w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
                        />
                    </label>
                    <label className="space-y-1 text-sm font-medium">
                        {t('status')}
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                            className="block rounded-md border border-gray-300 px-3 py-2 font-normal"
                        >
                            <option value="All">{t('allStatuses')}</option>
                            <option value="Active">{t('active')}</option>
                            <option value="Inactive">{t('inactive')}</option>
                        </select>
                    </label>
                </div>
                {rules.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">{t('emptyRules')}</p>
                ) : visibleRules.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">{t('noRulesMatch')}</p>
                ) : (
                    <div className="space-y-3">
                        {visibleRules.map((rule) => (
                            <article key={rule.id} className="rounded-md border border-gray-200 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-semibold">{rule.name}</h2>
                                        {rule.description && <p className="mt-1 text-sm text-gray-600">{rule.description}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                            {t(rule.status.toLowerCase())}
                                        </span>
                                        {canUpdateRules && (
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => toggleStatus(rule)}
                                                className="text-sm font-medium text-blue-700 disabled:opacity-50"
                                            >
                                                {rule.status === 'Active' ? t('deactivate') : t('activate')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <details className="mt-3 text-sm">
                                    <summary className="cursor-pointer font-medium text-blue-700">{t('viewDetails')}</summary>
                                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <dt className="font-medium text-gray-700">{t('predicate')}</dt>
                                            <dd className="mt-1 break-all font-mono text-xs text-gray-600">{rule.predicate}</dd>
                                        </div>
                                        <div>
                                            <dt className="font-medium text-gray-700">{t('requesterRoles')}</dt>
                                            <dd className="mt-1 text-gray-600">
                                                {roleKeys(rule.requesters).map((key) => roles.find((role) => role.key === key)?.name ?? key).join(', ')}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="font-medium text-gray-700">{t('approverTiers')}</dt>
                                            <dd className="mt-1 space-y-1 text-gray-600">
                                                {rule.approvers.tiers.map((tier, tierIndex) => (
                                                    <p key={tierIndex}>
                                                        {t('tier', { number: tierIndex + 1 })}: {tier.and.map((group) => group.or.map(({ associateRole }) => roles.find((role) => role.key === associateRole.key)?.name ?? associateRole.key).join(` ${t('or')} `)).join(` ${t('and')} `)}
                                                    </p>
                                                ))}
                                            </dd>
                                        </div>
                                    </dl>
                                </details>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}
