import type { Cart } from '@commercetools/platform-sdk';

type CartSessionContext = {
    customerId?: string;
    storeKey?: string;
};

export function isCommercetoolsNotFound(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const record = error as {
        statusCode?: unknown;
        status?: unknown;
        body?: { statusCode?: unknown };
    };

    return (
        record.statusCode === 404 ||
        record.status === 404 ||
        record.body?.statusCode === 404
    );
}

export function isReadableCart(cart: Cart, customerId?: string): boolean {
    return (
        cart.cartState === 'Active' &&
        (!cart.customerId || cart.customerId === customerId)
    );
}

export function isUsableCart(
    cart: Cart,
    context: CartSessionContext,
): boolean {
    return (
        isReadableCart(cart, context.customerId) &&
        (!context.storeKey || cart.store?.key === context.storeKey)
    );
}

export function clearCartCookie(cookieStore: {
    delete: (name: string) => void;
}): void {
    cookieStore.delete('cartId');
}

export function clearStoredCartIds(
    storages: ReadonlyArray<() => Pick<Storage, 'removeItem'>>,
): unknown[] {
    const errors: unknown[] = [];

    for (const getStorage of storages) {
        try {
            getStorage().removeItem('cartId');
        } catch (error) {
            errors.push(error);
        }
    }

    return errors;
}
