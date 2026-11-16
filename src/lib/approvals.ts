'use server';

import type { BusinessUnit } from '@commercetools/platform-sdk';
import { getSession } from './auth';
import { associateClient } from './commercetools';
import { getAssociateRoles } from './associate-roles';
import { getMyBusinessUnits } from './business-units';
import {
    buildApprovalPredicate,
    isValidApprovalCondition,
    type ApprovalCondition,
} from './approval-predicate';

export type ApprovalRoleReference = {
    typeId: 'associate-role';
    key: string;
};

export type ApprovalRule = {
    id: string;
    version: number;
    name: string;
    description?: string;
    status: 'Active' | 'Inactive';
    predicate: string;
    requesters: { associateRole: ApprovalRoleReference }[];
    approvers: {
        tiers: {
            and: { or: { associateRole: ApprovalRoleReference }[] }[];
        }[];
    };
};

export type ApprovalFlow = {
    id: string;
    version: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    createdAt: string;
    lastModifiedAt: string;
    order?: {
        id: string;
        obj?: {
            id: string;
            orderNumber?: string;
            totalPrice?: { centAmount: number; currencyCode: string };
        };
    };
    rules?: {
        id: string;
        obj?: ApprovalRule;
    }[];
    approvals?: {
        approver?: {
            customer?: { id: string; obj?: { firstName?: string; lastName?: string } };
            associateRole?: ApprovalRoleReference;
        };
        approvedAt?: string;
    }[];
    rejection?: {
        rejecter?: {
            customer?: { id: string; obj?: { firstName?: string; lastName?: string } };
            associateRole?: ApprovalRoleReference;
        };
        rejectedAt?: string;
        reason?: string;
    };
    eligibleApprovers?: { associateRole: ApprovalRoleReference }[];
    pendingApprovers?: { associateRole: ApprovalRoleReference }[];
    currentTierPendingApprovers?: { associateRole: ApprovalRoleReference }[];
};

export type ApprovalResult<T> =
    | ({ success: true } & T)
    | { success: false; error: string; statusCode?: number };

export type ApprovalRuleDraftInput = {
    name: string;
    description?: string;
    status: 'Active' | 'Inactive';
    requesterRoleKeys: string[];
    conditions: ApprovalCondition[];
    conditionOperator: 'and' | 'or';
    tiers: { operator: 'and' | 'or'; roleKeys: string[] }[];
};

type ApprovalContext = {
    customerId: string;
    businessUnit: BusinessUnit;
    roleKeys: Set<string>;
    permissions: Set<string>;
};

type ApiError = {
    statusCode?: number;
    message?: string;
    body?: { message?: string; errors?: { message?: string }[] };
};

const PROJECT_KEY = process.env.CT_PROJECT_KEY;
const MAX_PAGE_SIZE = 100;
const MAX_APPROVAL_TIERS = 5;

function failure(error: unknown, fallback: string): ApprovalResult<never> {
    const apiError = error as ApiError;
    const statusCode = apiError?.statusCode;
    const message = apiError?.body?.message ?? apiError?.body?.errors?.[0]?.message;

    if (statusCode === 409) {
        return {
            success: false,
            statusCode,
            error: 'This approval resource changed. Refresh the page and try again.',
        };
    }

    if (statusCode === 401 || statusCode === 403) {
        return {
            success: false,
            statusCode,
            error: 'You are not authorized for this approval operation.',
        };
    }

    return {
        success: false,
        ...(statusCode && { statusCode }),
        error: message || fallback,
    };
}

async function getApprovalContext(unitKey: string): Promise<
    ApprovalResult<ApprovalContext>
> {
    if (typeof unitKey !== 'string' || !unitKey || unitKey.length > 256) {
        return { success: false, error: 'A valid Business Unit is required.', statusCode: 400 };
    }

    const customerId = await getSession();
    if (!customerId) {
        return { success: false, error: 'Authentication required.', statusCode: 401 };
    }

    const unitsResult = await getMyBusinessUnits();
    if (!unitsResult.success) {
        return {
            success: false,
            error: unitsResult.error,
            statusCode: unitsResult.statusCode,
        };
    }

    const businessUnit = unitsResult.businessUnits.find((unit) => unit.key === unitKey);
    if (!businessUnit) {
        return {
            success: false,
            error: 'This Business Unit is not accessible to your account.',
            statusCode: 403,
        };
    }

    try {
        const roleAssignments = [
            ...(businessUnit.associates ?? []),
            ...(businessUnit.associateMode === 'ExplicitAndFromParent'
                ? businessUnit.inheritedAssociates ?? []
                : []),
        ];
        const roleKeys = new Set(
            roleAssignments
                .filter((associate) => associate.customer.id === customerId)
                .flatMap((associate) =>
                    associate.associateRoleAssignments.map(
                        (assignment) => assignment.associateRole.key,
                    ),
                ),
        );
        const roles = await getAssociateRoles();
        const permissions = new Set(
            roles
                .filter((role) => roleKeys.has(role.key))
                .flatMap((role) => role.permissions),
        );

        return { success: true, customerId, businessUnit, roleKeys, permissions };
    } catch (error) {
        return failure(error, 'Could not load your Business Unit permissions.');
    }
}

