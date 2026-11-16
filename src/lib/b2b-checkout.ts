'use server';

import { cookies } from 'next/headers';
import { getSession } from './auth';
import { getMyBusinessUnits } from './business-units';
import { associateInUnit, BUSINESS_UNIT_COOKIE, requireBusinessUnit } from './b2b-context';
import { getCartRequest, getCartSessionContext } from './cart';
import { assertBusinessCart, assertBusinessCartMigration, assertBusinessOrderCart, createBusinessCartDraft } from './b2b-cart-draft';
import { associateClient } from './commercetools';
import type { Cart } from '@commercetools/platform-sdk';
import type { ApprovalFlow } from './approvals';
import { APPROVAL_UNSUPPORTED_MESSAGE, evaluateBusinessCart, isApprovalReadyCart } from './b2b-approval';

const CART_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getBusinessCheckoutOptions() {
    if (!(await getSession())) return [];
    const result = await getMyBusinessUnits();
    if (!result.success) throw new Error(result.error);
    return result.businessUnits
        .filter((unit) => unit.status === 'Active')
        .map(({ key, name }) => ({ key, name }));
}

export type BusinessApprovalCheck =
    | { success: true; status: 'approval-required' | 'no-approval-required'; cart: Cart }
    | { success: false; error: string };

/** Determines from the Business Unit's commercetools Approval Rules whether the current cart needs approval. */
export async function evaluateBusinessCartApproval(cartId: string): Promise<BusinessApprovalCheck> {
    try {
        if (typeof cartId !== 'string' || !CART_ID_PATTERN.test(cartId)) throw new Error('Invalid cart.');
        const jar = await cookies();
        const key = jar.get(BUSINESS_UNIT_COOKIE)?.value;
        if (!key || jar.get('cartId')?.value !== cartId) throw new Error('Select your Business Unit and current cart.');
        const { customerId, unit } = await requireBusinessUnit(key);
        const cart = (await associateInUnit(customerId, key).carts().withId({ ID: cartId }).get({
            queryArgs: { expand: ['lineItems[*].recurrenceInfo.recurrencePolicy'] },
        }).execute()).body;
        if (!isApprovalReadyCart(cart)) {
            throw new Error('Complete your shipping address and shipping method before payment.');
        }
        const decision = await evaluateBusinessCart(customerId, unit, cart);
        if (decision.status === 'unsupported') return { success: false, error: APPROVAL_UNSUPPORTED_MESSAGE };
        return { success: true, status: decision.status, cart };
    } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        console.error('Business approval evaluation failed:', statusCode ?? (error instanceof Error ? error.message : 'Unknown error'));
        return {
            success: false,
            error: statusCode === 401 || statusCode === 403
                ? 'Approval Rules could not be loaded for this Business Unit. Ask your administrator to check approval permissions.'
                : error instanceof Error ? error.message : 'Approval requirements could not be checked.',
        };
    }
}

export async function selectCheckoutBusinessUnit(key: string) {
    try {
        const { customerId, unit } = await requireBusinessUnit(key);
        const jar = await cookies();
        const cartId = jar.get('cartId')?.value;
        if (!cartId) throw new Error('An active cart is required.');
        const source = (await (await getCartRequest(cartId)).get({
            queryArgs: { expand: ['discountCodes[*].discountCode'] },
        }).execute()).body;
        if (source.cartState !== 'Active' || (source.customerId && source.customerId !== customerId)) {
            throw new Error('Only your active cart can be used for a business purchase.');
        }
        const { storeKey } = await getCartSessionContext();
        const stores = unit.storeMode === 'FromParent' ? unit.inheritedStores : unit.stores;
        if ((storeKey && source.store?.key !== storeKey) ||
            (!source.store && stores?.length) ||
            (source.store && !stores?.some((store) => store.key === source.store?.key))) {
            throw new Error('This Business Unit cannot purchase from the cart Store.');
        }
        let cart = source;
        if (source.businessUnit?.key !== key) {
            const draft = createBusinessCartDraft(source, customerId, key);
            cart = (await associateInUnit(customerId, key).carts().post({
                body: draft,
                queryArgs: { expand: ['lineItems[*].recurrenceInfo.recurrencePolicy'] },
            }).execute()).body;
            assertBusinessCartMigration(source, cart);
        }
        assertBusinessCart(cart, customerId, key);
        const latestSource = (await (await getCartRequest(source.id)).get().execute()).body;
        if (latestSource.version !== source.version) throw new Error('Your cart changed during selection. Refresh and try again.');
        const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
        jar.set(BUSINESS_UNIT_COOKIE, key, options);
        jar.set('cartId', cart.id, options);
        return { success: true as const, cart };
    } catch (error) {
        console.error('Business cart selection failed:', error instanceof Error ? error.message : 'Unknown error');
        return { success: false as const, error: error instanceof Error ? error.message : 'Business cart selection failed.' };
    }
}

