import { NextRequest, NextResponse } from 'next/server';
import { getWishlistProducts } from '@/lib/products';
import {
    createCustomerShoppingList,
    getShoppingListCustomerContext,
    ShoppingListAccessError,
} from '@/lib/shopping-lists';

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

export async function POST(request: NextRequest) {
    try {
        const context = await getShoppingListCustomerContext();
        if (!context) {
            return NextResponse.json(
                { message: 'Customer is not logged in' },
                { status: 401 },
            );
        }

        const body = await request.json() as { name?: unknown };
        const name = typeof body.name === 'string' ? body.name.trim() : '';

        if (!name || name.length > 100) {
            return NextResponse.json(
                { message: 'Shopping list name must be between 1 and 100 characters' },
                { status: 400 },
            );
        }

        const shoppingList = await createCustomerShoppingList(context, name);

        return NextResponse.json({
            id: shoppingList.id,
            name: shoppingList.name.en ?? Object.values(shoppingList.name)[0] ?? name,
            products: [],
            lineItems: [],
        });
    } catch (error) {
        console.error('Create shopping list failed:', error);
        return NextResponse.json(
            { message: getErrorMessage(error, 'Failed to create shopping list') },
            { status: getErrorStatus(error) },
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const context = await getShoppingListCustomerContext();
        if (!context) {
            return NextResponse.json(
                { message: 'Customer is not logged in' },
                { status: 401 },
            );
        }

        const requestedLocale = request.nextUrl.searchParams.get('locale');
        const locale = requestedLocale === 'de' ? 'de-DE' : 'en-US';
        const shoppingLists = await getWishlistProducts(
            context.customerId,
            locale,
            context.storeKey,
        );

        return NextResponse.json(shoppingLists);
    } catch (error) {
        console.error('Failed to load shopping lists:', error);
        return NextResponse.json(
            { message: getErrorMessage(error, 'Failed to load shopping lists') },
            { status: getErrorStatus(error) },
        );
    }
}
