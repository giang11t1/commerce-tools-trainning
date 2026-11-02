'use server';

import { apiRoot } from './commercetools';
import type {
    Address,
    Cart,
    CartUpdateAction,
    Order,
    ShippingMethod,
} from '@commercetools/platform-sdk';
import { getCommerceMarket } from '@/lib/commerce-market';
import { getCart, getCartSessionContext } from '@/lib/cart';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { isCommercetoolsNotFound } from '@/lib/cart-lifecycle';
import type {
    CheckoutFormData,
    CheckoutShippingOption,
} from '@/components/checkout/types';
import { getMockOrderErrorDetails } from '@/lib/mock-order-utils';
import type { MoneyValue } from '@/lib/checkout-utils';
import { areCheckoutAddressesEqual } from '@/lib/checkout-utils';

export async function createCheckoutSession(
    cartId: string,
    locale = 'en-US',
) {
    const projectKey = process.env.CT_PROJECT_KEY;
    const apiUrl = process.env.CT_API_URL;

    const authUrl = process.env.CT_AUTH_URL;
    const clientId = process.env.CT_CLIENT_ID;
    const clientSecret = process.env.CT_CLIENT_SECRET;
    const applicationKey = process.env.CTP_CHECKOUT_APP_KEY;
    const market = getCommerceMarket(locale);

    if (!projectKey) {
        throw new Error('CT_PROJECT_KEY is not configured');
    }

    if (!apiUrl) {
        throw new Error('CT_API_URL is not configured');
    }

    if (!authUrl) {
        throw new Error('CT_AUTH_URL is not configured');
    }

    if (!clientId || !clientSecret) {
        throw new Error('CT_CLIENT_ID / CT_CLIENT_SECRET are not configured');
    }

    if (!applicationKey) {
        throw new Error('CTP_CHECKOUT_APP_KEY is not configured');
    }

    if (!cartId) {
        throw new Error('cartId is required');
    }

    /*
     * Example:
     *
     * https://api.us-central1.gcp.commercetools.com
     *
     * -> us-central1.gcp
     */
    const regionMatch = apiUrl.match(
        /api\.(.*?)\.commercetools\.com/
    );

    const region = regionMatch?.[1];

    if (!region) {
        throw new Error(
            `Unable to determine commercetools region from CT_API_URL: ${apiUrl}`
        );
    }

    const sessionUrl =
        `https://session.${region}.commercetools.com/${projectKey}/sessions`;

    try {
        /*
         * ---------------------------------------------------------
         * 1. Get commercetools access token
         * ---------------------------------------------------------
         */

        const scopes =
            `manage_sessions:${projectKey} manage_orders:${projectKey}`;

        const tokenResponse = await fetch(
            `${authUrl}/oauth/token`,
            {
                method: 'POST',

                headers: {
                    Authorization:
                        `Basic ${Buffer.from(
                            `${clientId}:${clientSecret}`
                        ).toString('base64')}`,

                    'Content-Type':
                        'application/x-www-form-urlencoded',
                },

                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    scope: scopes,
                }),
            }
        );

        if (!tokenResponse.ok) {
            const errorText =
                await tokenResponse.text();

            throw new Error(
                `Failed to get access token: ${tokenResponse.status} ${errorText}`
            );
        }

        const tokenData =
            await tokenResponse.json();

        const accessToken =
            tokenData.access_token;

        if (!accessToken) {
            throw new Error(
                'No access_token returned from commercetools'
            );
        }

        /*
         * ---------------------------------------------------------
         * 2. Create Checkout Session
         * ---------------------------------------------------------
         */

        const sessionResponse = await fetch(
            sessionUrl,
            {
                method: 'POST',

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,

                    'Content-Type':
                        'application/json',
                },

                body: JSON.stringify({
                    cart: {
                        cartRef: {
                            id: cartId,
                        },
                    },

                    /*
                     * Use the Checkout Application key
                     * for the Checkout Session.
                     */
                    applicationKey,

                    locale: market.locale,
                }),
            }
        );

        if (!sessionResponse.ok) {
            const errorText =
                await sessionResponse.text();

            throw new Error(
                `Failed to create Checkout Session: ` +
                `${sessionResponse.status} ` +
                `${sessionResponse.statusText} ` +
                `- ${errorText}`
            );
        }

        const sessionData =
            await sessionResponse.json();

        return {
            sessionId: sessionData.id,
            projectKey,
            region,
        };
    } catch (error) {
        const details = getMockOrderErrorDetails(error);
        console.error('Error creating Checkout Session:', {
            statusCode: details.statusCode,
            errorCode: details.errorCode,
            message: details.message,
            correlationId: details.correlationId,
        });

        throw error;
    }
}

