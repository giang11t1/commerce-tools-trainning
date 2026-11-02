import type { ProductSearchRequest } from '@commercetools/platform-sdk';

type SearchExpression = NonNullable<ProductSearchRequest['query']>;

export function combineProductSearchExpressions(
    expressions: SearchExpression[],
): SearchExpression {
    if (expressions.length === 0) {
        throw new Error('At least one Product Search expression is required');
    }

    return expressions.length === 1 ? expressions[0] : { and: expressions };
}

export function getBrandProductProjectionPredicate(brandKey: string): string {
    if (!brandKey.trim()) {
        throw new Error('A brand key is required');
    }

    return `attributes(name="brand" and value(key=${JSON.stringify(brandKey)}))`;
}

export async function executeCategoryProductSearch<T>(
    request: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
    try {
        return { ok: true, value: await request() };
    } catch (error) {
        return { ok: false, error };
    }
}

export function getCommercetoolsErrorDetails(error: unknown) {
    const errorRecord =
        typeof error === 'object' && error !== null
            ? (error as Record<string, unknown>)
            : undefined;
    const body =
        typeof errorRecord?.body === 'object' && errorRecord.body !== null
            ? (errorRecord.body as Record<string, unknown>)
            : undefined;
    const errors = Array.isArray(body?.errors)
        ? body.errors.filter(
              (item): item is Record<string, unknown> =>
                  typeof item === 'object' && item !== null,
          )
        : [];
    const responseErrors = errors.map((item) => ({
        code: typeof item.code === 'string' ? item.code : undefined,
        message: typeof item.message === 'string' ? item.message : undefined,
    }));
    const message =
        responseErrors.find((item) => item.message)?.message ??
        (typeof body?.message === 'string' ? body.message : undefined) ??
        (typeof errorRecord?.message === 'string'
            ? errorRecord.message
            : undefined) ??
        (typeof error === 'string' ? error : 'Unknown commercetools API error');

    return {
        statusCode:
            typeof errorRecord?.statusCode === 'number'
                ? errorRecord.statusCode
                : typeof body?.statusCode === 'number'
                  ? body.statusCode
                  : undefined,
        errorCode: responseErrors[0]?.code,
        errorMessage: message,
        errors: responseErrors,
    };
}
