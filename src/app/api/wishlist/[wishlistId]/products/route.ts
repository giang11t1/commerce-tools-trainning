import { NextRequest, NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';
import { getSession } from '@/lib/auth';

export async function POST(
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

        const customerId =
            await getSession();

        if (!customerId) {
            return NextResponse.json(
                {
                    message:
                        'Customer is not logged in',
                },
                { status: 401 }
            );
        }

        const {
            productId,
        } = await request.json();

        if (!productId) {
            return NextResponse.json(
                {
                    message:
                        'Product ID is required',
                },
                { status: 400 }
            );
        }

        const wishlistResponse =
            await apiRoot
                .withProjectKey({
                    projectKey:
                        process.env.CT_PROJECT_KEY!,
                })
                .shoppingLists()
                .withId({
                    ID: wishlistId,
                })
                .get()
                .execute();
        const wishlist = wishlistResponse.body;

        if (wishlist.customer?.id !== customerId) {
            return NextResponse.json(
                { message: 'Wishlist does not belong to customer' },
                { status: 403 }
            );
        }

        await apiRoot
            .withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
            .productProjections()
            .withId({ ID: productId })
            .get()
            .execute();

        const textLineItemKey = `wishlist-product-${productId}`;
        const alreadyExists =
            wishlist.lineItems.some((item) => item.productId === productId) ||
            (wishlist.textLineItems ?? []).some(
                (item) => item.key === textLineItemKey
            );

        if (alreadyExists) {
            return NextResponse.json({ success: true, alreadyExists: true });
        }

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
                        version: wishlist.version,
                        actions: [
                            {
                                action: 'addTextLineItem',
                                key: textLineItemKey,
                                name: { en: productId },
                                quantity: 1,
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
            'Failed to add product to wishlist:',
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
                    'Failed to add product to wishlist',
            },
            {
                status:
                    error?.statusCode ?? 500,
            }
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

        const { lineItemId, productId } = await request.json();

        if (!lineItemId && !productId) {
            return NextResponse.json(
                {
                    message: 'Line item ID is required',
                },
                { status: 400 }
            );
        }

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

        if (wishlist.customer?.id !== customerId) {
            return NextResponse.json(
                { message: 'Wishlist does not belong to customer' },
                { status: 403 }
            );
        }

        const textLineItem = (wishlist.textLineItems ?? []).find(
            (item) => item.key === `wishlist-product-${productId}`
        );
        const lineItem = wishlist.lineItems.find(
            (item) => item.id === lineItemId || item.productId === productId
        );

        if (!lineItem && !textLineItem) {
            return NextResponse.json(
                {
                    message: 'Wishlist item not found',
                    lineItemId,
                },
                { status: 404 }
            );
        }

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
                        textLineItem
                            ? {
                                action: 'removeTextLineItem',
                                textLineItemId: textLineItem.id,
                            }
                            : {
                                action: 'removeLineItem',
                                lineItemId: lineItem!.id,
                            }],
                },
            })
            .execute();

        return NextResponse.json({
            success: true,
            wishlist: response.body,
        });
    } catch (error: any) {
        console.error(
            'Failed to remove product from wishlist:',
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
                    'Failed to remove product from wishlist',
            },
            {
                status:
                    error?.statusCode ?? 500,
            }
        );
    }
}