function getMatchingShippingRate(method: ShippingMethod) {
    return method.zoneRates
        .flatMap((zoneRate) => zoneRate.shippingRates)
        .find((rate) => rate.isMatching);
}

function getShippingPrice(method: ShippingMethod): MoneyValue | undefined {
    const rate = getMatchingShippingRate(method);
    if (!rate) return undefined;

    const matchingTier = rate.tiers.find((tier) => tier.isMatching);
    if (!matchingTier) {
        return rate.tiers.length === 0
            ? rate.price
            : undefined;
    }

    if (!('price' in matchingTier) || !matchingTier.price) return undefined;

    const price = matchingTier.price;
    if (typeof price.centAmount !== 'number') return undefined;

    return {
        centAmount: price.centAmount,
        currencyCode: price.currencyCode,
        ...('fractionDigits' in price && {
            fractionDigits: price.fractionDigits,
        }),
        ...('preciseAmount' in price && {
            preciseAmount: price.preciseAmount,
        }),
    };
}

function toCheckoutShippingOptions(
    methods: ShippingMethod[],
    currencyCode: string,
): CheckoutShippingOption[] {
    return methods.flatMap((method) => {
        const rate = getMatchingShippingRate(method);
        const price = getShippingPrice(method);
        if (!rate || rate.price.currencyCode !== currencyCode) return [];
        if (price && price.currencyCode !== currencyCode) return [];

        return [{
            id: method.id,
            name: method.name,
            localizedName: method.localizedName,
            price,
        }];
    });
}

async function getActiveCheckoutCart(): Promise<Cart> {
    const startedAt = Date.now();
    try {
        const cart = await getCart();
        if (!cart || cart.cartState !== 'Active') {
            throw new Error('Your active cart could not be found. Return to your cart and try again.');
        }

        if (process.env.NODE_ENV === 'development') {
            console.info('[checkout]', {
                operation: 'resolve-active-cart',
                durationMs: Date.now() - startedAt,
                statusCode: null,
                errorCode: null,
            });
        }

        return cart;
    } catch (error) {
        const details = getMockOrderErrorDetails(error);
        if (process.env.NODE_ENV === 'development') {
            console.error('[checkout]', {
                operation: 'resolve-active-cart',
                durationMs: Date.now() - startedAt,
                statusCode: details.statusCode ?? null,
                errorCode: details.errorCode ?? null,
            });
        }
        throw error;
    }
}

async function fetchCheckoutCart(cartId: string): Promise<Cart> {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (!projectKey) throw new Error('CT_PROJECT_KEY is not configured');

    const response = await apiRoot
        .withProjectKey({ projectKey })
        .carts()
        .withId({ ID: cartId })
        .get()
        .execute();

    return response.body;
}

const RESOURCE_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchCheckoutOrder(
    orderId: string,
    storeKey?: string,
): Promise<Order | undefined> {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (!projectKey) throw new Error('CT_PROJECT_KEY is not configured');

    try {
        const request = storeKey
            ? apiRoot
                .withProjectKey({ projectKey })
                .inStoreKeyWithStoreKeyValue({ storeKey })
                .orders()
                .withId({ ID: orderId })
            : apiRoot
                .withProjectKey({ projectKey })
                .orders()
                .withId({ ID: orderId });
        const response = await request.get().execute();
        return response.body;
    } catch (error) {
        if (isCommercetoolsNotFound(error)) return undefined;
        throw error;
    }
}

