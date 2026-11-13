import { NextRequest, NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';
import {
    getOwnedShoppingList,
    getShoppingListCustomerContext,
    ShoppingListAccessError,
    updateCustomerShoppingList,
} from '@/lib/shopping-lists';

interface RouteContext {
    params: Promise<{ wishlistId: string }>;
}

function getErrorStatus(error: unknown) {
    if (error instanceof ShoppingListAccessError) {
        return 403;
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = error.statusCode;
        if (typeof statusCode === 'number' && statusCode >= 400 && statusCode <= 599) {
            return statusCode;
        }
    }

    return 500;
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === 'object' && 'body' in error) {
        const body = error.body;
        if (body && typeof body === 'object' && 'message' in body &&
            typeof body.message === 'string') {
            return body.message;
        }
    }

    return error instanceof Error ? error.message : fallback;
}

export async function POST(
    request: NextRequest,
    { params }: RouteContext,
) {
    try {
        const context = await getShoppingListCustomerContext();
        if (!context) {
            return NextResponse.json(
                { message: 'Customer is not logged in' },
                { status: 401 },
            );
        }

        const { wishlistId } = await params;
        const body = await request.json() as {
            productId?: unknown;
            variantId?: unknown;
            quantity?: unknown;
        };
        const productId = typeof body.productId === 'string' ? body.productId : '';
        const variantId = body.variantId;
        const quantity = body.quantity ?? 1;

        if (
            !productId ||
            (variantId !== undefined &&
                (!Number.isInteger(variantId) || Number(variantId) < 1)) ||
            !Number.isInteger(quantity) ||
            Number(quantity) < 1 ||
            Number(quantity) > 999
        ) {
            return NextResponse.json(
                { message: 'A valid product, variant, and quantity are required' },
                { status: 400 },
            );
        }

        const shoppingList = await getOwnedShoppingList(context, wishlistId);
        const project = apiRoot.withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        });
        const productResponse = context.storeKey
            ? await project
                .inStoreKeyWithStoreKeyValue({ storeKey: context.storeKey })
                .productProjections()
                .withId({ ID: productId })
                .get()
                .execute()
            : await project
                .productProjections()
                .withId({ ID: productId })
                .get()
                .execute();

        const product = productResponse.body;
        const requestedVariantId = typeof variantId === 'number'
            ? variantId
            : product.masterVariant.id;
        const variantExists = [
            product.masterVariant,
            ...product.variants,
        ].some((variant) => variant.id === requestedVariantId);

        if (!variantExists) {
            return NextResponse.json(
                { message: 'Variant does not belong to this product' },
                { status: 400 },
            );
        }

        const existing = shoppingList.lineItems.find(
            (lineItem) =>
                lineItem.productId === productId &&
                (lineItem.variantId ?? product.masterVariant.id) === requestedVariantId,
        );
        const legacyItem = (shoppingList.textLineItems ?? []).find(
            (item) => item.key === `wishlist-product-${productId}`,
        );

        if (existing || legacyItem) {
            return NextResponse.json({
                success: true,
                alreadyExists: true,
                lineItem: existing ?? legacyItem,
            });
        }

        const updatedList = await updateCustomerShoppingList(context, shoppingList, [
            {
                action: 'addLineItem',
                productId,
                variantId: requestedVariantId,
                quantity: Number(quantity),
            },
        ]);
        const lineItem = updatedList.lineItems.find(
            (item) =>
                item.productId === productId &&
            (item.variantId ?? product.masterVariant.id) === requestedVariantId,
        );

        return NextResponse.json({
            success: true,
            alreadyExists: false,
            lineItem,
        });
    } catch (error) {
        console.error('Failed to add product to shopping list:', error);
        return NextResponse.json(
            { message: getErrorMessage(error, 'Failed to add product to shopping list') },
            { status: getErrorStatus(error) },
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: RouteContext,
) {
    try {
        const context = await getShoppingListCustomerContext();
        if (!context) {
            return NextResponse.json(
                { message: 'Customer is not logged in' },
                { status: 401 },
            );
        }

        const { wishlistId } = await params;
        const body = await request.json() as {
            lineItemId?: unknown;
            quantity?: unknown;
        };
        const lineItemId = typeof body.lineItemId === 'string' ? body.lineItemId : '';

        if (
            !lineItemId ||
            !Number.isInteger(body.quantity) ||
            Number(body.quantity) < 1 ||
            Number(body.quantity) > 999
        ) {
            return NextResponse.json(
                { message: 'A valid line item and quantity are required' },
                { status: 400 },
            );
        }

        const shoppingList = await getOwnedShoppingList(context, wishlistId);
        const lineItem = shoppingList.lineItems.find((item) => item.id === lineItemId);
        const textLineItem = (shoppingList.textLineItems ?? []).find(
            (item) => item.id === lineItemId,
        );

        if (!lineItem && !textLineItem) {
            return NextResponse.json(
                { message: 'Shopping list item not found' },
                { status: 404 },
            );
        }

        const action = lineItem
            ? {
                action: 'changeLineItemQuantity' as const,
                lineItemId,
                quantity: Number(body.quantity),
            }
            : {
                action: 'changeTextLineItemQuantity' as const,
                textLineItemId: lineItemId,
                quantity: Number(body.quantity),
            };
        const updatedList = await updateCustomerShoppingList(
            context,
            shoppingList,
            [action],
        );

        return NextResponse.json({ success: true, wishlist: updatedList });
    } catch (error) {
        console.error('Failed to update shopping list item quantity:', error);
        return NextResponse.json(
            { message: getErrorMessage(error, 'Failed to update item quantity') },
            { status: getErrorStatus(error) },
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: RouteContext,
) {
    try {
        const context = await getShoppingListCustomerContext();
        if (!context) {
            return NextResponse.json(
                { message: 'Customer is not logged in' },
                { status: 401 },
            );
        }

        const { wishlistId } = await params;
        const body = await request.json() as {
            lineItemId?: unknown;
            productId?: unknown;
        };
        const lineItemId = typeof body.lineItemId === 'string' ? body.lineItemId : '';
        const productId = typeof body.productId === 'string' ? body.productId : '';

        if (!lineItemId && !productId) {
            return NextResponse.json(
                { message: 'A shopping list item is required' },
                { status: 400 },
            );
        }

        const shoppingList = await getOwnedShoppingList(context, wishlistId);
        const lineItem = shoppingList.lineItems.find(
            (item) => item.id === lineItemId || item.productId === productId,
        );
        const textLineItem = (shoppingList.textLineItems ?? []).find(
            (item) =>
                item.id === lineItemId ||
                item.key === `wishlist-product-${productId}`,
        );

        if (!lineItem && !textLineItem) {
            return NextResponse.json(
                { message: 'Shopping list item not found' },
                { status: 404 },
            );
        }

        const action = lineItem
            ? {
                action: 'removeLineItem' as const,
                lineItemId: lineItem.id,
            }
            : {
                action: 'removeTextLineItem' as const,
                textLineItemId: textLineItem!.id,
            };
        const updatedList = await updateCustomerShoppingList(
            context,
            shoppingList,
            [action],
        );

        return NextResponse.json({ success: true, wishlist: updatedList });
    } catch (error) {
        console.error('Failed to remove product from shopping list:', error);
        return NextResponse.json(
            { message: getErrorMessage(error, 'Failed to remove product from shopping list') },
            { status: getErrorStatus(error) },
        );
    }
}
