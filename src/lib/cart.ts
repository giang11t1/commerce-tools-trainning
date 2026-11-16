import { cache } from 'react';
import { cookies } from 'next/headers';
import type { Address, Cart, CartUpdateAction, LineItemDraft } from '@commercetools/platform-sdk';
import { apiRoot } from './commercetools';
import { getSession } from './auth';
import { getCustomerById } from './customer';
import { getChannelByKey, CHANNEL_KEYS } from './channels';
import { getLocale } from 'next-intl/server';
import { getCommerceMarket } from './commerce-market';
import {
    isCommercetoolsNotFound,
    isReadableCart,
    isUsableCart,
} from './cart-lifecycle';
import { associateInUnit, getSelectedBusinessUnit } from './b2b-context';
import { assertBusinessCart } from './b2b-cart-draft';
import {
    getInventoryAvailabilityBySkus,
    type InventorySupplyContext,
} from './inventory';
import {
    resolveEligibleSupplyChannelIds,
    selectLineItemSupplyChannelId,
} from './inventory-availability';

const CART_COOKIE = 'cartId';
const CART_EXPANSIONS = ['lineItems[*].recurrenceInfo.recurrencePolicy'];

type CartSessionContext = {
    customerId?: string;
    // Store the cart must belong to. Customers that are assigned to
    // stores can only use carts in one of those stores.
    storeKey?: string;
    // Distribution channel used for line item price selection.
    distributionChannelId?: string;
    // Inventory supply channels of the Store (empty when no Store applies).
    supplyChannelIds?: string[];
    businessUnitKey?: string;
};

async function getDefaultDistributionChannelId() {
    try {
        const channel = await getChannelByKey(CHANNEL_KEYS.distribution);
        return channel.id;
    } catch {
        return undefined;
    }
}

async function fetchStore(key: string) {
    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .stores()
        .withKey({ key })
        .get({ queryArgs: { expand: CART_EXPANSIONS } })
        .execute();

    return response.body;
}

/**
 * Resolve customer, store and price channel for the current request.
 *
 * Products use channel-scoped (standalone) prices, so line items must be
 * added with a distribution channel, otherwise commercetools cannot find a
 * matching price. For store customers the channel must also be one of the
 * store's distribution channels.
 */
export const getCartSessionContext = cache(async (): Promise<CartSessionContext> => {
    const customerId = await getSession();

    if (!customerId) {
        return { distributionChannelId: await getDefaultDistributionChannelId() };
    }

    const customer = await getCustomerById(customerId);
    const selected = await getSelectedBusinessUnit();
    const customerChannelId =
        customer?.custom?.fields?.priceChannelId as string | undefined;
    const storeKeys =
        customer?.stores?.map((store) => store.key).filter(Boolean) ?? [];

    if (storeKeys.length > 0) {
        const stores = await Promise.all(storeKeys.map(fetchStore));
        const hasCustomerChannel = (store: (typeof stores)[number]) =>
            !!customerChannelId &&
            store.distributionChannels.some((channel) => channel.id === customerChannelId);

        const store = stores.find(hasCustomerChannel) ?? stores[0];

        const distributionChannelId = hasCustomerChannel(store)
            ? customerChannelId
            : store.distributionChannels[0]?.id ??
              customerChannelId ??
              (await getDefaultDistributionChannelId());

        return {
            customerId,
            storeKey: store.key,
            distributionChannelId,
            supplyChannelIds: store.supplyChannels.map((channel) => channel.id),
            businessUnitKey: selected?.unit.key,
        };
    }

    return {
        customerId,
        businessUnitKey: selected?.unit.key,
        distributionChannelId:
            customerChannelId ?? (await getDefaultDistributionChannelId()),
    };
});

async function getDefaultInventoryChannelId() {
    try {
        const channel = await getChannelByKey(CHANNEL_KEYS.inventory);
        return channel.id;
    } catch (error) {
        console.error('Failed to resolve the default inventory channel:', error);
        return undefined;
    }
}

