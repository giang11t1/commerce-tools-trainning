'use server';

import {
    getCart,
    getOrCreateCart,
    getDistributionChannelId,
    getLineItemSupplyChannelId,
    isProductAvailableInCustomerStore,
    STORE_PRODUCT_UNAVAILABLE_MESSAGE,
    getCartRequest,
} from '@/lib/cart';
import { getSubscriptionOfferForVariant } from '@/lib/recurrence';
import { createCartLineItemDraft } from '@/lib/cart-line-item';
import type { Address, Cart, CartUpdateAction } from '@commercetools/platform-sdk';
import {
    applyCouponUpdate,
    classifyCouponError,
    createRemoveDiscountCodeUpdate,
    getCouponApiErrorDetails,
    getCouponErrorMessage,
} from '@/lib/coupon-utils';

/**
 * Errors thrown inside Server Actions are redacted in production,
 * so actions return the error message instead of throwing.
 */
export type CartActionResult = {
    cart: Cart | null;
    error?: string;
};

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

// commercetools rejects products outside the cart's store Product Selections
// with a "referenced object of type 'product' ... was not found" error.
function isProductNotInStoreError(error: unknown) {
    return getErrorMessage(error, '').includes("referenced object of type 'product'");
}

function isConcurrentModification(error: unknown) {
    return classifyCouponError(error) === 'version-conflict';
}

async function postCartActions(
    cart: Cart,
    actions: CartUpdateAction[],
    onSuccess?: (
        requestCart: Cart,
        updatedCart: Cart,
        statusCode: number | undefined,
    ) => void,
): Promise<Cart> {
    const response = await (await getCartRequest(cart.id))
        .post({
            queryArgs: { expand: ['lineItems[*].recurrenceInfo.recurrencePolicy'] },
            body: {
                version: cart.version,
                actions,
            },
        })
        .execute();

    onSuccess?.(cart, response.body, response.statusCode);
    return response.body;
}

/**
 * Apply update actions to the cart, retrying once with the latest
 * version when another request modified the cart in the meantime
 * (e.g. quickly clicking "+" several times).
 */
async function updateCart(
    cart: Cart,
    actions: CartUpdateAction[] | ((cart: Cart) => CartUpdateAction[]),
    onSuccess?: (
        requestCart: Cart,
        updatedCart: Cart,
        statusCode: number | undefined,
    ) => void,
): Promise<Cart> {
    try {
        const cartActions = typeof actions === 'function' ? actions(cart) : actions;
        return await postCartActions(cart, cartActions, onSuccess);
    } catch (error) {
        if (!isConcurrentModification(error)) {
            throw error;
        }

        const latestCart = await getCart();

        if (!latestCart) {
            throw error;
        }

        const retryActions =
            typeof actions === 'function' ? actions(latestCart) : actions;
        return postCartActions(latestCart, retryActions, onSuccess);
    }
}

function getCouponCartDiagnostics(cart: Cart) {
    const shippingInfo = cart.shippingInfo;
    const taxMoney = cart.taxedPrice
        ? {
              totalNet: cart.taxedPrice.totalNet.centAmount,
              totalGross: cart.taxedPrice.totalGross.centAmount,
              totalTax: cart.taxedPrice.totalTax?.centAmount,
          }
        : undefined;
    return {
        cartId: cart.id,
        version: cart.version,
        currencyCode: cart.totalPrice.currencyCode,
        totalPriceCentAmount: cart.totalPrice.centAmount,
        taxMode: cart.taxMode,
        taxedPrice: taxMoney,
        lineItemCount: cart.lineItems.length,
        lineItemTaxInclusion: [
            ...new Set(cart.lineItems.map(({ taxRate }) => taxRate?.includedInPrice)),
        ],
        cartState: cart.cartState,
        storeKey: cart.store?.key,
        country: cart.country,
        shippingCountry: cart.shippingAddress?.country,
        hasShippingAddress: Boolean(cart.shippingAddress),
        shippingMethodId: shippingInfo?.shippingMethod?.id,
        shippingMethodState: shippingInfo?.shippingMethodState,
        shippingTaxIncludedInPrice: shippingInfo?.taxRate?.includedInPrice,
        shippingPrice: shippingInfo
            ? {
                  currencyCode: shippingInfo.price.currencyCode,
                  centAmount: shippingInfo.price.centAmount,
              }
            : undefined,
        discountedShippingPrice: shippingInfo?.discountedPrice
            ? {
                  currencyCode: shippingInfo.discountedPrice.value.currencyCode,
                  centAmount: shippingInfo.discountedPrice.value.centAmount,
                  includedDiscounts: shippingInfo.discountedPrice.includedDiscounts.map(
                      ({ discount, discountedAmount }) => ({
                          discountId: discount.id,
                          centAmount: discountedAmount.centAmount,
                          currencyCode: discountedAmount.currencyCode,
                      }),
                  ),
              }
            : undefined,
        discountCodes: cart.discountCodes.map(({ discountCode, state }) => ({
            id: discountCode.id,
            state,
        })),
    };
}

