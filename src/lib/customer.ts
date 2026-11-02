'use server';

import { apiRoot } from './commercetools';
import { cookies } from 'next/headers';

const projectKey = process.env.CT_PROJECT_KEY || '';

function getCommercetoolsErrorDetails(error: unknown) {
    const apiError = error as {
        statusCode?: number;
        body?: { errors?: { code?: string }[] };
    } | null;
    const errorCode = apiError?.body?.errors?.[0]?.code;

    return {
        statusCode: apiError?.statusCode,
        errorCode,
        isInvalidCredentials: errorCode === 'InvalidCredentials',
    };
}

/**
 * Store keys of the store-scoped customers registered with this email.
 * Global customers (no stores) are skipped: they log in via the global endpoint.
 */
async function getStoreKeysForEmail(email: string) {
    const escaped = email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const response = await apiRoot
        .withProjectKey({ projectKey })
        .customers()
        .get({ queryArgs: { where: `email="${escaped}"`, limit: 20 } })
        .execute();

    const storeKeys = response.body.results.flatMap(
        (customer) => customer.stores?.map((store) => store.key) ?? []
    );
    return [...new Set(storeKeys)];
}

/**
 * Customers created in the Merchant Center are usually assigned to a Store.
 * Store-scoped customers are invisible to the global /login endpoint, so
 * when it rejects the credentials we retry against each of the customer's
 * stores via /in-store/key={storeKey}/login.
 */
export async function loginCustomer(email: string, password: string) {
    console.info('commercetools customer login received', {
        projectKey,
        endpoint: 'project login',
    });

    try {
        const response = await apiRoot
            .withProjectKey({ projectKey })
            .login()
            .post({ body: { email, password } })
            .execute();

        console.info('commercetools customer login succeeded', {
            projectKey,
            endpoint: 'project login',
            customerId: response.body.customer.id,
        });

        return {
            success: true,
            customer: response.body.customer,
            storeKey: undefined as string | undefined,
        };
    } catch (error: unknown) {
        const errorDetails = getCommercetoolsErrorDetails(error);
        console.warn('commercetools customer login failed', {
            projectKey,
            endpoint: 'project login',
            statusCode: errorDetails.statusCode,
            errorCode: errorDetails.errorCode,
        });

        if (!errorDetails.isInvalidCredentials) {
            return { success: false, error: 'Unable to sign in. Please try again.' };
        }

        let lastErrorDetails = errorDetails;
        let storeLookupFailed = false;
        try {
            const storeKeys = await getStoreKeysForEmail(email);
            console.info('commercetools store customer login lookup completed', {
                projectKey,
                storeCount: storeKeys.length,
            });

            for (const storeKey of storeKeys) {
                console.info('commercetools customer login attempting store endpoint', {
                    projectKey,
                    storeKey,
                });
                try {
                    const response = await apiRoot
                        .withProjectKey({ projectKey })
                        .inStoreKeyWithStoreKeyValue({ storeKey })
                        .login()
                        .post({ body: { email, password } })
                        .execute();

                    console.info('commercetools customer login succeeded', {
                        projectKey,
                        endpoint: 'store login',
                        storeKey,
                        customerId: response.body.customer.id,
                    });

                    return {
                        success: true,
                        customer: response.body.customer,
                        storeKey,
                    };
                } catch (storeError) {
                    lastErrorDetails = getCommercetoolsErrorDetails(storeError);
                    console.warn('commercetools customer store login failed', {
                        projectKey,
                        endpoint: 'store login',
                        storeKey,
                        statusCode: lastErrorDetails.statusCode,
                        errorCode: lastErrorDetails.errorCode,
                    });
                }
            }
        } catch {
            storeLookupFailed = true;
            console.error('commercetools customer store lookup failed', { projectKey });
        }

        return {
            success: false,
            error: lastErrorDetails.isInvalidCredentials && !storeLookupFailed
                ? 'Email or password is incorrect.'
                : 'Unable to sign in. Please try again.',
        };
    }
}

export async function getCustomerById(id: string) {
    try {
        const response = await apiRoot
            .withProjectKey({ projectKey })
            .customers()
            .withId({ ID: id })
            .get()
            .execute();

        return response.body;
    } catch (error) {
        console.error('Error fetching customer:', error);
        return null;
    }
}

