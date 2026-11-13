import 'server-only';

import { cookies } from 'next/headers';
import type {
    ShoppingList,
    ShoppingListUpdateAction,
} from '@commercetools/platform-sdk';
import { apiRoot } from '@/lib/commercetools';
import { getSession } from '@/lib/auth';
import { getCustomerById } from '@/lib/customer';

export interface ShoppingListCustomerContext {
    customerId: string;
    storeKey?: string;
}

export class ShoppingListAccessError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ShoppingListAccessError';
    }
}

const project = () =>
    apiRoot.withProjectKey({
        projectKey: process.env.CT_PROJECT_KEY!,
    });

export async function getShoppingListCustomerContext():
    Promise<ShoppingListCustomerContext | null> {
    const customerId = await getSession();

    if (!customerId) {
        return null;
    }

    const customer = await getCustomerById(customerId);

    if (!customer) {
        throw new Error('Could not load the authenticated customer');
    }

    const customerStoreKeys = customer.stores
        ?.map((store) => store.key)
        .filter((key): key is string => Boolean(key)) ?? [];
    const sessionStoreKey = (await cookies())
        .get('ct_customer_store_key')?.value;

    if (sessionStoreKey && !customerStoreKeys.includes(sessionStoreKey)) {
        throw new ShoppingListAccessError(
            'The active store does not belong to this customer',
        );
    }

    if (!sessionStoreKey && customerStoreKeys.length > 1) {
        throw new ShoppingListAccessError(
            'A store must be selected for this customer',
        );
    }

    return {
        customerId,
        storeKey: sessionStoreKey ?? customerStoreKeys[0],
    };
}

export async function getOwnedShoppingList(
    context: ShoppingListCustomerContext,
    shoppingListId: string,
): Promise<ShoppingList> {
    const response = context.storeKey
        ? await project()
            .inStoreKeyWithStoreKeyValue({ storeKey: context.storeKey })
            .shoppingLists()
            .withId({ ID: shoppingListId })
            .get()
            .execute()
        : await project()
            .shoppingLists()
            .withId({ ID: shoppingListId })
            .get()
            .execute();
    const shoppingList = response.body;

    if (
        shoppingList.customer?.id !== context.customerId ||
        shoppingList.store?.key !== context.storeKey
    ) {
        throw new ShoppingListAccessError(
            'Shopping list does not belong to this customer and store',
        );
    }

    return shoppingList;
}

export async function createCustomerShoppingList(
    context: ShoppingListCustomerContext,
    name: string,
): Promise<ShoppingList> {
    const body = {
        name: { en: name },
        customer: {
            typeId: 'customer' as const,
            id: context.customerId,
        },
        ...(context.storeKey && {
            store: {
                typeId: 'store' as const,
                key: context.storeKey,
            },
        }),
    };

    const response = context.storeKey
        ? await project()
            .inStoreKeyWithStoreKeyValue({ storeKey: context.storeKey })
            .shoppingLists()
            .post({ body })
            .execute()
        : await project()
            .shoppingLists()
            .post({ body })
            .execute();

    return response.body;
}

export async function updateCustomerShoppingList(
    context: ShoppingListCustomerContext,
    shoppingList: ShoppingList,
    actions: ShoppingListUpdateAction[],
): Promise<ShoppingList> {
    const body = {
        body: {
            version: shoppingList.version,
            actions,
        },
    };

    const response = context.storeKey
        ? await project()
            .inStoreKeyWithStoreKeyValue({ storeKey: context.storeKey })
            .shoppingLists()
            .withId({ ID: shoppingList.id })
            .post(body)
            .execute()
        : await project()
            .shoppingLists()
            .withId({ ID: shoppingList.id })
            .post(body)
            .execute();

    return response.body;
}

export async function deleteCustomerShoppingList(
    context: ShoppingListCustomerContext,
    shoppingList: ShoppingList,
): Promise<void> {
    const queryArgs = { queryArgs: { version: shoppingList.version } };

    if (context.storeKey) {
        await project()
            .inStoreKeyWithStoreKeyValue({ storeKey: context.storeKey })
            .shoppingLists()
            .withId({ ID: shoppingList.id })
            .delete(queryArgs)
            .execute();
        return;
    }

    await project()
        .shoppingLists()
        .withId({ ID: shoppingList.id })
        .delete(queryArgs)
        .execute();
}