/**
 * Store and inventory supply channels used for stock display and line items.
 * Customers without a Store keep the storefront's default warehouse.
 */
export const getInventorySupplyContext = cache(async (): Promise<InventorySupplyContext> => {
    const { storeKey, supplyChannelIds } = await getCartSessionContext();

    return {
        storeKey,
        supplyChannelIds: resolveEligibleSupplyChannelIds(
            supplyChannelIds,
            supplyChannelIds?.length ? undefined : await getDefaultInventoryChannelId(),
        ),
    };
});

/**
 * Supply channel for a new line item: the Store-eligible channel that the
 * displayed stock for this variant was taken from.
 */
export async function getLineItemSupplyChannelId(productId: string, variantId: number) {
    const context = await getInventorySupplyContext();
    if (context.supplyChannelIds.length <= 1) {
        return context.supplyChannelIds[0];
    }

    const product = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .productProjections()
        .withId({ ID: productId })
        .get()
        .execute();
    const variant = [product.body.masterVariant, ...product.body.variants]
        .find((candidate) => candidate.id === variantId);
    if (!variant?.sku) {
        return context.supplyChannelIds[0];
    }

    const availability = await getInventoryAvailabilityBySkus([variant.sku], context);
    return selectLineItemSupplyChannelId(availability[variant.sku], context.supplyChannelIds);
}

export const STORE_PRODUCT_UNAVAILABLE_MESSAGE =
    'This product is not available in your store.';

/**
 * Store customers can only buy products from their store's Product Selections.
 * The in-store endpoint returns 404 for products outside those selections.
 */
export async function isProductAvailableInCustomerStore(productId: string) {
    const { storeKey } = await getCartSessionContext();

    if (!storeKey) {
        return true;
    }

    try {
        await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .inStoreKeyWithStoreKeyValue({ storeKey })
            .productProjections()
            .withId({ ID: productId })
            .get()
            .execute();

        return true;
    } catch (error) {
        if ((error as { statusCode?: number })?.statusCode === 404) {
            return false;
        }

        // Do not block on unexpected errors; addLineItem validates again.
        console.error('Failed to check store product availability:', error);
        return true;
    }
}

export async function getDistributionChannelId(): Promise<string | undefined> {
    const { distributionChannelId } = await getCartSessionContext();
    return distributionChannelId;
}

export async function getCartRequest(cartId: string) {
    const selected = await getSelectedBusinessUnit();
    if (selected) {
        return associateInUnit(selected.customerId, selected.unit.key)
            .carts().withId({ ID: cartId });
    }
    return apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .carts()
        .withId({
            ID: cartId,
        });
}

async function fetchCart(cartId: string) {
    const response = await (await getCartRequest(cartId))
        .get({ queryArgs: { expand: CART_EXPANSIONS } })
        .execute();
    const selected = await getSelectedBusinessUnit();
    if (selected) assertBusinessCart(response.body, selected.customerId, selected.unit.key);
    else if (response.body.businessUnit) throw new Error('Select the Business Unit for this cart before continuing.');
    return response.body;
}

export async function getCart() {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_COOKIE)?.value;

    if (!cartId) {
        return null;
    }

    try {
        const cart = await fetchCart(cartId);
        const customerId = await getSession();

        if (!isReadableCart(cart, customerId)) return null;

        return cart;
    } catch (error) {
        if (isCommercetoolsNotFound(error)) {
            return null;
        }

        throw error;
    }
}

