'use server';

import { apiRoot } from './commercetools';

type ConfiguredPaymentMethod = {
    id: string;
    name: string;
    enabled?: boolean;
};

function isConfiguredPaymentMethod(
    value: unknown,
): value is ConfiguredPaymentMethod {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }

    const method = value as Record<string, unknown>;
    return (
        typeof method.id === 'string' &&
        typeof method.name === 'string' &&
        (method.enabled === undefined || typeof method.enabled === 'boolean')
    );
}

export async function getConfiguredPaymentMethods() {
    const availableInEnvironment = (methods: ConfiguredPaymentMethod[]) =>
        process.env.NODE_ENV === 'production'
            ? methods.filter((method) => method.id !== 'credit_card_sample')
            : methods;

    try {
        const response = await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .customObjects()
            .withContainer({
                container: 'payment-settings',
            })
            .get()
            .execute();

        if (response.body.results.length > 0) {
            return availableInEnvironment(response.body.results
                .map((obj) => obj.value as unknown)
                .filter(isConfiguredPaymentMethod)
                .filter(
                    (method) => method.enabled !== false,
                ));
        }

        return availableInEnvironment(getDefaultPaymentMethods());
    } catch (error) {
        console.error(
            'Error fetching configured payment methods:',
            error
        );

        return availableInEnvironment(getDefaultPaymentMethods());
    }
}

function getDefaultPaymentMethods() {
    return [
        {
            id: 'credit_card',
            name: 'Credit Card',
            enabled: true,
        },
        {
            id: 'paypal',
            name: 'PayPal',
            enabled: true,
        },
        {
            id: 'credit_card_sample',
            name: 'Sample Credit Card',
            enabled: true,
        },
    ];
}
