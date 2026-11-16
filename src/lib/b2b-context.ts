import 'server-only';

import { cookies } from 'next/headers';
import { getSession } from './auth';
import { getMyBusinessUnit } from './business-units';
import { associateApiRoot } from './commercetools';

export const BUSINESS_UNIT_COOKIE = 'ct_business_unit_key';

export async function requireBusinessUnit(key: string) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{2,256}$/.test(key)) {
        throw new Error('Select a valid Business Unit.');
    }
    const customerId = await getSession();
    if (!customerId) throw new Error('Sign in before selecting a Business Unit.');
    const result = await getMyBusinessUnit(key);
    if (!result.success) throw new Error(result.error);
    const unit = result.businessUnit;
    const associates = [
        ...(unit.associates ?? []),
        ...(unit.associateMode === 'ExplicitAndFromParent' ? unit.inheritedAssociates ?? [] : []),
    ];
    if (unit.status !== 'Active' || !associates.some((item) => item.customer.id === customerId)) {
        throw new Error('Your account is not an Associate of this active Business Unit.');
    }
    return { customerId, unit };
}

export async function getSelectedBusinessUnit() {
    const key = (await cookies()).get(BUSINESS_UNIT_COOKIE)?.value;
    return key ? requireBusinessUnit(key) : undefined;
}

export function associateInUnit(customerId: string, key: string) {
    return associateApiRoot
        .withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
        .asAssociate()
        .withAssociateIdValue({ associateId: customerId })
        .inBusinessUnitKeyWithBusinessUnitKeyValue({ businessUnitKey: key });
}