export async function getOrCreateCart() {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_COOKIE)?.value;
    const context = await getCartSessionContext();
    const market = getCommerceMarket(await getLocale());

    // Line items of an anonymous cart that cannot be assigned to the
    // customer (wrong store); they are copied into the new cart.
    let carryOverLineItems: LineItemDraft[] = [];
    let carryOverShippingAddress: Address | undefined;
    let carryOverBillingAddress: Address | undefined;
    let marketMigration = false;

    // Existing cart
    if (cartId) {
        try {
            let cart = await fetchCart(cartId);
            marketMigration =
                cart.totalPrice.currencyCode !== market.currency ||
                cart.country !== market.country;

            if (
                isUsableCart(cart, context) &&
                cart.totalPrice.currencyCode === market.currency
            ) {
                const actions: CartUpdateAction[] = [];

                // Fix old cart without country or shipping address
                if (cart.country !== market.country) {
                    actions.push({
                        action: 'setCountry',
                        country: market.country,
                    });
                }
                if (!cart.shippingAddress) {
                    actions.push({
                        action: 'setShippingAddress',
                        address: {
                            country: market.country,
                        },
                    });
                }

                // Assign anonymous cart to the logged-in customer so that
                // customer group (B2B) prices are applied.
                if (context.customerId && !cart.customerId) {
                    actions.push({
                        action: 'setCustomerId',
                        customerId: context.customerId,
                    });
                }

                if (actions.length > 0) {
                    const updateResponse = await (await getCartRequest(cart.id))
                        .post({
                            queryArgs: { expand: CART_EXPANSIONS },
                            body: {
                                version: cart.version,
                                actions,
                            },
                        })
                        .execute();

                    cart = updateResponse.body;
                }

                return cart;
            }

            if (isReadableCart(cart, context.customerId)) {
                if (context.businessUnitKey) {
                    throw new Error('Your business cart market or Store changed. Review it before creating another cart.');
                }
                carryOverShippingAddress = cart.shippingAddress;
                carryOverBillingAddress = cart.billingAddress;
                carryOverLineItems = cart.lineItems.map((lineItem) => ({
                    productId: lineItem.productId,
                    variantId: lineItem.variant.id,
                    quantity: lineItem.quantity,
                    ...(lineItem.recurrenceInfo && {
                        recurrenceInfo: {
                            recurrencePolicy: {
                                typeId: 'recurrence-policy' as const,
                                id: lineItem.recurrenceInfo.recurrencePolicy.id,
                            },
                            priceSelectionMode:
                                lineItem.recurrenceInfo.priceSelectionMode,
                        },
                    }),
                    ...(lineItem.priceMode === 'ExternalPrice' && {
                        externalPrice: lineItem.price.value,
                    }),
                    ...(context.distributionChannelId && {
                        distributionChannel: {
                            typeId: 'channel' as const,
                            id: context.distributionChannelId,
                        },
                    }),
                }));
            }
        } catch (error) {
            if (!isCommercetoolsNotFound(error)) {
                throw error;
            }
        }
    }

    // Create new cart
    const createCart = async (lineItems: LineItemDraft[]) => {
        const request = context.businessUnitKey && context.customerId
            ? associateInUnit(context.customerId, context.businessUnitKey).carts()
            : apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .carts();
        const response = await request.post({
                queryArgs: { expand: CART_EXPANSIONS },
                body: {
                    currency: market.currency,
                    country: market.country,
                    shippingAddress: carryOverShippingAddress ?? {
                        country: market.country,
                    },
                    ...(carryOverBillingAddress && {
                        billingAddress: carryOverBillingAddress,
                    }),
                    ...(context.customerId && { customerId: context.customerId }),
                    ...(context.businessUnitKey && {
                        businessUnit: { typeId: 'business-unit', key: context.businessUnitKey },
                    }),
                    ...(context.storeKey && {
                        store: {
                            typeId: 'store',
                            key: context.storeKey,
                        },
                    }),
                    ...(lineItems.length > 0 && { lineItems }),
                },
            })
            .execute();

        return response.body;
    };

    let cart: Cart;

    try {
        cart = await createCart(carryOverLineItems);
    } catch (error) {
        if (carryOverLineItems.length === 0 || marketMigration || context.businessUnitKey) {
            throw error;
        }

        // Carried-over items may not be available in the customer's store
        // (product selection / channels); start with an empty cart instead.
        console.error('Failed to carry over cart items:', error);
        cart = await createCart([]);
    }

    cookieStore.set(CART_COOKIE, cart.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    return cart;
}