async function findCheckoutOrderForCart(
    cartId: string,
    storeKey?: string,
): Promise<Order | undefined> {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (!projectKey) throw new Error('CT_PROJECT_KEY is not configured');

    const queryArgs = {
        where: `cart(id=${JSON.stringify(cartId)})`,
        limit: 1,
    };
    const response = storeKey
        ? await apiRoot
            .withProjectKey({ projectKey })
            .inStoreKeyWithStoreKeyValue({ storeKey })
            .orders()
            .get({ queryArgs })
            .execute()
        : await apiRoot
            .withProjectKey({ projectKey })
            .orders()
            .get({ queryArgs })
            .execute();

    return response.body.results[0];
}

async function getCheckoutCartContext(): Promise<{
    cart: Cart;
    customerId?: string;
    storeKey?: string;
} | null> {
    const cookieStore = await cookies();
    const cartId = cookieStore.get('cartId')?.value;
    if (!cartId || !RESOURCE_ID_PATTERN.test(cartId)) return null;

    let cart: Cart;
    try {
        cart = await fetchCheckoutCart(cartId);
    } catch (error) {
        if (isCommercetoolsNotFound(error)) return null;
        throw error;
    }

    const customerId = await getSession();
    if (cart.customerId && cart.customerId !== customerId) return null;
    if (cart.customerId && !customerId) return null;

    const { storeKey: customerStoreKey } = await getCartSessionContext();
    const storeKey = customerStoreKey ?? cart.store?.key;
    if (customerStoreKey && cart.store?.key !== customerStoreKey) return null;

    return { cart, customerId, storeKey };
}

function isOrderForCheckoutCart(
    order: Order,
    cart: Cart,
    customerId?: string,
): boolean {
    return (
        order.cart?.id === cart.id &&
        (!cart.customerId || order.customerId === cart.customerId) &&
        (!order.customerId || order.customerId === customerId)
    );
}

export type CheckoutOrderResolution =
    | { status: 'found'; orderId: string }
    | { status: 'pending' }
    | { status: 'payment_failed' };

export async function resolveCompletedCheckoutOrder(
    candidateOrderId?: string,
): Promise<CheckoutOrderResolution> {
    const orderId =
        candidateOrderId && RESOURCE_ID_PATTERN.test(candidateOrderId)
            ? candidateOrderId
            : undefined;
    const customerId = await getSession();
    const checkoutContext = await getCheckoutCartContext();
    const storeKey =
        checkoutContext?.storeKey ??
        (customerId ? (await getCartSessionContext()).storeKey : undefined);

    if (!checkoutContext && (!customerId || !orderId)) {
        return { status: 'pending' };
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidateOrder = orderId
            ? await fetchCheckoutOrder(orderId, storeKey)
            : undefined;

        if (
            candidateOrder &&
            customerId &&
            candidateOrder.customerId === customerId
        ) {
            if (candidateOrder.paymentState === 'Failed') {
                return { status: 'payment_failed' };
            }

            return { status: 'found', orderId: candidateOrder.id };
        }

        if (checkoutContext) {
            const { cart } = checkoutContext;
            const cartOrder =
                candidateOrder &&
                isOrderForCheckoutCart(candidateOrder, cart, customerId)
                    ? candidateOrder
                    : await findCheckoutOrderForCart(cart.id, storeKey);

            if (
                cartOrder &&
                isOrderForCheckoutCart(cartOrder, cart, customerId)
            ) {
                if (cartOrder.paymentState === 'Failed') {
                    return { status: 'payment_failed' };
                }

                return { status: 'found', orderId: cartOrder.id };
            }
        }

        if (attempt < 4) {
            await new Promise<void>((resolve) => setTimeout(resolve, 500));
        }
    }

    return { status: 'pending' };
}