function getResourcePath(
    unitKey: string,
    customerId: string,
    resource: 'approval-rules' | 'approval-flows',
) {
    if (!PROJECT_KEY) {
        throw new Error('CT_PROJECT_KEY is not configured.');
    }

    return `/${encodeURIComponent(PROJECT_KEY)}/as-associate/${encodeURIComponent(
        customerId,
    )}/in-business-unit/key=${encodeURIComponent(unitKey)}/${resource}`;
}

async function requestApprovalApi<T extends object>(
    unitKey: string,
    customerId: string,
    resource: 'approval-rules' | 'approval-flows',
    suffix = '',
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>,
): Promise<T> {
    if (!PROJECT_KEY) {
        throw new Error('CT_PROJECT_KEY is not configured.');
    }

    const path = getResourcePath(unitKey, customerId, resource);
    const response = await associateClient.execute<T>({
        uri: `${path}${suffix}`,
        method,
        ...(body && { body }),
    });

    if (!response.body) {
        throw new Error('The commercetools approval API returned an empty response.');
    }
    return response.body;
}

function isFlowApprover(context: ApprovalContext) {
    return context.permissions.has('UpdateApprovalFlows');
}

export async function getApprovalRules(
    unitKey: string,
): Promise<
    ApprovalResult<{
        rules: ApprovalRule[];
        canCreateRules: boolean;
        canUpdateRules: boolean;
    }>
> {
    const context = await getApprovalContext(unitKey);
    if (!context.success) return context;

    try {
        const rules: ApprovalRule[] = [];
        let offset = 0;
        let total = 0;

        do {
            const response = await requestApprovalApi<{
                results: ApprovalRule[];
                total: number;
                limit: number;
                offset: number;
            }>(
                unitKey,
                context.customerId,
                'approval-rules',
                `?limit=${MAX_PAGE_SIZE}&offset=${offset}`,
            );
            if (response.limit < 1) {
                throw new Error('Invalid Approval Rules pagination limit.');
            }

            if (response.results.length === 0) {
                if (response.total === 0 || offset >= response.total) {
                    break;
                }

                throw new Error(
                    'Approval Rules pagination stopped before all results were loaded.'
                );
            }
            rules.push(...response.results);
            total = response.total;
            offset += response.limit;
        } while (offset < total);

        return {
            success: true,
            rules,
            canCreateRules: context.permissions.has('CreateApprovalRules'),
            canUpdateRules: context.permissions.has('UpdateApprovalRules'),
        };
    } catch (error) {
        return failure(error, 'Could not load Approval Rules.');
    }
}

export async function getApprovalRule(
    unitKey: string,
    id: string,
): Promise<ApprovalResult<{ rule: ApprovalRule }>> {
    const context = await getApprovalContext(unitKey);
    if (!context.success) return context;
    if (typeof id !== 'string' || !id || id.length > 128) {
        return { success: false, error: 'A valid Approval Rule ID is required.', statusCode: 400 };
    }

    try {
        const rule = await requestApprovalApi<ApprovalRule>(
            unitKey,
            context.customerId,
            'approval-rules',
            `/${encodeURIComponent(id)}`,
        );
        return { success: true, rule };
    } catch (error) {
        console.error('[Approval Rules] Failed:', {
            statusCode: (error as ApiError)?.statusCode,
            message: (error as Error)?.message,
            apiMessage: (error as ApiError)?.body?.message,
        });

        return failure(error, 'Could not load Approval Rules.');
    }
}

function isTier(value: unknown): value is ApprovalRuleDraftInput['tiers'][number] {
    if (!value || typeof value !== 'object') return false;
    const tier = value as Partial<ApprovalRuleDraftInput['tiers'][number]>;
    return (
        (tier.operator === 'and' || tier.operator === 'or') &&
        Array.isArray(tier.roleKeys) &&
        tier.roleKeys.length > 0 &&
        tier.roleKeys.length <= 10 &&
        tier.roleKeys.every((key) => typeof key === 'string' && key.length > 0)
    );
}