export async function getCustomerForPricing(id: string) {
    const cookieStore = await cookies();
    const sessionCustomerId = cookieStore.get('ct_customer_id')?.value;
    const storeKey = cookieStore.get('ct_customer_store_key')?.value;
    const project = apiRoot.withProjectKey({ projectKey });

    if (sessionCustomerId === id && storeKey) {
        const response = await project
            .inStoreKeyWithStoreKeyValue({ storeKey })
            .customers()
            .withId({ ID: id })
            .get()
            .execute();

        return response.body;
    }

    const response = await project
        .customers()
        .withId({ ID: id })
        .get()
        .execute();

    return response.body;
}


export async function setDefaultAddresses(
    customerId: string,
    addressId: string
) {
    try {
        const customer = await getCustomerById(customerId);

        if (!customer) {
            return {
                success: false,
                error: 'Customer not found',
            };
        }

        const response = await apiRoot
            .withProjectKey({ projectKey })
            .customers()
            .withId({ ID: customerId })
            .post({
                body: {
                    version: customer.version,
                    actions: [
                        {
                            action: 'setDefaultBillingAddress',
                            addressId,
                        },
                        {
                            action: 'setDefaultShippingAddress',
                            addressId,
                        },
                    ],
                },
            })
            .execute();

        return {
            success: true,
            customer: response.body,
        };
    } catch (error) {
        console.error('Error setting default addresses:', error);

        return {
            success: false,
            error: 'Failed to set default addresses',
        };
    }
}


export async function addCustomerAddress(
    customerId: string,
    address: {
        firstName?: string;
        lastName?: string;
        company?: string;
        streetName: string;
        streetNumber?: string;
        additionalStreetInfo?: string;
        postalCode: string;
        city: string;
        region?: string;
        state?: string;
        country: string;
        phone?: string;
        email?: string;
    },
    options: {
        isBilling: boolean;
        isShipping: boolean;
    }
) {
    try {
        // 1. Get current customer
        const customer = await getCustomerById(customerId);

        if (!customer) {
            return {
                success: false,
                error: 'Customer not found',
            };
        }

        // 2. Add address first
        const addResponse = await apiRoot
            .withProjectKey({ projectKey })
            .customers()
            .withId({ ID: customerId })
            .post({
                body: {
                    version: customer.version,
                    actions: [
                        {
                            action: 'addAddress',
                            address,
                        },
                    ],
                },
            })
            .execute();

        const updatedCustomer = addResponse.body;

        // Find the newly added address.
        const newAddress = updatedCustomer.addresses.find(
            (item) =>
                item.streetName === address.streetName &&
                item.city === address.city &&
                item.postalCode === address.postalCode
        );

        if (!newAddress?.id) {
            return {
                success: false,
                error: 'Address was created but address ID could not be found',
            };
        }

        // 3. Build default address actions
        const defaultActions = [];

        if (options.isBilling) {
            defaultActions.push({
                action: 'setDefaultBillingAddress' as const,
                addressId: newAddress.id,
            });
        }

        if (options.isShipping) {
            defaultActions.push({
                action: 'setDefaultShippingAddress' as const,
                addressId: newAddress.id,
            });
        }

        // 4. Set Billing / Shipping
        if (defaultActions.length > 0) {
            await apiRoot
                .withProjectKey({ projectKey })
                .customers()
                .withId({ ID: customerId })
                .post({
                    body: {
                        version: updatedCustomer.version,
                        actions: defaultActions,
                    },
                })
                .execute();
        }

        return {
            success: true,
            addressId: newAddress.id,
        };
    } catch (error: any) {
        console.error(
            'Error adding customer address:',
            error?.body || error
        );

        return {
            success: false,
            error:
                error?.body?.message ||
                error?.message ||
                'Failed to add address',
        };
    }
}