export async function addToCart({
                                    productId,
                                    variantId,
                                    quantity = 1,
                                    recurrencePolicyId,
                                }: {
    productId: string;
    variantId: number;
    quantity?: number;
    recurrencePolicyId?: string;
}): Promise<CartActionResult> {
    if (!productId) {
        return { cart: null, error: 'productId is required' };
    }

    if (!Number.isInteger(variantId)) {
        return { cart: null, error: `Invalid variantId: ${variantId}` };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        return { cart: null, error: `Invalid quantity: ${quantity}` };
    }

    if (!(await isProductAvailableInCustomerStore(productId))) {
        return { cart: null, error: STORE_PRODUCT_UNAVAILABLE_MESSAGE };
    }

    try {
        const recurringPrice = recurrencePolicyId
            ? await getSubscriptionOfferForVariant(
                productId,
                variantId,
                recurrencePolicyId,
            )
            : undefined;
        if (recurrencePolicyId && !recurringPrice) {
            return {
                cart: null,
                error: 'No current subscription price is available for this product and frequency.',
            };
        }

        const cart = await getOrCreateCart();
        const [distributionChannelId, supplyChannelId] = await Promise.all([
            getDistributionChannelId(),
            getLineItemSupplyChannelId(productId, variantId),
        ]);

        const updatedCart = await updateCart(cart, (latestCart) => {
            const actions: CartUpdateAction[] = [];

            if (recurringPrice) {
                for (const lineItem of latestCart.lineItems) {
                    if (
                        lineItem.productId === productId &&
                        lineItem.variant.id === variantId &&
                        lineItem.recurrenceInfo?.recurrencePolicy.id ===
                            recurringPrice.recurrencePolicyId &&
                        (lineItem.priceMode !== 'ExternalPrice' ||
                            lineItem.price.value.currencyCode !== recurringPrice.price.currencyCode ||
                            lineItem.price.value.centAmount !== recurringPrice.price.centAmount)
                    ) {
                        // Keep existing subscriptions aligned with the validated commercetools policy price.
                        actions.push({
                            action: 'setLineItemPrice',
                            lineItemId: lineItem.id,
                            externalPrice: recurringPrice.price,
                        });
                    }
                }
            }

            const lineItemDraft = createCartLineItemDraft({
                productId,
                variantId,
                quantity,
                distributionChannelId,
                supplyChannelId,
                recurringPrice: recurringPrice
                    ? {
                          recurrencePolicyId: recurringPrice.recurrencePolicyId,
                          price: recurringPrice.price,
                      }
                    : undefined,
            });
            actions.push({
                action: 'addLineItem',
                ...lineItemDraft,
            });

            return actions;
        });

        return { cart: updatedCart };
    } catch (error) {
        console.error('Failed to add product to cart:', error);

        return {
            cart: null,
            error: isProductNotInStoreError(error)
                ? STORE_PRODUCT_UNAVAILABLE_MESSAGE
                : getErrorMessage(error, 'Unable to add product to cart'),
        };
    }
}

export async function syncCartForCurrentMarket(): Promise<CartActionResult> {
    try {
        return { cart: await getOrCreateCart() };
    } catch (error) {
        console.error('Failed to sync cart with the current market:', error);
        return {
            cart: null,
            error: getErrorMessage(error, 'Unable to update cart currency'),
        };
    }
}

export async function removeFromCart(
    lineItemId: string,
): Promise<CartActionResult> {
    try {
        const cart = await getCart();

        if (!cart) {
            return { cart: null, error: 'Cart not found' };
        }

        const updatedCart = await updateCart(cart, [
            {
                action: 'removeLineItem',
                lineItemId,
            },
        ]);

        return { cart: updatedCart };
    } catch (error) {
        console.error('Failed to remove cart item:', error);

        return {
            cart: null,
            error: getErrorMessage(error, 'Unable to remove item'),
        };
    }
}


export async function updateCartQuantity(
    lineItemId: string,
    quantity: number,
): Promise<CartActionResult> {
    try {
        const cart = await getCart();

        if (!cart) {
            return { cart: null, error: 'Cart not found' };
        }

        const updatedCart = await updateCart(cart, [
            {
                action: 'changeLineItemQuantity',
                lineItemId,
                quantity,
            },
        ]);

        return { cart: updatedCart };
    } catch (error) {
        console.error('Failed to update cart quantity:', error);

        return {
            cart: null,
            error: getErrorMessage(error, 'Unable to update quantity'),
        };
    }
}


