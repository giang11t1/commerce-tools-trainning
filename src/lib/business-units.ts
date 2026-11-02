'use server';

import type {
    BaseAddress,
    BusinessUnit,
    BusinessUnitUpdateAction,
} from '@commercetools/platform-sdk';
import { apiRoot, associateApiRoot } from './commercetools';
import { getSession } from './auth';

const projectKey = process.env.CT_PROJECT_KEY || '';

export type BusinessUnitResult<T> =
    | ({ success: true } & T)
    | { success: false; error: string };

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === 'object') {
        const body = (error as { body?: { message?: string } }).body;

        if (body?.message) {
            return body.message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

/**
 * Business units are accessed through the As Associate API, so commercetools checks the
 * logged-in customer's Associate Roles (e.g. UpdateBusinessUnitDetails) on every request.
 */
function asAssociate(customerId: string) {
    return associateApiRoot
        .withProjectKey({ projectKey })
        .asAssociate()
        .withAssociateIdValue({ associateId: customerId });
}

export async function getMyBusinessUnits(): Promise<BusinessUnitResult<{ businessUnits: BusinessUnit[] }>> {
    const customerId = await getSession();

    if (!customerId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const response = await asAssociate(customerId)
            .businessUnits()
            .get({ queryArgs: { limit: 100, sort: 'name asc' } })
            .execute();

        return { success: true, businessUnits: response.body.results };
    } catch (error: unknown) {
        console.error('Error fetching business units:', error);

        return {
            success: false,
            error: getErrorMessage(error, 'Failed to fetch company information'),
        };
    }
}

export async function getMyBusinessUnit(key: string): Promise<BusinessUnitResult<{ businessUnit: BusinessUnit }>> {
    const customerId = await getSession();

    if (!customerId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const response = await asAssociate(customerId)
            .businessUnits()
            .withKey({ key })
            .get()
            .execute();

        return { success: true, businessUnit: response.body };
    } catch (error: unknown) {
        console.error('Error fetching business unit:', error);

        return {
            success: false,
            error: getErrorMessage(error, 'Failed to fetch company information'),
        };
    }
}

export interface AssociateContact {
    name: string;
    email: string;
}

/** Names/emails of the unit's associates, keyed by customer ID. */
export async function getAssociateContacts(key: string): Promise<Record<string, AssociateContact>> {
    // Reading the unit as the associate first ensures the customer can see this company.
    const result = await getMyBusinessUnit(key);

    if (!result.success) {
        return {};
    }

    const ids = result.businessUnit.associates.map((associate) => associate.customer.id);

    if (ids.length === 0) {
        return {};
    }

    try {
        const response = await apiRoot
            .withProjectKey({ projectKey })
            .customers()
            .get({
                queryArgs: {
                    where: `id in (${ids.map((id) => `"${id}"`).join(', ')})`,
                    limit: ids.length,
                },
            })
            .execute();

        return Object.fromEntries(
            response.body.results.map((customer) => [
                customer.id,
                {
                    name: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
                    email: customer.email,
                },
            ]),
        );
    } catch (error: unknown) {
        console.error('Error fetching business unit associates:', error);

        return {};
    }
}

async function updateMyBusinessUnit(
    key: string,
    buildActions: (businessUnit: BusinessUnit) => BusinessUnitUpdateAction[],
): Promise<BusinessUnitResult<{ businessUnit: BusinessUnit }>> {
    const customerId = await getSession();

    if (!customerId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const businessUnits = asAssociate(customerId).businessUnits().withKey({ key });
        const current = (await businessUnits.get().execute()).body;
        const actions = buildActions(current);

        if (actions.length === 0) {
            return { success: true, businessUnit: current };
        }

        const response = await businessUnits
            .post({ body: { version: current.version, actions } })
            .execute();

        return { success: true, businessUnit: response.body };
    } catch (error: unknown) {
        console.error('Error updating business unit:', error);

        return {
            success: false,
            error: getErrorMessage(error, 'Failed to update company information'),
        };
    }
}

export async function updateBusinessUnitDetails(
    key: string,
    { name, contactEmail }: { name: string; contactEmail: string },
) {
    return updateMyBusinessUnit(key, (businessUnit) => {
        const actions: BusinessUnitUpdateAction[] = [];

        if (name !== businessUnit.name) {
            actions.push({ action: 'changeName', name });
        }

        if (contactEmail !== (businessUnit.contactEmail ?? '')) {
            actions.push({ action: 'setContactEmail', ...(contactEmail && { contactEmail }) });
        }

        return actions;
    });
}

function defaultAddressActions(
    businessUnit: BusinessUnit,
    addressId: string | undefined,
    addressKey: string | undefined,
    { isShipping, isBilling }: { isShipping: boolean; isBilling: boolean },
) {
    const ref = addressId ? { addressId } : { addressKey };
    const actions: BusinessUnitUpdateAction[] = [];

    if (isShipping) {
        if (addressId && !businessUnit.shippingAddressIds?.includes(addressId)) {
            actions.push({ action: 'addShippingAddressId', addressId });
        } else if (!addressId) {
            actions.push({ action: 'addShippingAddressId', addressKey });
        }

        if (!addressId || businessUnit.defaultShippingAddressId !== addressId) {
            actions.push({ action: 'setDefaultShippingAddress', ...ref });
        }
    } else if (addressId && businessUnit.defaultShippingAddressId === addressId) {
        actions.push({ action: 'setDefaultShippingAddress' });
    }

    if (isBilling) {
        if (addressId && !businessUnit.billingAddressIds?.includes(addressId)) {
            actions.push({ action: 'addBillingAddressId', addressId });
        } else if (!addressId) {
            actions.push({ action: 'addBillingAddressId', addressKey });
        }

        if (!addressId || businessUnit.defaultBillingAddressId !== addressId) {
            actions.push({ action: 'setDefaultBillingAddress', ...ref });
        }
    } else if (addressId && businessUnit.defaultBillingAddressId === addressId) {
        actions.push({ action: 'setDefaultBillingAddress' });
    }

    return actions;
}

export async function addBusinessUnitAddress(
    key: string,
    address: BaseAddress,
    defaults: { isShipping: boolean; isBilling: boolean },
) {
    // A generated key lets the default-address actions reference the new address in the same request.
    const addressKey = `addr-${crypto.randomUUID()}`;

    return updateMyBusinessUnit(key, (businessUnit) => [
        { action: 'addAddress', address: { ...address, key: addressKey } },
        ...defaultAddressActions(businessUnit, undefined, addressKey, defaults),
    ]);
}

export async function updateBusinessUnitAddress(
    key: string,
    addressId: string,
    address: BaseAddress,
    defaults: { isShipping: boolean; isBilling: boolean },
) {
    return updateMyBusinessUnit(key, (businessUnit) => {
        const existing = businessUnit.addresses.find((item) => item.id === addressId);

        if (!existing) {
            throw new Error('Address not found');
        }

        return [
            { action: 'changeAddress', addressId, address: { ...address, key: existing.key } },
            ...defaultAddressActions(businessUnit, addressId, undefined, defaults),
        ];
    });
}

export async function removeBusinessUnitAddress(key: string, addressId: string) {
    return updateMyBusinessUnit(key, (businessUnit) => {
        if (
            businessUnit.defaultShippingAddressId === addressId ||
            businessUnit.defaultBillingAddressId === addressId
        ) {
            throw new Error(
                'This address is the default shipping or billing address. Choose another default before deleting it.',
            );
        }

        return [{ action: 'removeAddress', addressId }];
    });
}
