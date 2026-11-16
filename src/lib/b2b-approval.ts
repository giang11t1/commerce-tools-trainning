import 'server-only';

import type { ApprovalRule, BusinessUnit, Cart } from '@commercetools/platform-sdk';
import { getSession } from './auth';
import { associateInUnit, getSelectedBusinessUnit } from './b2b-context';
import { assertBusinessCart } from './b2b-cart-draft';
import { getMyBusinessUnits } from './business-units';
import { getCart } from './cart';
import { evaluateApprovalRules, type ApprovalEvaluation } from './approval-evaluation';

const PAGE_SIZE = 500;

export const APPROVAL_REQUIRED_MESSAGE =
    'This order requires approval. Submit it for approval instead of paying now.';
export const APPROVAL_UNSUPPORTED_MESSAGE =
    'An active Approval Rule for this Business Unit uses conditions checkout cannot evaluate. Checkout is blocked so approval is not bypassed; contact your administrator.';

function associateRoleKeys(unit: BusinessUnit, customerId: string) {
    return new Set([
        ...(unit.associates ?? []),
        ...(unit.associateMode === 'ExplicitAndFromParent' ? unit.inheritedAssociates ?? [] : []),
    ]
        .filter((associate) => associate.customer.id === customerId)
        .flatMap((associate) => associate.associateRoleAssignments
            .map((assignment) => assignment.associateRole.key)));
}

async function getActiveApprovalRules(customerId: string, unitKey: string) {
    const rules: ApprovalRule[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
        const page = (await associateInUnit(customerId, unitKey).approvalRules().get({
            queryArgs: { where: 'status = "Active"', limit: PAGE_SIZE, offset, sort: 'id asc' },
        }).execute()).body;
        rules.push(...page.results);
        if (page.results.length < PAGE_SIZE) return rules;
    }
}

export function isApprovalReadyCart(cart: Cart) {
    return cart.cartState === 'Active' && cart.lineItems.length > 0 && !!cart.shippingAddress?.country &&
        cart.shippingInfo?.shippingMethodState === 'MatchesCart';
}

/** Evaluates the cart that would become the Associate's Order against the Business Unit's active rules. */
export async function evaluateBusinessCart(
    customerId: string,
    unit: BusinessUnit,
    cart: Cart,
): Promise<ApprovalEvaluation> {
    assertBusinessCart(cart, customerId, unit.key);
    const rules = await getActiveApprovalRules(customerId, unit.key);
    return evaluateApprovalRules(rules, associateRoleKeys(unit, customerId), cart);
}

/** Server guard for payment-based order placement; fails closed for business carts. */
export async function assertPaymentCheckoutAllowed(cart: Cart) {
    if (!cart.businessUnit) {
        if (!(await getSession())) return;
        const units = await getMyBusinessUnits();
        if (!units.success) throw new Error(units.error);
        if (units.businessUnits.some((unit) => unit.status === 'Active')) {
            throw new Error('Select a Business Unit before continuing.');
        }
        return;
    }
    const selected = await getSelectedBusinessUnit();
    if (!selected || selected.unit.key !== cart.businessUnit.key) {
        throw new Error('Select the Business Unit for this cart before continuing.');
    }
    const decision = await evaluateBusinessCart(selected.customerId, selected.unit, cart);
    if (decision.status === 'approval-required') throw new Error(APPROVAL_REQUIRED_MESSAGE);
    if (decision.status === 'unsupported') throw new Error(APPROVAL_UNSUPPORTED_MESSAGE);
}

export async function assertCurrentCartPaymentAllowed() {
    const cart = await getCart();
    if (!cart) throw new Error('Your active cart could not be found. Return to your cart and try again.');
    await assertPaymentCheckoutAllowed(cart);
    return cart;
}