export async function submitBusinessOrderForApproval(cartId: string, version: number) {
    try {
        if (typeof cartId !== 'string' || !/^[0-9a-f-]{36}$/i.test(cartId) ||
            !Number.isInteger(version) || version < 1) throw new Error('Invalid cart submission.');
        const jar = await cookies();
        const key = jar.get(BUSINESS_UNIT_COOKIE)?.value;
        if (!key || jar.get('cartId')?.value !== cartId) throw new Error('Select your Business Unit and current cart.');
        const { customerId, unit } = await requireBusinessUnit(key);
        const resource = associateInUnit(customerId, key);
        // A retry after a lost response must return the actual existing Order.
        const existing = (await resource.orders().get({
            queryArgs: { where: `cart(id=${JSON.stringify(cartId)})`, limit: 1 },
        }).execute()).body.results[0];
        if (existing) {
            if (existing.customerId !== customerId || existing.businessUnit?.key !== key) {
                throw new Error('The existing Order does not belong to your customer and Business Unit.');
            }

            return { success: true as const, orderId: existing.id };
        }
        const cart = (await resource.carts().withId({ ID: cartId }).get().execute()).body;
        assertBusinessOrderCart(cart, customerId, key, version);
        const decision = await evaluateBusinessCart(customerId, unit, cart);
        if (decision.status === 'unsupported') throw new Error(APPROVAL_UNSUPPORTED_MESSAGE);
        if (decision.status !== 'approval-required') {
            throw new Error('This order does not require approval. Refresh checkout to pay and place the order.');
        }
        // commercetools starts the Approval Flow when the Associate creates the Order; payment stays Pending.
        const order = (await resource.orders().post({
            body: {
                cart: { typeId: 'cart', id: cart.id },
                version: cart.version,
                orderState: 'Open',
                paymentState: 'Pending',
            },
        }).execute()).body;
        if (order.businessUnit?.key !== key || order.customerId !== customerId) {
            throw new Error(`Order ${order.id} was created with unexpected context. Do not retry; contact support.`);
        }
        return { success: true as const, orderId: order.id };
    } catch (error) {
        console.error('Business approval submission failed:', error instanceof Error ? error.message : 'Unknown error');
        return { success: false as const, error: error instanceof Error ? error.message : 'Business order submission failed.' };
    }
}

export async function getBusinessOrderFlow(unitKey: string, orderId: string) {
    try {
        if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error('Invalid Order ID.');
        const { customerId } = await requireBusinessUnit(unitKey);
        const order = (await associateInUnit(customerId, unitKey).orders().withId({ ID: orderId }).get().execute()).body;
        if (order.customerId !== customerId) throw new Error('This Order does not belong to your account.');
        const query = new URLSearchParams({ where: `order(id=${JSON.stringify(orderId)})`, limit: '1' });
        const response = await associateClient.execute<{ results: ApprovalFlow[] }>({
            method: 'GET',
            uri: `/${encodeURIComponent(process.env.CT_PROJECT_KEY!)}/as-associate/${encodeURIComponent(customerId)}/in-business-unit/key=${encodeURIComponent(unitKey)}/approval-flows?${query}`,
        });
        if (!response.body) throw new Error('The Approval Flow API returned an empty response.');
        return { success: true as const, flow: response.body.results[0] };
    } catch (error) {
        return { success: false as const, error: error instanceof Error ? error.message : 'Approval Flow lookup failed.' };
    }
}
