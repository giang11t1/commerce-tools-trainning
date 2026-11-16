import type { Cart, CartDraft } from '@commercetools/platform-sdk';

export function createBusinessCartDraft(cart: Cart, customerId: string, unitKey: string): CartDraft {
    if (cart.cartState !== 'Active' || (cart.customerId && cart.customerId !== customerId)) {
        throw new Error('Only your active cart can be used for a business purchase.');
    }
    if (cart.paymentInfo?.payments.length) {
        throw new Error('This cart already has payments. Resolve them before changing the Business Unit.');
    }
    if (cart.taxMode !== 'Platform' || cart.shippingMode !== 'Single' ||
        (cart.shippingInfo && !cart.shippingInfo.shippingMethod) ||
        cart.customLineItems.length || cart.directDiscounts?.length ||
        cart.itemShippingAddresses.length || cart.shippingCustomFields || cart.refusedGifts?.length ||
        cart.lineItems.some((item) => item.shippingDetails || item.priceMode === 'ExternalTotal' ||
            item.lineItemMode === 'GiftLineItem')) {
        throw new Error('This cart requires a manual business-cart migration; the original cart has not been changed.');
    }
    return {
        currency: cart.totalPrice.currencyCode,
        country: cart.country,
        customerId,
        customerEmail: cart.customerEmail,
        businessUnit: { typeId: 'business-unit', key: unitKey },
        store: cart.store,
        shippingAddress: cart.shippingAddress,
        billingAddress: cart.billingAddress,
        shippingMethod: cart.shippingInfo?.shippingMethod,
        shippingRateInput: cart.shippingRateInput,
        taxMode: cart.taxMode,
        taxRoundingMode: cart.taxRoundingMode,
        taxCalculationMode: cart.taxCalculationMode,
        inventoryMode: cart.inventoryMode,
        priceRoundingMode: cart.priceRoundingMode,
        locale: cart.locale,
        purchaseOrderNumber: cart.purchaseOrderNumber,
        origin: cart.origin,
        deleteDaysAfterLastModification: cart.deleteDaysAfterLastModification,
        custom: cart.custom && { type: cart.custom.type, fields: cart.custom.fields },
        discountCodes: cart.discountCodes.map(({ discountCode }) => {
            if (!discountCode.obj?.code) {
                throw new Error('Discount codes must be expanded before changing the Business Unit.');
            }
            return discountCode.obj.code;
        }),
        lineItems: cart.lineItems.map((item) => ({
            productId: item.productId,
            variantId: item.variant.id,
            quantity: item.quantity,
            key: item.key,
            addedAt: item.addedAt,
            distributionChannel: item.distributionChannel,
            supplyChannel: item.supplyChannel,
            custom: item.custom && { type: item.custom.type, fields: item.custom.fields },
            ...(item.priceMode === 'ExternalPrice' && { externalPrice: item.price.value }),
            ...(item.recurrenceInfo && {
                recurrenceInfo: {
                    recurrencePolicy: item.recurrenceInfo.recurrencePolicy,
                    priceSelectionMode: item.recurrenceInfo.priceSelectionMode,
                },
            }),
        })),
    };
}

export function assertBusinessCartMigration(source: Cart, target: Cart) {
    const financialState = (cart: Cart) => ({
        customerId: cart.customerId,
        store: cart.store?.key,
        totalPrice: cart.totalPrice,
        taxedPrice: cart.taxedPrice,
        discountCodes: cart.discountCodes.map(({ discountCode, state }) => ({ id: discountCode.id, state })),
        discountOnTotalPrice: cart.discountOnTotalPrice,
        shippingPrice: cart.shippingInfo?.price,
        shippingDiscount: cart.shippingInfo?.discountedPrice,
        lines: cart.lineItems.map((item) => ({
            productId: item.productId,
            variantId: item.variant.id,
            quantity: item.quantity,
            price: item.price.value,
            totalPrice: item.totalPrice,
            taxRate: item.taxRate,
            taxedPrice: item.taxedPrice,
            distributionChannel: item.distributionChannel?.id,
            supplyChannel: item.supplyChannel?.id,
        })),
    });
    // Anonymous-to-customer assignment is intentional; all monetary fields must stay unchanged.
    const before = financialState(source);
    const after = financialState(target);
    before.customerId = after.customerId;
    if (JSON.stringify(before) !== JSON.stringify(after)) {
        throw new Error('Business pricing or tax changed during migration. The original cart is still selected; review pricing before continuing.');
    }
}

export function assertBusinessCart(cart: Cart, customerId: string, unitKey: string) {
    if (cart.customerId !== customerId || cart.businessUnit?.key !== unitKey) {
        throw new Error('The cart does not belong to your selected Business Unit and customer.');
    }
}

export function assertBusinessOrderCart(cart: Cart, customerId: string, unitKey: string, version: number) {
    assertBusinessCart(cart, customerId, unitKey);
    if (cart.version !== version) throw new Error('Your cart changed. Refresh checkout and review the current total.');
    if (cart.cartState !== 'Active' || !cart.lineItems.length ||
        cart.paymentInfo?.payments.length ||
        !cart.shippingAddress || !cart.billingAddress ||
        cart.shippingInfo?.shippingMethodState !== 'MatchesCart') {
        throw new Error('Review your addresses and shipping method. Business submission requires an active cart without payments.');
    }
}
