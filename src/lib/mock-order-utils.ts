import type { Cart, ShippingMethod } from '@commercetools/platform-sdk';

type OrderableCart = Pick<
    Cart,
    'cartState' | 'version' | 'lineItems' | 'totalPrice' | 'shippingAddress' | 'shippingInfo'
>;

export interface MockOrderErrorDetails {
    stage?: string;
    errorName?: string;
    statusCode?: number;
    errorCode?: string;
    correlationId?: string;
    message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getHeader(headers: unknown, name: string): string | undefined {
    if (!isRecord(headers)) {
        return undefined;
    }

    const get = headers.get;
    if (typeof get === 'function') {
        const value = get.call(headers, name);
        if (typeof value === 'string') {
            return value;
        }
    }

    const key = Object.keys(headers).find(
        (headerName) => headerName.toLowerCase() === name.toLowerCase(),
    );
    const value = key ? headers[key] : undefined;
    return typeof value === 'string' ? value : undefined;
}

function safeErrorMessage(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) {
        return 'Unknown commercetools error';
    }

    return value
        .replace(/https?:\/\/\S+/gi, '[URL]')
        .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
        .replace(
            /(client[_-]?secret|access[_-]?token|refresh[_-]?token|authorization)(\s*["':=]+\s*)[^,\s"'&}]+/gi,
            '$1$2[REDACTED]',
        )
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
        .slice(0, 400);
}

export function getMockOrderErrorDetails(error: unknown): MockOrderErrorDetails {
    const outer = isRecord(error) ? error : {};
    const original = isRecord(outer.originalError)
        ? outer.originalError
        : isRecord(outer.cause)
            ? outer.cause
            : outer;
    const response = isRecord(original.response) ? original.response : {};
    const body = isRecord(original.body)
        ? original.body
        : isRecord(original.error)
            ? original.error
            : isRecord(response.body)
                ? response.body
                : {};
    const errors = Array.isArray(body.errors) ? body.errors : [];
    const firstError = isRecord(errors[0]) ? errors[0] : {};
    const statusCode =
        typeof original.statusCode === 'number'
            ? original.statusCode
            : typeof original.status === 'number'
                ? original.status
                : typeof response.status === 'number'
                    ? response.status
                    : typeof body.statusCode === 'number'
                        ? body.statusCode
                        : undefined;
    const headers = original.headers ?? response.headers;
    const responseHeaders = isRecord(response.headers)
        ? response.headers
        : undefined;
    const correlationId =
        getHeader(headers, 'x-correlation-id') ??
        getHeader(responseHeaders, 'x-correlation-id') ??
        (typeof original.correlationId === 'string'
            ? original.correlationId
            : undefined);
    const rawMessage =
        typeof firstError.message === 'string'
            ? firstError.message
            : typeof body.message === 'string'
                ? body.message
                : typeof original.message === 'string'
                    ? original.message
                    : original instanceof Error
                        ? original.message
                        : undefined;

    return {
        stage: typeof outer.stage === 'string' ? outer.stage : undefined,
        errorName:
            original instanceof Error
                ? original.name
                : typeof original.name === 'string'
                    ? original.name
                    : undefined,
        statusCode,
        errorCode:
            typeof firstError.code === 'string'
                ? firstError.code
                : typeof original.code === 'string'
                    ? original.code
                    : undefined,
        correlationId,
        message: safeErrorMessage(rawMessage),
    };
}

export function getMockOrderFailure(
    error: unknown,
    destinationCountry?: string,
): { status: number; message: string; details: MockOrderErrorDetails } {
    const details = getMockOrderErrorDetails(error);

    if (details.errorCode === 'MissingTaxRateForCountry') {
        const country = destinationCountry?.toUpperCase();
        return {
            status: 422,
            message: country
                ? `No commercetools tax rate is configured for ${country}. Configure an applicable tax rate in Merchant Center, then retry.`
                : 'No commercetools tax rate is configured for this shipping destination. Configure an applicable tax rate in Merchant Center, then retry.',
            details,
        };
    }

    if (details.errorCode === 'OutOfStock') {
        return {
            status: 409,
            message:
                'One or more items are no longer available in the requested quantity.',
            details,
        };
    }

    if (details.errorCode === 'ShippingMethodDoesNotMatchCart') {
        return {
            status: 422,
            message:
                'The selected shipping method is no longer available. Choose another method.',
            details,
        };
    }

    if (
        details.errorCode === 'InsufficientScope' ||
        details.errorCode === 'InvalidToken' ||
        details.statusCode === 401 ||
        details.statusCode === 403
    ) {
        return {
            status: 503,
            message:
                'The commercetools order service is not authorized. Check the server API client credentials and manage_orders scope.',
            details,
        };
    }

    if (details.statusCode === 409) {
        return {
            status: 409,
            message:
                'Your cart changed while placing the order. Refresh and try again.',
            details,
        };
    }

    if (
        details.statusCode !== undefined &&
        details.statusCode >= 400 &&
        details.statusCode < 500
    ) {
        return {
            status: details.statusCode,
            message:
                details.statusCode === 404
                    ? 'The cart or a required commercetools resource could not be found. Refresh your cart and try again.'
                    : 'commercetools rejected the checkout data. Review the shipping address, shipping method, and tax configuration.',
            details,
        };
    }

    return {
        status: details.statusCode && details.statusCode < 600 ? 502 : 503,
        message:
            'The commercetools order service is temporarily unavailable. Please try again.',
        details,
    };
}

export function getOrderabilityError(cart: OrderableCart): string | undefined {
    if (cart.cartState !== 'Active') {
        return 'This cart has already been checked out. Refresh your cart to continue.';
    }

    if (!Number.isInteger(cart.version) || cart.version < 1) {
        return 'The cart version is invalid. Refresh your cart and try again.';
    }

    if (
        cart.lineItems.length === 0 ||
        cart.lineItems.some(
            (lineItem) =>
                !Number.isSafeInteger(lineItem.quantity) || lineItem.quantity < 1,
        )
    ) {
        return 'Your cart is empty.';
    }

    if (
        !Number.isSafeInteger(cart.totalPrice.centAmount) ||
        cart.totalPrice.centAmount < 0 ||
        !cart.totalPrice.currencyCode
    ) {
        return 'The cart total is invalid. Refresh your cart and try again.';
    }

    const address = cart.shippingAddress;
    if (
        !address?.firstName?.trim() ||
        !address.lastName?.trim() ||
        !address.streetName?.trim() ||
        !address.city?.trim() ||
        !address.postalCode?.trim() ||
        !/^[A-Z]{2}$/.test(address.country ?? '')
    ) {
        return 'Add a complete shipping address before placing your order.';
    }

    if (!cart.shippingInfo?.shippingMethod?.id) {
        return 'Choose an available shipping method before placing your order.';
    }

    if (cart.shippingInfo.shippingMethodState !== 'MatchesCart') {
        return 'The selected shipping method is no longer available for this cart.';
    }
}

function normalizeShippingLabel(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findShippingMethod(
    methods: ShippingMethod[],
    selection: string,
): ShippingMethod | undefined {
    const methodById = methods.find((method) => method.id === selection);
    if (methodById) return methodById;

    const selected = normalizeShippingLabel(selection);
    const aliases: Record<string, string[]> = {
        standard: ['standard', 'ground', 'regular'],
        express: ['express', 'expedited'],
        overnight: ['overnight', 'nextday'],
    };
    const candidates = aliases[selected] ?? [selected];

    const matchingMethod = methods.find((method) => {
        const labels = [
            method.key ?? '',
            ...Object.values(method.name ?? {}),
        ].map(normalizeShippingLabel);

        return candidates.some((candidate) =>
            labels.some((label) => label.includes(candidate)),
        );
    });

    if (matchingMethod) {
        return matchingMethod;
    }

    return selected === 'standard' && methods.length === 1
        ? methods[0]
        : undefined;
}

export async function createOrderIdempotently<T>(
    findExisting: () => Promise<T | undefined>,
    create: () => Promise<T>,
): Promise<{ order: T; created: boolean }> {
    const existing = await findExisting();
    if (existing) {
        return { order: existing, created: false };
    }

    try {
        return { order: await create(), created: true };
    } catch (error) {
        const orderAfterFailure = await findExisting();
        if (orderAfterFailure) {
            return { order: orderAfterFailure, created: false };
        }

        throw error;
    }
}
