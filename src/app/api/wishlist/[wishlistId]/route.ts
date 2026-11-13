import { NextRequest, NextResponse } from 'next/server';
import {
    deleteCustomerShoppingList,
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
        const requestedVariantId = typeof variantId === 'number' ? variantId : undefined;
        const existing = shoppingList.lineItems.find(
            (lineItem) =>
                lineItem.productId === productId &&
                (lineItem.variantId ?? 1) === (requestedVariantId ?? 1),
        );

        if (existing) {
            return NextResponse.json({
                id: shoppingList.id,
                lineItem: existing,
                alreadyExists: true,
            });
        }

        const updatedList = await updateCustomerShoppingList(context, shoppingList, [
            {
                action: 'addLineItem',
                productId,
                ...(requestedVariantId && { variantId: requestedVariantId }),
                quantity: Number(quantity),
            },
        ]);
        const lineItem = updatedList.lineItems.find(
            (item) =>
                item.productId === productId &&
                (item.variantId ?? 1) === (requestedVariantId ?? 1),
        );

        return NextResponse.json({
            id: updatedList.id,
            lineItem,
            alreadyExists: false,
        });
    } catch (error) {
        console.error('Failed to add product to shopping list:', error);
        return NextResponse.json(
            { message: getErrorMessage(error, 'Failed to add product to shopping list') },
            { status: getErrorStatus(error) },
        );
    }
}

export async function DELETE(
    _request: NextRequest,
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
        const shoppingList = await getOwnedShoppingList(context, wishlistId);
        await deleteCustomerShoppingList(context, shoppingList);

        return NextResponse.json({ success: true, wishlistId });
    } catch (error) {
        console.error('Failed to delete shopping list:', error);
        return NextResponse.json(
            { message: getErrorMessage(error, 'Failed to delete shopping list') },
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
        const body = await request.json() as { name?: unknown };
        const name = typeof body.name === 'string' ? body.name.trim() : '';

        if (!name || name.length > 100) {
            return NextResponse.json(
                { message: 'Shopping list name must be between 1 and 100 characters' },
                { status: 400 },
            );
        }

        const shoppingList = await getOwnedShoppingList(context, wishlistId);
        const updatedList = await updateCustomerShoppingList(context, shoppingList, [
            { action: 'changeName', name: { en: name } },
        ]);

        return NextResponse.json({ success: true, wishlist: updatedList });
    } catch (error) {
        console.error('Failed to rename shopping list:', error);
        return NextResponse.json(
            { message: getErrorMessage(error, 'Failed to rename shopping list') },
            { status: getErrorStatus(error) },
        );
    }
}
