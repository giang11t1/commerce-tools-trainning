export type CheckoutSession = {
    id: string;
    projectKey: string;
    region: string;
};

export type MockOrderRequest = {
    email?: string;
    shippingMethod: string;
    shippingAddress: MockOrderAddress;
    billingAddress: MockOrderAddress;
};

export type MockOrderAddress = {
        firstName?: string;
        lastName?: string;
        company?: string;
        streetName?: string;
        streetNumber?: string;
        additionalStreetInfo?: string;
        city?: string;
        postalCode?: string;
        state?: string;
        region?: string;
        country?: string;
        phone?: string;
};

export async function createMockOrder(
    input: MockOrderRequest,
): Promise<{ orderId: string; created: boolean }> {
    const response = await fetch('/api/checkout/mock-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error || 'Unable to place your order.');
    }

    if (typeof data.orderId !== 'string' || typeof data.created !== 'boolean') {
        throw new Error('The order service returned an invalid response.');
    }

    return { orderId: data.orderId, created: data.created };
}

export async function createCheckoutSessionForCart(
    locale = 'en-US',
): Promise<CheckoutSession> {
    const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error || 'Failed to create Checkout session'
        );
    }

    if (!data.sessionId || !data.projectKey || !data.region) {
        throw new Error('Invalid Checkout session');
    }

    return {
        id: data.sessionId as string,
        projectKey: data.projectKey as string,
        region: data.region as string,
    };
}
