import type { Address, Cart, LineItem, TypedMoney } from '@commercetools/platform-sdk';

export type MoneyValue = {
    centAmount: number;
    currencyCode: string;
    fractionDigits?: number;
    preciseAmount?: number;
};

export type TaxBasis = 'included' | 'excluded' | 'mixed' | 'unknown';

const checkoutAddressFields: (keyof Address)[] = [
    'firstName',
    'lastName',
    'company',
    'streetName',
    'streetNumber',
    'additionalStreetInfo',
    'city',
    'postalCode',
    'state',
    'region',
    'country',
    'phone',
];

export function areCheckoutAddressesEqual(
    left?: Address | null,
    right?: Address | null,
): boolean {
    if (!left || !right) return left === right;

    return checkoutAddressFields.every(
        (field) => (left[field] ?? '') === (right[field] ?? ''),
    );
}

export function preserveAvailableShippingMethod(
    availableMethodIds: string[],
    selectedMethodId?: string | null,
): string {
    return selectedMethodId && availableMethodIds.includes(selectedMethodId)
        ? selectedMethodId
        : '';
}

function getMoneyFractionDigits(money: MoneyValue | TypedMoney): number {
    if ('fractionDigits' in money && typeof money.fractionDigits === 'number') {
        return money.fractionDigits;
    }

    return (
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: money.currencyCode,
        }).resolvedOptions().maximumFractionDigits ?? 2
    );
}

function getMoneyAmount(money: MoneyValue | TypedMoney): number {
    return 'preciseAmount' in money && typeof money.preciseAmount === 'number'
        ? money.preciseAmount
        : money.centAmount;
}

function getAmountAtFractionDigits(
    money: MoneyValue | TypedMoney,
    fractionDigits: number,
): number {
    return getMoneyAmount(money) *
        10 ** (fractionDigits - getMoneyFractionDigits(money));
}

export function getLineItemPrice(item: LineItem): TypedMoney {
    return item.price.discounted?.value ?? item.price.value;
}

export function hasDiscountedPrice(
    regularPrice: TypedMoney,
    discountedPrice?: TypedMoney,
): discountedPrice is TypedMoney {
    if (!discountedPrice || regularPrice.currencyCode !== discountedPrice.currencyCode) {
        return false;
    }

    const getMajorAmount = (money: TypedMoney) => {
        return getMoneyAmount(money) / 10 ** getMoneyFractionDigits(money);
    };

    return getMajorAmount(discountedPrice) < getMajorAmount(regularPrice);
}

export function calculateSubtotal(lineItems: LineItem[]): number {
    return lineItems.reduce((total, item) => total + item.totalPrice.centAmount, 0);
}

export function getSubtotalMoney(lineItems: LineItem[]): MoneyValue | undefined {
    if (lineItems.length === 0) return undefined;

    const currencyCode = lineItems[0].totalPrice.currencyCode;
    const currencyFractionDigits = getMoneyFractionDigits(lineItems[0].totalPrice);
    const fractionDigits = Math.max(
        currencyFractionDigits,
        ...lineItems.map((item) => getMoneyFractionDigits(item.totalPrice)),
    );
    const preciseAmount = lineItems.reduce(
        (total, item) =>
            total + getAmountAtFractionDigits(item.totalPrice, fractionDigits),
        0,
    );

    return {
        centAmount: Math.round(
            preciseAmount / 10 ** (fractionDigits - currencyFractionDigits),
        ),
        currencyCode,
        fractionDigits,
        preciseAmount,
    };
}

export function getCartSubtotalMoney(
    cart: Pick<Cart, 'lineItems'>,
    taxBasis: TaxBasis,
): MoneyValue | undefined {
    const priceField =
        taxBasis === 'included'
            ? 'totalGross'
            : taxBasis === 'excluded'
              ? 'totalNet'
              : undefined;

    if (!priceField || cart.lineItems.length === 0) {
        return getSubtotalMoney(cart.lineItems);
    }

    const prices = cart.lineItems.map((item) => item.taxedPrice?.[priceField]);
    if (prices.some((price) => !price)) {
        return getSubtotalMoney(cart.lineItems);
    }

    const completePrices = prices.filter((price) => price !== undefined);
    const currencyCode = completePrices[0].currencyCode;
    if (completePrices.some((price) => price.currencyCode !== currencyCode)) {
        return getSubtotalMoney(cart.lineItems);
    }

    const currencyFractionDigits = getMoneyFractionDigits(completePrices[0]);
    const fractionDigits = Math.max(
        currencyFractionDigits,
        ...completePrices.map(getMoneyFractionDigits),
    );
    const preciseAmount = completePrices.reduce(
        (total, price) => total + getAmountAtFractionDigits(price, fractionDigits),
        0,
    );

    return {
        centAmount: Math.round(
            preciseAmount / 10 ** (fractionDigits - currencyFractionDigits),
        ),
        currencyCode,
        fractionDigits,
        preciseAmount,
    };
}