export async function updateCustomerAddress(
    customerId: string,
    addressId: string,
    address: {
        firstName?: string;
        lastName?: string;
        company?: string;
        streetName: string;
        streetNumber?: string;
        additionalStreetInfo?: string;
        postalCode: string;
        city: string;
        region?: string;
        state?: string;
        country: string;
        phone?: string;
        email?: string;
    },
    options: {
        isBilling: boolean;
        isShipping: boolean;
    }
) {
    try {
        const customer = await getCustomerById(customerId);

        if (!customer) {
            return {
                success: false,
                error: 'Customer not found',
            };
        }

        const existingAddress = customer.addresses.find(
            (item) => item.id === addressId
        );

        if (!existingAddress) {
            return {
                success: false,
                error: 'Address not found',
            };
        }

        // Update address
        const updateResponse = await apiRoot
            .withProjectKey({ projectKey })
            .customers()
            .withId({ ID: customerId })
            .post({
                body: {
                    version: customer.version,
                    actions: [
                        {
                            action: 'changeAddress',
                            addressId,
                            address,
                        },
                    ],
                },
            })
            .execute();

        const updatedCustomer = updateResponse.body;

        // Update default Billing / Shipping
        const defaultActions = [];

        if (options.isBilling) {
            defaultActions.push({
                action: 'setDefaultBillingAddress' as const,
                addressId,
            });
        }

        if (options.isShipping) {
            defaultActions.push({
                action: 'setDefaultShippingAddress' as const,
                addressId,
            });
        }

        if (defaultActions.length > 0) {
            await apiRoot
                .withProjectKey({ projectKey })
                .customers()
                .withId({ ID: customerId })
                .post({
                    body: {
                        version: updatedCustomer.version,
                        actions: defaultActions,
                    },
                })
                .execute();
        }

        return {
            success: true,
            addressId,
        };
    } catch (error: any) {
        console.error('Error updating customer address:', {
            message: error?.message,
            body: error?.body,
            statusCode: error?.statusCode,
            errors: error?.body?.errors,
        });

        return {
            success: false,
            error:
                error?.body?.message ||
                error?.message ||
                'Failed to update address',
        };
    }
}


export async function deleteCustomerAddress(
    customerId: string,
    addressId: string
) {
    try {
        const customer = await getCustomerById(customerId);

        if (!customer) {
            return {
                success: false,
                error: 'Customer not found',
            };
        }

        const addressExists = customer.addresses.some(
            (address) => address.id === addressId
        );

        if (!addressExists) {
            return {
                success: false,
                error: 'Address not found',
            };
        }

        const response = await apiRoot
            .withProjectKey({ projectKey })
            .customers()
            .withId({ ID: customerId })
            .post({
                body: {
                    version: customer.version,
                    actions: [
                        {
                            action: 'removeAddress',
                            addressId,
                        },
                    ],
                },
            })
            .execute();

        return {
            success: true,
            customer: response.body,
        };
    } catch (error: any) {
        console.error('Error deleting customer address:', {
            message: error?.message,
            body: error?.body,
            statusCode: error?.statusCode,
            errors: error?.body?.errors,
        });

        return {
            success: false,
            error:
                error?.body?.message ||
                error?.message ||
                'Failed to delete address',
        };
    }
}


export async function getDefaultShippingAddress(customerId: string) {
    try {
        const customer = await getCustomerById(customerId);

        if (!customer) {
            return null;
        }

        const addressId = customer.defaultShippingAddressId;

        if (!addressId) {
            return null;
        }

        return (
            customer.addresses.find(
                (address) => address.id === addressId
            ) || null
        );
    } catch (error) {
        console.error(
            'Error fetching default shipping address:',
            error
        );

        return null;
    }
}

export async function getDefaultBillingAddress(customerId: string) {
    try {
        const customer = await getCustomerById(customerId);

        if (!customer) {
            return null;
        }

        const addressId = customer.defaultBillingAddressId;

        if (!addressId) {
            return null;
        }

        return (
            customer.addresses.find(
                (address) => address.id === addressId
            ) || null
        );
    } catch (error) {
        console.error('Error fetching default billing address:', error);
        throw error;
    }
}

export async function getCustomerBusinessUnitInfo(customerId: string) {
    const customer = await getCustomerById(customerId);

    if (!customer) {
        throw new Error("Customer not found");
    }

    return {
        customerId: customer.id,
        email: customer.email,
        version: customer.version,
    };
}
