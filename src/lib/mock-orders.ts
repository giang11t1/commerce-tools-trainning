import 'server-only';
import { cookies } from 'next/headers';
import type {
    Address,
    Cart,
    CartUpdateAction,
    Order,
    OrderFromCartDraft,
} from '@commercetools/platform-sdk';
import { apiRoot } from './commercetools';
import { getCartSessionContext } from './cart';
import { getCustomerById } from './customer';
import {
    createOrderIdempotently,
    findShippingMethod,
    getMockOrderErrorDetails,
    getOrderabilityError,
} from './mock-order-utils';

const CART_COOKIE = 'cartId';

export class MockOrderError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'MockOrderError';
    }
}

class MockOrderUpstreamError extends Error {
    constructor(
        readonly stage: string,
        readonly originalError: unknown,
    ) {
        super(`commercetools request failed during ${stage}`, {
            cause: originalError,
        });
        this.name = 'MockOrderUpstreamError';
    }
}

async function withCtStage<T>(
    stage: string,
    request: () => Promise<T>,
): Promise<T> {
    try {
        return await request();
    } catch (error) {
        throw new MockOrderUpstreamError(stage, error);
    }
}

export interface MockOrderInput {
    email?: string;
    shippingMethod: string;
    shippingAddress: MockOrderAddressInput;
    billingAddress: MockOrderAddressInput;
}

interface MockOrderAddressInput {
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
}

function isConflict(error: unknown) {
    return getMockOrderErrorDetails(error).statusCode === 409;
}

function clean(value: string | undefined, fallback?: string) {
    const cleaned = value?.trim();
    return cleaned || fallback || '';
}

function makeAddress(input: MockOrderAddressInput, fallback?: Address): Address {
    return {
        firstName: clean(input.firstName, fallback?.firstName),
        lastName: clean(input.lastName, fallback?.lastName),
        company: clean(input.company, fallback?.company) || undefined,
        streetName: clean(input.streetName, fallback?.streetName),
        streetNumber: clean(input.streetNumber, fallback?.streetNumber) || undefined,
        additionalStreetInfo:
            clean(input.additionalStreetInfo, fallback?.additionalStreetInfo) || undefined,
        city: clean(input.city, fallback?.city),
        postalCode: clean(input.postalCode, fallback?.postalCode),
        state: clean(input.state, fallback?.state) || undefined,
        region: clean(input.region, fallback?.region) || undefined,
        country: clean(input.country, fallback?.country).toUpperCase(),
        phone: clean(input.phone, fallback?.phone) || undefined,
    };
}

async function getOrderForCart(
    projectKey: string,
    cartId: string,
    storeKey?: string,
): Promise<Order | undefined> {
    const queryArgs = {
        where: `cart(id=${JSON.stringify(cartId)})`,
        limit: 1,
    };
    const response = await withCtStage('look up an existing order', () =>
        storeKey
            ? apiRoot
                  .withProjectKey({ projectKey })
                  .inStoreKeyWithStoreKeyValue({ storeKey })
                  .orders()
                  .get({ queryArgs })
                  .execute()
            : apiRoot
                  .withProjectKey({ projectKey })
                  .orders()
                  .get({ queryArgs })
                  .execute(),
    );

    return response.body.results[0];
}

async function createOrder(
    projectKey: string,
    cart: Cart,
    storeKey?: string,
): Promise<Order> {
    const draft: OrderFromCartDraft = {
        cart: { typeId: 'cart', id: cart.id },
        version: cart.version,
        orderState: 'Open',
        paymentState: 'Pending',
    };
    const response = await withCtStage('create the order', () =>
        storeKey
            ? apiRoot
                  .withProjectKey({ projectKey })
                  .inStoreKeyWithStoreKeyValue({ storeKey })
                  .orders()
                  .post({ body: draft })
                  .execute()
            : apiRoot
                  .withProjectKey({ projectKey })
                  .orders()
                  .post({ body: draft })
                  .execute(),
    );

    return response.body;
}

async function updateCart(
    projectKey: string,
    cart: Cart,
    actions: CartUpdateAction[],
    stage: string,
): Promise<Cart> {
    try {
        const response = await withCtStage(stage, () =>
            apiRoot
                .withProjectKey({ projectKey })
                .carts()
                .withId({ ID: cart.id })
                .post({ body: { version: cart.version, actions } })
                .execute(),
        );

        return response.body;
    } catch (error) {
        if (!isConflict(error)) {
            throw error;
        }

        const latest = await withCtStage('refresh the cart after a conflict', () =>
            apiRoot
                .withProjectKey({ projectKey })
                .carts()
                .withId({ ID: cart.id })
                .get()
                .execute(),
        );

        if (latest.body.cartState !== 'Active') {
            throw error;
        }

        const retryActions = actions.filter(
            (action) =>
                action.action !== 'setCustomerId' ||
                latest.body.customerId !== action.customerId,
        );
        if (retryActions.length === 0) {
            return latest.body;
        }

        const retried = await withCtStage(stage, () =>
            apiRoot
                .withProjectKey({ projectKey })
                .carts()
                .withId({ ID: cart.id })
                .post({
                    body: {
                        version: latest.body.version,
                        actions: retryActions,
                    },
                })
                .execute(),
        );

        return retried.body;
    }
}