function isCartVersionConflict(error: unknown): boolean {
    const details = getMockOrderErrorDetails(error);
    return details.statusCode === 409 ||
        details.errorCode === 'ConcurrentModification';
}

async function withCheckoutDiagnostics<T>(
    operation: string,
    action: () => Promise<{ statusCode?: number; body: T }>,
): Promise<{ statusCode?: number; body: T }> {
    const startedAt = Date.now();
    try {
        const response = await action();
        if (process.env.NODE_ENV === 'development') {
            console.info('[checkout]', {
                operation,
                durationMs: Date.now() - startedAt,
                statusCode: response.statusCode,
                errorCode: null,
            });
        }
        return response;
    } catch (error) {
        const details = getMockOrderErrorDetails(error);
        if (process.env.NODE_ENV === 'development') {
            console.error('[checkout]', {
                operation,
                durationMs: Date.now() - startedAt,
                statusCode: details.statusCode,
                errorCode: details.errorCode,
            });
        }
        throw error;
    }
}

export async function updateCartWithShippingAddress(
    formData: CheckoutFormData,
): Promise<{ cart: Cart; shippingMethods: CheckoutShippingOption[] }> {
    const startedAt = Date.now();
    try {
        const projectKey = process.env.CT_PROJECT_KEY;
        if (!projectKey) {
            throw new Error('CT_PROJECT_KEY is not configured');
        }

        const isCompleteAddress = (address: {
            firstName: string;
            lastName: string;
            streetName: string;
            city: string;
            postalCode: string;
            country: string;
        }) =>
            Boolean(
                address.firstName.trim() &&
                address.lastName.trim() &&
                address.streetName.trim() &&
                address.city.trim() &&
                address.postalCode.trim() &&
                /^[A-Z]{2}$/.test(address.country),
            );
        const shippingAddress = {
            ...formData,
            streetName: formData.address || formData.streetName,
        };
        const billingAddress = formData.billingAddress;
        if (!isCompleteAddress(shippingAddress)) {
            throw new Error('Enter a complete shipping address before continuing.');
        }
        const hasBillingAddress = isCompleteAddress(billingAddress);

        const shipping: Address = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            company: formData.company,
            streetName: formData.address || formData.streetName,
            streetNumber: formData.streetNumber,
            additionalStreetInfo: formData.additionalStreetInfo,
            city: formData.city,
            postalCode: formData.postalCode,
            state: formData.state,
            region: formData.region,
            country: formData.country,
            phone: formData.phone,
        };
        const billing: Address = {
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName,
            company: billingAddress.company,
            streetName: billingAddress.streetName,
            streetNumber: billingAddress.streetNumber,
            additionalStreetInfo: billingAddress.additionalStreetInfo,
            city: billingAddress.city,
            postalCode: billingAddress.postalCode,
            state: billingAddress.state,
            region: billingAddress.region,
            country: billingAddress.country,
            phone: billingAddress.phone,
        };

        let cart = await getActiveCheckoutCart();
        const actions: CartUpdateAction[] = [];
        if (formData.email.trim() && cart.customerEmail !== formData.email.trim()) {
            actions.push({
                action: 'setCustomerEmail',
                email: formData.email.trim(),
            });
        }
        if (!areCheckoutAddressesEqual(cart.shippingAddress, shipping)) {
            actions.push({
                action: 'setShippingAddress',
                address: shipping,
            });
        }
        if (hasBillingAddress && !areCheckoutAddressesEqual(cart.billingAddress, billing)) {
            actions.push({
                action: 'setBillingAddress',
                address: billing,
            });
        }

        if (actions.length > 0) {
            let addressUpdate: Cart | undefined;
            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    const response = await withCheckoutDiagnostics(
                        'update-cart-address',
                        () => apiRoot
                            .withProjectKey({ projectKey })
                            .carts()
                            .withId({ ID: cart.id })
                            .post({ body: { version: cart.version, actions } })
                            .execute(),
                    );
                    addressUpdate = response.body;
                    break;
                } catch (error) {
                    if (!isCartVersionConflict(error) || attempt > 0) throw error;
                    cart = await fetchCheckoutCart(cart.id);
                }
            }
            if (!addressUpdate) throw new Error('Unable to update the cart address.');
            cart = addressUpdate;
        }

        const shippingMethodsResponse = await withCheckoutDiagnostics(
            'load-matching-shipping-methods',
            () => apiRoot
                .withProjectKey({ projectKey })
                .shippingMethods()
                .matchingCart()
                .get({ queryArgs: { cartId: cart.id } })
                .execute(),
        );

        return {
            cart,
            shippingMethods: toCheckoutShippingOptions(
                shippingMethodsResponse.body.results,
                cart.totalPrice.currencyCode,
            ),
        };
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            const details = getMockOrderErrorDetails(error);
            console.error('[checkout]', {
                operation: 'prepare-shipping',
                durationMs: Date.now() - startedAt,
                statusCode: details.statusCode ?? null,
                errorCode: details.errorCode ?? null,
            });
        }
        throw error;
    }
}

