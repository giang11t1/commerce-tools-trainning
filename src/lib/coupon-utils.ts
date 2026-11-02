import type { CartUpdateAction } from '@commercetools/platform-sdk';

export type CouponErrorKind =
    | 'not-found'
    | 'not-applicable'
    | 'authentication'
    | 'version-conflict'
    | 'unknown';

export type CouponApplyStatus = 'applied' | 'waiting-for-shipping' | 'not-applicable';
export type CouponErrorTranslationKey =
    | 'couponEmpty'
    | 'couponErrorCartNotFound'
    | 'couponErrorNotFound'
    | 'couponErrorNotApplicable'
    | 'couponErrorAuthentication'
    | 'couponErrorVersionConflict'
    | 'couponErrorUnknown'
    | 'couponErrorNotApplied'
    | 'couponErrorRemoveFailed'
    | 'couponErrorRemoveForQuote';

type CouponApiErrorDetails = {
    statusCode?: number;
    errorCode?: string;
    message?: string;
    reason?: string;
};

function getErrorDetails(error: unknown): CouponApiErrorDetails {
    if (typeof error !== 'object' || error === null) return {};

    const record = error as {
        statusCode?: unknown;
        status?: unknown;
        code?: unknown;
        message?: unknown;
        body?: {
            statusCode?: unknown;
            code?: unknown;
            error?: unknown;
            error_description?: unknown;
            message?: unknown;
            errors?: Array<{
                code?: unknown;
                message?: unknown;
                reason?: unknown;
            }>;
        };
    };
    const body = record.body;
    const firstError = body?.errors?.[0];
    const statusCode =
        typeof record.statusCode === 'number'
            ? record.statusCode
            : typeof record.status === 'number'
              ? record.status
              : typeof body?.statusCode === 'number'
                ? body.statusCode
                : undefined;
    const errorCode = [firstError?.code, body?.code, body?.error, record.code].find(
        (value): value is string => typeof value === 'string',
    );
    const message = [
        firstError?.message,
        body?.message,
        body?.error_description,
        record.message,
    ].find((value): value is string => typeof value === 'string');

    return {
        statusCode,
        errorCode,
        message,
        reason: typeof firstError?.reason === 'string' ? firstError.reason : undefined,
    };
}

export function classifyCouponError(error: unknown): CouponErrorKind {
    const details = getErrorDetails(error);
    const errorCode = details.errorCode?.toLowerCase();
    const message = details.message ?? '';

    if (
        details.errorCode === 'DiscountCodeNotFound' ||
        (details.errorCode === 'DiscountCodeNonApplicable' &&
            details.reason === 'DoesNotExist') ||
        /discount code\b[\s\S]{0,120}\bnot found\b/i.test(message)
    ) {
        return 'not-found';
    }

    if (details.errorCode === 'DiscountCodeNonApplicable') {
        return 'not-applicable';
    }

    if (
        details.statusCode === 401 ||
        details.statusCode === 403 ||
        ['invalid_client', 'invalid_token', 'invalidcredentials', 'insufficient_scope'].includes(
            errorCode ?? '',
        )
    ) {
        return 'authentication';
    }

    if (details.statusCode === 409 || details.errorCode === 'ConcurrentModification') {
        return 'version-conflict';
    }

    return 'unknown';
}

export function getCouponErrorMessage(kind: CouponErrorKind): CouponErrorTranslationKey {
    switch (kind) {
        case 'not-found':
            return 'couponErrorNotFound';
        case 'not-applicable':
            return 'couponErrorNotApplicable';
        case 'authentication':
            return 'couponErrorAuthentication';
        case 'version-conflict':
            return 'couponErrorVersionConflict';
        default:
            return 'couponErrorUnknown';
    }
}

const couponErrorTranslationKeys: CouponErrorTranslationKey[] = [
    'couponEmpty',
    'couponErrorCartNotFound',
    'couponErrorNotFound',
    'couponErrorNotApplicable',
    'couponErrorAuthentication',
    'couponErrorVersionConflict',
    'couponErrorUnknown',
    'couponErrorNotApplied',
    'couponErrorRemoveFailed',
    'couponErrorRemoveForQuote',
];

export function getCouponErrorTranslationKey(
    message: string,
): CouponErrorTranslationKey | undefined {
    return couponErrorTranslationKeys.find((key) => key === message);
}

export function createAddDiscountCodeUpdate(
    version: number,
    code: string,
): { version: number; actions: CartUpdateAction[] } {
    return {
        version,
        actions: [
            {
                action: 'addDiscountCode',
                code,
            },
        ],
    };
}

export function createRemoveDiscountCodeUpdate(
    version: number,
    discountCode: { typeId: 'discount-code'; id: string },
): { version: number; actions: CartUpdateAction[] } {
    return {
        version,
        actions: [
            {
                action: 'removeDiscountCode',
                discountCode,
            },
        ],
    };
}

export function getAddedCouponState(
    previousCart: { discountCodes: Array<{ discountCode: { id: string }; state: string }> },
    updatedCart: { discountCodes: Array<{ discountCode: { id: string }; state: string }> },
): { id: string; state: string } | undefined {
    const previousIds = new Set(
        previousCart.discountCodes.map(({ discountCode }) => discountCode.id),
    );
    const added = updatedCart.discountCodes.find(
        ({ discountCode }) => !previousIds.has(discountCode.id),
    );
    const applied = added ?? updatedCart.discountCodes.at(-1);
    return applied
        ? { id: applied.discountCode.id, state: applied.state }
        : undefined;
}

export function getCouponApplyStatus(
    discountCodeState: string | undefined,
    hasShippingMethod: boolean,
): CouponApplyStatus {
    if (discountCodeState !== 'MatchesCart') return 'not-applicable';
    return hasShippingMethod ? 'applied' : 'waiting-for-shipping';
}

export async function applyCouponUpdate<TCart extends { version: number }, TResult>(
    cart: TCart,
    code: string,
    updateCart: (cart: TCart, actions: CartUpdateAction[]) => Promise<TResult>,
): Promise<TResult> {
    const request = createAddDiscountCodeUpdate(cart.version, code);
    return updateCart(cart, request.actions);
}

export function getCouponApiErrorDetails(error: unknown): {
    statusCode?: number;
    errorCode?: string;
    message?: string;
} {
    const { statusCode, errorCode, message } = getErrorDetails(error);
    return { statusCode, errorCode, message };
}