function isRuleDraftInput(value: unknown): value is ApprovalRuleDraftInput {
    if (!value || typeof value !== 'object') return false;
    const input = value as Partial<ApprovalRuleDraftInput>;
    return (
        typeof input.name === 'string' &&
        (input.description === undefined || typeof input.description === 'string') &&
        (input.status === 'Active' || input.status === 'Inactive') &&
        (input.conditionOperator === 'and' || input.conditionOperator === 'or') &&
        Array.isArray(input.requesterRoleKeys) &&
        input.requesterRoleKeys.every((key) => typeof key === 'string' && key.length > 0) &&
        Array.isArray(input.conditions) &&
        input.conditions.every(isValidApprovalCondition) &&
        Array.isArray(input.tiers) &&
        input.tiers.every(isTier)
    );
}

export async function createApprovalRule(
    unitKey: string,
    input: ApprovalRuleDraftInput,
): Promise<ApprovalResult<{ rule: ApprovalRule }>> {
    const context = await getApprovalContext(unitKey);
    if (!context.success) return context;
    if (!context.permissions.has('CreateApprovalRules')) {
        return { success: false, error: 'CreateApprovalRules permission is required.', statusCode: 403 };
    }
    if (!isRuleDraftInput(input)) {
        return { success: false, error: 'Invalid Approval Rule data.', statusCode: 400 };
    }

    const name = input.name.trim();
    const description = input.description?.trim();
    if (!name || name.length > 256) {
        return { success: false, error: 'Rule name must be between 1 and 256 characters.', statusCode: 400 };
    }
    if (description && description.length > 2000) {
        return { success: false, error: 'Description must be 2000 characters or fewer.', statusCode: 400 };
    }
    if (
        input.requesterRoleKeys.length === 0 ||
        input.conditions.length === 0 ||
        input.conditions.length > 10 ||
        input.tiers.length === 0 ||
        input.tiers.length > MAX_APPROVAL_TIERS ||
        !input.tiers.every(isTier)
    ) {
        return {
            success: false,
            error: 'Choose requester roles, valid conditions, and between one and five approver tiers.',
            statusCode: 400,
        };
    }

    try {
        const roleKeys = new Set((await getAssociateRoles()).map((role) => role.key));
        const selectedRoleKeys = [
            ...input.requesterRoleKeys,
            ...input.tiers.flatMap((tier) => tier.roleKeys),
        ];
        if (selectedRoleKeys.some((key) => !roleKeys.has(key))) {
            return { success: false, error: 'A selected Associate Role is no longer available.', statusCode: 400 };
        }

        const rule = await requestApprovalApi<ApprovalRule>(
            unitKey,
            context.customerId,
            'approval-rules',
            '',
            'POST',
            {
                name,
                ...(description && { description }),
                status: input.status,
                predicate: buildApprovalPredicate(input.conditions, input.conditionOperator),
                requesters: input.requesterRoleKeys.map((key) => ({
                    associateRole: { typeId: 'associate-role', key },
                })),
                approvers: {
                    tiers: input.tiers.map((tier) => ({
                        and:
                            tier.operator === 'and'
                                ? tier.roleKeys.map((key) => ({
                                      or: [{ associateRole: { typeId: 'associate-role', key } }],
                                  }))
                                : [
                                      {
                                          or: tier.roleKeys.map((key) => ({
                                              associateRole: { typeId: 'associate-role', key },
                                          })),
                                      },
                                  ],
                    })),
                },
                businessUnit: { typeId: 'business-unit', key: unitKey },
            },
        );
        return { success: true, rule };
    } catch (error) {
        return failure(error, 'Could not create the Approval Rule.');
    }
}

export async function updateApprovalRuleStatus(
    unitKey: string,
    id: string,
    version: number,
    status: 'Active' | 'Inactive',
): Promise<ApprovalResult<{ rule: ApprovalRule }>> {
    const context = await getApprovalContext(unitKey);
    if (!context.success) return context;
    if (!context.permissions.has('UpdateApprovalRules')) {
        return { success: false, error: 'UpdateApprovalRules permission is required.', statusCode: 403 };
    }
    if (
        typeof id !== 'string' ||
        !id ||
        id.length > 128 ||
        !Number.isInteger(version) ||
        version < 1
    ) {
        return { success: false, error: 'Invalid Approval Rule update.', statusCode: 400 };
    }
    if (status !== 'Active' && status !== 'Inactive') {
        return { success: false, error: 'Invalid Approval Rule status.', statusCode: 400 };
    }

    try {
        const rule = await requestApprovalApi<ApprovalRule>(
            unitKey,
            context.customerId,
            'approval-rules',
            `/${encodeURIComponent(id)}`,
            'POST',
            { version, actions: [{ action: 'setStatus', status }] },
        );
        return { success: true, rule };
    } catch (error) {
        return failure(error, 'Could not update the Approval Rule status.');
    }
}

export async function getApprovalFlows(
    unitKey: string,
    status?: 'Pending' | 'Approved' | 'Rejected',
    offset = 0,
): Promise<
    ApprovalResult<{
        flows: ApprovalFlow[];
        total: number;
        offset: number;
        limit: number;
        roleKeys: string[];
        canApprove: boolean;
    }>