export async function applyCoupon(code: string): Promise<CartActionResult> {
    if (typeof code !== 'string') {
        return { cart: null, error: 'couponEmpty' };
    }

    if (!code.trim()) {
        return { cart: null, error: 'couponEmpty' };
    }

    let cart: Cart | null = null;
    try {
        cart = await getCart();

        if (!cart) {
            return { cart: null, error: 'couponErrorCartNotFound' };
        }

        console.info('Applying commercetools discount code', {
            projectKey: process.env.CT_PROJECT_KEY,
            requestedCartId: cart.id,
            requestedCartVersion: cart.version,
            cart: getCouponCartDiagnostics(cart),
        });
        const updatedCart = await applyCouponUpdate(cart, code, (currentCart, actions) =>
            updateCart(currentCart, actions, (requestCart, resultCart, statusCode) => {
                console.info('Commercetools discount code update succeeded', {
                    method: 'POST',
                    endpoint: '/{projectKey}/carts/{cartId}',
                    projectKey: process.env.CT_PROJECT_KEY,
                    statusCode,
                    requestedCartId: requestCart.id,
                    requestedCartVersion: requestCart.version,
                    response: getCouponCartDiagnostics(resultCart),
                });
            }),
        );

        return { cart: updatedCart };
    } catch (error) {
        const details = getCouponApiErrorDetails(error);
        const kind = classifyCouponError(error);
        let errorMessage = details.message ?? 'Unknown commercetools error';
        for (const secret of [
            process.env.CT_CLIENT_SECRET,
            process.env.ADYEN_API_KEY,
            process.env.ADYEN_NOTIFICATION_HMAC_KEY,
        ]) {
            if (secret) errorMessage = errorMessage.split(secret).join('[REDACTED]');
        }
        errorMessage = errorMessage
            .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/gi, '$1 [REDACTED]')
            .replace(
                /\b(access_token|client_secret|api[_-]?key)\s*[:=]\s*["']?[^&\s"'`]+/gi,
                '$1=[REDACTED]',
            );
        if (code) {
            const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            errorMessage = errorMessage.replace(new RegExp(escapedCode, 'gi'), '[coupon]');
        }

        console.error('Commercetools addDiscountCode failed', {
            method: 'POST',
            endpoint: '/{projectKey}/carts/{cartId}',
            statusCode: details.statusCode,
            errorCode: details.errorCode,
            errorMessage: errorMessage.slice(0, 500),
            classification: kind,
            projectKey: process.env.CT_PROJECT_KEY,
            requestedCartId: cart?.id,
            requestedCartVersion: cart?.version,
            cart: cart ? getCouponCartDiagnostics(cart) : undefined,
        });

        return {
            cart: null,
            error: getCouponErrorMessage(kind),
        };
    }
}

export async function removeCoupon(discountCodeId: string): Promise<CartActionResult> {
    if (!discountCodeId) {
        return { cart: null, error: 'couponErrorNotApplied' };
    }

    try {
        const cart = await getCart();
        if (!cart) return { cart: null, error: 'couponErrorCartNotFound' };

        const reference = cart.discountCodes.find(
            ({ discountCode }) => discountCode.id === discountCodeId,
        )?.discountCode;
        if (!reference) {
            return { cart: null, error: 'couponErrorNotApplied' };
        }

        const updatedCart = await updateCart(
            cart,
            createRemoveDiscountCodeUpdate(cart.version, {
                typeId: 'discount-code',
                id: reference.id,
            }).actions,
        );

        return { cart: updatedCart };
    } catch (error) {
        console.error('Failed to remove discount code from cart', {
            statusCode: getCouponApiErrorDetails(error).statusCode,
            errorCode: getCouponApiErrorDetails(error).errorCode,
            classification: classifyCouponError(error),
        });
        return {
            cart: null,
            error:
                classifyCouponError(error) === 'unknown'
                    ? 'couponErrorRemoveFailed'
                    : getCouponErrorMessage(classifyCouponError(error)),
        };
    }
}


export async function updateCartAddress(
    address: Address,
): Promise<CartActionResult> {
    try {
        const cart = await getOrCreateCart();

        const updatedCart = await updateCart(cart, [
            {
                action: 'setShippingAddress',
                address,
            },
        ]);

        return { cart: updatedCart };
    } catch (error) {
        console.error('Failed to update cart address:', error);

        return {
            cart: null,
            error: getErrorMessage(error, 'Unable to update address'),
        };
    }
}