export function getCartTaxAmount(cart: Pick<Cart, 'taxedPrice'>): MoneyValue | undefined {
    const taxedPrice = cart.taxedPrice;
    if (!taxedPrice) return undefined;

    if (taxedPrice.totalTax) {
        return taxedPrice.totalTax;
    }

    if (taxedPrice.taxPortions.length === 0) {
        return undefined;
    }

    const [firstPortion] = taxedPrice.taxPortions;
    const currencyFractionDigits = getMoneyFractionDigits(firstPortion.amount);
    const fractionDigits = Math.max(
        currencyFractionDigits,
        ...taxedPrice.taxPortions.map((portion) =>
            getMoneyFractionDigits(portion.amount),
        ),
    );
    const preciseAmount = taxedPrice.taxPortions.reduce(
        (total, portion) =>
            total + getAmountAtFractionDigits(portion.amount, fractionDigits),
        0,
    );

    return {
        centAmount: Math.round(
            preciseAmount / 10 ** (fractionDigits - currencyFractionDigits),
        ),
        currencyCode: firstPortion.amount.currencyCode,
        fractionDigits,
        preciseAmount,
    };
}

export function getCartTotalPrice(cart: Pick<Cart, 'totalPrice'>): MoneyValue {
    return cart.totalPrice;
}

export function getCartDiscountAmount(
    cart: Pick<Cart, 'discountOnTotalPrice'>,
): MoneyValue | undefined {
    return cart.discountOnTotalPrice?.discountedAmount;
}

export function getCartShippingPrice(
    cart: Pick<Cart, 'shippingInfo'>,
): MoneyValue | undefined {
    return cart.shippingInfo?.discountedPrice?.value ?? cart.shippingInfo?.price;
}

export function getCartShippingOriginalPrice(
    cart: Pick<Cart, 'shippingInfo'>,
): MoneyValue | undefined {
    return cart.shippingInfo?.price;
}

export function getCartShippingDiscount(
    cart: Pick<Cart, 'shippingInfo'>,
): MoneyValue | undefined {
    const shippingInfo = cart.shippingInfo;
    const original = shippingInfo?.price;
    const discounted = shippingInfo?.discountedPrice?.value;

    if (
        !original ||
        !discounted ||
        original.currencyCode !== discounted.currencyCode ||
        original.centAmount <= discounted.centAmount
    ) {
        return undefined;
    }

    return {
        centAmount: original.centAmount - discounted.centAmount,
        currencyCode: original.currencyCode,
        fractionDigits: getMoneyFractionDigits(original),
    };
}

export function getTaxBasis(
    cart: Pick<Cart, 'lineItems' | 'taxMode'>,
): TaxBasis {
    if (cart.taxMode === 'Disabled') return 'unknown';

    const rates = cart.lineItems.map((item) => item.taxRate?.includedInPrice);

    if (rates.length === 0 || rates.some((included) => included === undefined)) {
        return 'unknown';
    }

    if (rates.every(Boolean)) return 'included';
    if (rates.every((included) => !included)) return 'excluded';
    return 'mixed';
}

export function formatPrice(
    amount: number,
    currency: string,
    locale = 'en-US',
    fractionDigits?: number,
): string {
    const digits =
        fractionDigits ??
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
        }).resolvedOptions().maximumFractionDigits ??
        0;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(amount / 10 ** digits);
}

export function formatMoney(
    money: MoneyValue | TypedMoney,
    locale = 'en-US',
): string {
    const fractionDigits =
        'fractionDigits' in money && typeof money.fractionDigits === 'number'
            ? money.fractionDigits
            : undefined;
    const amount =
        'preciseAmount' in money && typeof money.preciseAmount === 'number'
            ? money.preciseAmount
            : money.centAmount;

    return formatPrice(amount, money.currencyCode, locale, fractionDigits);
}
