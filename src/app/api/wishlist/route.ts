import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiRoot } from '@/lib/commercetools';
import { getSession } from '@/lib/auth';
import { getCustomerById } from '@/lib/customer';
import { getWishlistProducts } from '@/lib/products';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const name = body.name?.trim();

        if (!name) {
            return NextResponse.json(
                {
                    message:
                        'Wishlist name is required',
                },
                { status: 400 }
            );
        }

        const customerId = await getSession();

        console.log('WISHLIST customerId:', customerId);

        if (!customerId) {
            return NextResponse.json(
                {
                    message: 'Customer is not logged in',
                },
                { status: 401 }
            );
        }

        const customer = await getCustomerById(customerId);
        if (!customer) {
            return NextResponse.json(
                { message: 'Could not load customer store membership' },
                { status: 500 }
            );
        }

        const customerStoreKeys = customer.stores
            ?.map((store) => store.key)
            .filter((key): key is string => Boolean(key)) ?? [];
        const sessionStoreKey = (await cookies())
            .get('ct_customer_store_key')?.value;
        const storeKey = sessionStoreKey && customerStoreKeys.includes(sessionStoreKey)
            ? sessionStoreKey
            : customerStoreKeys[0];
        const project = apiRoot.withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        });
        const shoppingLists = storeKey
            ? project
                .inStoreKeyWithStoreKeyValue({ storeKey })
                .shoppingLists()
            : project.shoppingLists();

        const response =
            await shoppingLists
                .post({
                    body: {
                        name: {
                            en: name,
                        },
                        customer: {
                            typeId: 'customer',
                            id: customerId,
                        },
                        ...(storeKey && {
                            store: {
                                typeId: 'store' as const,
                                key: storeKey,
                            },
                        }),
                    },
                })
                .execute();

        return NextResponse.json({
            id: response.body.id,
            name:
                response.body.name.en ??
                Object.values(
                    response.body.name
                )[0] ??
                name,
            products: [],
        });
    } catch (error: any) {
        console.error(
            'Create wishlist error:',
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
                    'Failed to create wishlist',
                errors:
                    error?.body?.errors ?? [],
            },
            {
                status:
                    error?.statusCode ?? 500,
            }
        );
    }
}


export async function GET() {
    try {
        const customerId = await getSession();

        if (!customerId) {
            return NextResponse.json(
                { message: 'Customer is not logged in' },
                { status: 401 }
            );
        }

        const wishlists = await getWishlistProducts(customerId);
        return NextResponse.json(wishlists);
    } catch (error) {
        console.error(
            'Failed to get wishlists:',
            error
        );

        return NextResponse.json(
            { message: 'Failed to get wishlists' },
            { status: 500 }
        );
    }
}