export async function createMockOrderFromCurrentCart(input: MockOrderInput) {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (!projectKey) {
        throw new MockOrderError('Order service is not configured.', 500);
    }

    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_COOKIE)?.value;
    if (!cartId) {
        throw new MockOrderError('Your cart could not be found. Refresh and try again.', 409);
    }

    const context = await getCartSessionContext();
    const findExisting = () =>
        getOrderForCart(projectKey, cartId, context.storeKey);
    const priorOrder = await findExisting();
    if (priorOrder) {
        if (
            priorOrder.customerId !== context.customerId ||
            priorOrder.store?.key !== context.storeKey
        ) {
            throw new MockOrderError('Order not found.', 404);
        }

        return { order: priorOrder, created: false };
    }

    let cart: Cart;
    try {
        const response = await withCtStage('read the cart', () =>
            apiRoot
                .withProjectKey({ projectKey })
                .carts()
                .withId({ ID: cartId })
                .get()
                .execute(),
        );
        cart = response.body;
    } catch (error) {
        const details = getMockOrderErrorDetails(error);
        if (details.statusCode === 404) {
            throw new MockOrderError('Your cart could not be found. Refresh and try again.', 409);
        }
        throw error;
    }

    if (context.customerId && cart.customerId && cart.customerId !== context.customerId) {
        throw new MockOrderError('This cart belongs to a different customer.', 403);
    }
    if (!context.customerId && cart.customerId) {
        throw new MockOrderError('Your cart could not be found. Refresh and try again.', 404);
    }
    if (cart.store?.key !== context.storeKey) {
        throw new MockOrderError('This cart does not belong to your store.', 403);
    }

    if (cart.cartState !== 'Active') {
        throw new MockOrderError(
            'This cart has already been checked out. Refresh your cart to continue.',
            409,
        );
    }
    if (cart.lineItems.length === 0) {
        throw new MockOrderError('Your cart is empty.', 400);
    }

    const customer = context.customerId
        ? await getCustomerById(context.customerId)
        : undefined;
    const email = clean(input.email, cart.customerEmail ?? customer?.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new MockOrderError('Enter a valid email address for your order.', 400);
    }

    const address = makeAddress(input.shippingAddress, cart.shippingAddress);
    const billingAddress = makeAddress(input.billingAddress, cart.billingAddress);
    if (
        !address.firstName ||
        !address.lastName ||
        !address.streetName ||
        !address.city ||
        !address.postalCode ||
        !/^[A-Z]{2}$/.test(address.country)
    ) {
        throw new MockOrderError(
            'Enter a complete shipping address before placing your order.',
            400,
        );
    }
    if (
        !billingAddress.firstName ||
        !billingAddress.lastName ||
        !billingAddress.streetName ||
        !billingAddress.city ||
        !billingAddress.postalCode ||
        !/^[A-Z]{2}$/.test(billingAddress.country)
    ) {
        throw new MockOrderError(
            'Enter a complete billing address before placing your order.',
            400,
        );
    }

    const actions: CartUpdateAction[] = [
        { action: 'setCustomerEmail', email },
        { action: 'setShippingAddress', address },
        { action: 'setBillingAddress', address: billingAddress },
    ];
    if (context.customerId && !cart.customerId) {
        actions.push({ action: 'setCustomerId', customerId: context.customerId });
    }

    try {
        cart = await updateCart(
            projectKey,
            cart,
            actions,
            'set the cart address and customer email',
        );
    } catch (error) {
        const orderCreatedDuringUpdate = await findExisting();
        if (orderCreatedDuringUpdate) {
            return { order: orderCreatedDuringUpdate, created: false };
        }
        throw error;
    }

    const methodsResponse = await withCtStage(
        'find shipping methods for the cart',
        () =>
            apiRoot
                .withProjectKey({ projectKey })
                .shippingMethods()
                .matchingCart()
                .get({ queryArgs: { cartId: cart.id } })
                .execute(),
    );
    const shippingMethod = findShippingMethod(
        methodsResponse.body.results,
        input.shippingMethod,
    );
    if (!shippingMethod) {
        throw new MockOrderError(
            'The selected shipping method is unavailable for your cart. Choose another method.',
            422,
        );
    }

    try {
        cart = await updateCart(
            projectKey,
            cart,
            [
                {
                    action: 'setShippingMethod',
                    shippingMethod: {
                        typeId: 'shipping-method',
                        id: shippingMethod.id,
                    },
                },
            ],
            'set the cart shipping method',
        );
    } catch (error) {
        const orderCreatedDuringShippingUpdate = await findExisting();
        if (orderCreatedDuringShippingUpdate) {
            return { order: orderCreatedDuringShippingUpdate, created: false };
        }
        throw error;
    }

    const cartValidationError = getOrderabilityError(cart);
    if (cartValidationError) {
        throw new MockOrderError(cartValidationError, 400);
    }

    return createOrderIdempotently(
        findExisting,
        () => createOrder(projectKey, cart, context.storeKey),
    );
}
