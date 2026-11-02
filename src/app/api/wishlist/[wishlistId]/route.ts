import { NextRequest, NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';
import { getSession } from '@/lib/auth';

interface RouteContext {
    params: Promise<{
        wishlistId: string;
    }>;
}

export async function POST(
    request: NextRequest,
    { params }: RouteContext
) {
    try {
        const { wishlistId } = await params;

        const customerId = await getSession();

        if (!customerId) {
            return NextResponse.json(
                {
                    message: 'Customer is not logged in',
                },
                { status: 401 }
            );
        }

        const body = await request.json();

        const {
            productId,
            variantId,
        } = body;

        if (!productId) {
            return NextResponse.json(
                {
                    message: 'productId is required',
                },
                { status: 400 }
            );
        }

        // Get wishlist first to make sure
        // it belongs to the current customer.
        const wishlistResponse =
            await apiRoot
                .withProjectKey({
                    projectKey: process.env.CT_PROJECT_KEY!,
                })
                .shoppingLists()
                .withId({
                    ID: wishlistId,
                })
                .get({
                    queryArgs: {
                        expand: [
                            'lineItems[*].variant',
                        ],
                    },
                })
                .execute();

        const wishlist =
            wishlistResponse.body;

        if (
            wishlist.customer?.id !==
            customerId
        ) {
            return NextResponse.json(
                {
                    message:
                        'Wishlist does not belong to customer',
                },
                { status: 403 }
            );
        }

        // Check if product already exists
        const existingLineItem =
            wishlist.lineItems.find(
                (item) =>
                    item.productId === productId &&
                    item.variant?.id === variantId
            );

        if (existingLineItem) {
            return NextResponse.json({
                id: wishlist.id,
                message:
                    'Product already exists in wishlist',
                lineItem:
                existingLineItem,
            });
        }

        const updateAction = {
            action: 'addLineItem' as const,
            productId,
            ...(variantId
                ? { variantId }
                : {}),
            quantity: 1,
        };

        const response =
            await apiRoot
                .withProjectKey({
                    projectKey:
                        process.env.CT_PROJECT_KEY!,
                })
                .shoppingLists()
                .withId({
                    ID: wishlistId,
                })
                .post({
                    body: {
                        version:
                        wishlist.version,
                        actions: [
                            updateAction,
                        ],
                    },
                })
                .execute();

        return NextResponse.json({
            id: response.body.id,
            version:
            response.body.version,
            message:
                'Product added to wishlist',
            lineItem:
                response.body.lineItems[
                response.body
                    .lineItems.length - 1
                    ],
        });
    } catch (error: any) {
        console.error(
            'Failed to add product to wishlist:',
            error
        );

        return NextResponse.json(
            {
                message:
                    error?.body?.message ||
                    error?.message ||
                    'Failed to add product to wishlist',
            },
            { status: 500 }
        );
    }
}




export async function DELETE(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{
            wishlistId: string;
        }>;
    }
) {
    try {
        const { wishlistId } = await params;

        const customerId = await getSession();

        if (!customerId) {
            return NextResponse.json(
                {
                    message: 'Customer is not logged in',
                },
                { status: 401 }
            );
        }

        // Get current wishlist first
        const wishlistResponse = await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .shoppingLists()
            .withId({
                ID: wishlistId,
            })
            .get()
            .execute();

        const wishlist = wishlistResponse.body;

        // Delete wishlist using current version
        await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .shoppingLists()
            .withId({
                ID: wishlistId,
            })
            .delete({
                queryArgs: {
                    version: wishlist.version,
                },
            })
            .execute();

        return NextResponse.json({
            success: true,
            wishlistId,
        });
    } catch (error: any) {
        console.error(
            'Failed to delete wishlist:',
            JSON.stringify(
                error?.body ?? error,
                null,
                2
            )
        );

        return NextResponse.json(
            {
                message:
                    error?.body?.message ??
                    error?.message ??
                    'Failed to delete wishlist',
            },
            {
                status:
                    error?.statusCode ?? 500,
            }
        );
    }
}


export async function PATCH(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{
            wishlistId: string;
        }>;
    }
) {
    try {
        const { wishlistId } = await params;

        const customerId = await getSession();

        if (!customerId) {
            return NextResponse.json(
                {
                    message: 'Customer is not logged in',
                },
                { status: 401 }
            );
        }

        const { name } = await request.json();

        const trimmedName = name?.trim();

        if (!trimmedName) {
            return NextResponse.json(
                {
                    message: 'Wishlist name is required',
                },
                { status: 400 }
            );
        }

        // Get current wishlist
        const wishlistResponse = await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .shoppingLists()
            .withId({
                ID: wishlistId,
            })
            .get()
            .execute();

        const wishlist = wishlistResponse.body;

        // Update wishlist name
        const response = await apiRoot
            .withProjectKey({
                projectKey: process.env.CT_PROJECT_KEY!,
            })
            .shoppingLists()
            .withId({
                ID: wishlistId,
            })
            .post({
                body: {
                    version: wishlist.version,
                    actions: [
                        {
                            action: 'changeName',
                            name: {
                                'en-US': trimmedName,
                            },
                        },
                    ],
                },
            })
            .execute();

        return NextResponse.json({
            success: true,
            wishlist: response.body,
        });
    } catch (error: any) {
        console.error(
            'Failed to rename wishlist:',
            JSON.stringify(
                error?.body ?? error,
                null,
                2
            )
        );

        return NextResponse.json(
            {
                message:
                    error?.body?.message ??
                    error?.message ??
                    'Failed to rename wishlist',
            },
            {
                status:
                    error?.statusCode ?? 500,
            }
        );
    }
}