> {
    const context = await getApprovalContext(unitKey);
    if (!context.success) return context;
    if (
        (status !== undefined && !['Pending', 'Approved', 'Rejected'].includes(status)) ||
        !Number.isInteger(offset) ||
        offset < 0
    ) {
        return { success: false, error: 'Invalid Approval Flow page.', statusCode: 400 };
    }

    const query = new URLSearchParams({
        limit: String(MAX_PAGE_SIZE),
        offset: String(offset),
        expand: 'order',
        sort: 'createdAt desc',
    });
    query.append('expand', 'rules[*]');
    if (status) query.set('where', `status="${status}"`);

    try {
        const response = await requestApprovalApi<{
            results: ApprovalFlow[];
            total: number;
            offset: number;
            limit: number;
        }>(unitKey, context.customerId, 'approval-flows', `?${query.toString()}`);

        return {
            success: true,
            flows: response.results,
            total: response.total,
            offset: response.offset,
            limit: response.limit,
            roleKeys: [...context.roleKeys],
            canApprove: isFlowApprover(context),
        };
    } catch (error) {
        return failure(error, 'Could not load Approval Flows.');
    }
}

export async function getApprovalFlow(
    unitKey: string,
    id: string,
): Promise<ApprovalResult<{ flow: ApprovalFlow; roleKeys: string[]; canApprove: boolean }>> {
    const context = await getApprovalContext(unitKey);
    if (!context.success) return context;
    if (typeof id !== 'string' || !id || id.length > 128) {
        return { success: false, error: 'A valid Approval Flow ID is required.', statusCode: 400 };
    }

    try {
        const query = new URLSearchParams();
        query.append('expand', 'order');
        query.append('expand', 'rules[*]');
        const flow = await requestApprovalApi<ApprovalFlow>(
            unitKey,
            context.customerId,
            'approval-flows',
            `/${encodeURIComponent(id)}?${query.toString()}`,
        );
        return {
            success: true,
            flow,
            roleKeys: [...context.roleKeys],
            canApprove: isFlowApprover(context),
        };
    } catch (error) {
        return failure(error, 'Could not load the Approval Flow.');
    }
}

export async function decideApprovalFlow(
    unitKey: string,
    id: string,
    action: 'approve' | 'reject',
    reason?: string,
): Promise<ApprovalResult<{ flow: ApprovalFlow }>> {
    const context = await getApprovalContext(unitKey);
    if (!context.success) return context;
    if (!isFlowApprover(context)) {
        return { success: false, error: 'UpdateApprovalFlows permission is required.', statusCode: 403 };
    }
    if (
        typeof id !== 'string' ||
        !id ||
        id.length > 128 ||
        (action !== 'approve' && action !== 'reject') ||
        (reason !== undefined && typeof reason !== 'string')
    ) {
        return { success: false, error: 'Invalid Approval Flow decision.', statusCode: 400 };
    }
    const rejectionReason = reason?.trim();
    if (rejectionReason && rejectionReason.length > 500) {
        return { success: false, error: 'Rejection reason must be 500 characters or fewer.', statusCode: 400 };
    }

    try {
        const currentFlow = await requestApprovalApi<ApprovalFlow>(
            unitKey,
            context.customerId,
            'approval-flows',
            `/${encodeURIComponent(id)}`,
        );
        const isEligible = (currentFlow.eligibleApprovers ?? []).some((approver) =>
            context.roleKeys.has(approver.associateRole.key),
        );
        if (currentFlow.status !== 'Pending' || !isEligible) {
            return {
                success: false,
                error: 'This flow is no longer pending or your roles are not eligible to decide it.',
                statusCode: 403,
            };
        }

        const flow = await requestApprovalApi<ApprovalFlow>(
            unitKey,
            context.customerId,
            'approval-flows',
            `/${encodeURIComponent(id)}`,
            'POST',
            {
                version: currentFlow.version,
                actions: [
                    action === 'approve'
                        ? { action: 'approve' }
                        : {
                              action: 'reject',
                              ...(rejectionReason && { reason: rejectionReason }),
                          },
                ],
            },
        );
        return { success: true, flow };
    } catch (error) {
        return failure(error, 'Could not submit the Approval Flow decision.');
    }
}

export async function getApprovalBusinessUnits() {
    return getMyBusinessUnits();
}

export async function getApprovalRoles(unitKey: string) {
    const context = await getApprovalContext(unitKey);
    if (!context.success) return context;

    try {
        const roles = await getAssociateRoles();
        return {
            success: true as const,
            roles: roles.map(({ key, name }) => ({ key, name: name ?? key })),
        };
    } catch (error) {
        return failure(error, 'Could not load Associate Roles.');
    }
}