export async function setCheckoutShippingMethod(
    shippingMethodId: string,
): Promise<Cart> {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (!projectKey) throw new Error('CT_PROJECT_KEY is not configured');
    if (!shippingMethodId.trim()) throw new Error('Choose an available shipping method.');

    let cart = await getActiveCheckoutCart();
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const matchingResponse = await withCheckoutDiagnostics(
            'verify-selected-shipping-method',
            () => apiRoot
                .withProjectKey({ projectKey })
                .shippingMethods()
                .matchingCart()
                .get({ queryArgs: { cartId: cart.id } })
                .execute(),
        );
        const available = matchingResponse.body.results.some(
            (method) => method.id === shippingMethodId,
        );
        if (!available) {
            throw new Error('The selected shipping method is unavailable for this address.');
        }

        try {
            const response = await withCheckoutDiagnostics(
                'update-cart-shipping-method',
                () => apiRoot
                    .withProjectKey({ projectKey })
                    .carts()
                    .withId({ ID: cart.id })
                    .post({
                        body: {
                            version: cart.version,
                            actions: [{
                                action: 'setShippingMethod',
                                shippingMethod: {
                                    id: shippingMethodId,
                                    typeId: 'shipping-method',
                                },
                            }],
                        },
                    })
                    .execute(),
            );

            if (
                !response.body.shippingInfo?.shippingMethod?.id ||
                response.body.shippingInfo.shippingMethodState !== 'MatchesCart'
            ) {
                throw new Error('commercetools did not confirm the selected shipping method.');
            }

            return response.body;
        } catch (error) {
            if (!isCartVersionConflict(error) || attempt > 0) {
                const details = getMockOrderErrorDetails(error);
                console.error('Checkout shipping method update failed:', {
                    stage: 'set-shipping-method',
                    cartId: cart.id,
                    cartVersion: cart.version,
                    statusCode: details.statusCode,
                    errorCode: details.errorCode,
                    message: details.message,
                    correlationId: details.correlationId,
                });
                throw error;
            }

            cart = await fetchCheckoutCart(cart.id);
        }
    }

    throw new Error('Unable to set the shipping method. Refresh your cart and try again.');
}

export async function getOrderById(orderId: string) {
    if (!RESOURCE_ID_PATTERN.test(orderId)) return null;

    const customerId = await getSession();
    const { storeKey } = await getCartSessionContext();
    const order = await fetchCheckoutOrder(orderId, storeKey);
    if (!order || order.paymentState === 'Failed') return null;

    if (customerId && order.customerId === customerId) {
        return order;
    }

    const cookieStore = await cookies();
    const cartId = cookieStore.get('cartId')?.value;
    if (
        !order.customerId &&
        order.cart?.id &&
        order.cart.id === cartId &&
        typeof cartId === 'string' &&
        RESOURCE_ID_PATTERN.test(cartId)
    ) {
        return order;
    }

    return null;
}
