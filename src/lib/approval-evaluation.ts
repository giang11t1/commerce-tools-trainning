import type { ApprovalRule, Cart } from '@commercetools/platform-sdk';

export type ApprovalEvaluation =
    | { status: 'approval-required'; ruleIds: string[] }
    | { status: 'no-approval-required' }
    | { status: 'unsupported'; ruleIds: string[] };

type EvaluatedCart = Pick<Cart, 'totalPrice' | 'shippingAddress'>;
type Node =
    | { type: 'and' | 'or'; left: Node; right: Node }
    | { type: 'compare'; field: 'totalPrice' | 'currency' | 'country'; operator: string; value: string };

const TOKEN = /\s*(\(|\)|>=|<=|!=|=|>|<|"(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_.]*)/y;
const FIELDS = {
    totalPrice: 'totalPrice',
    'totalPrice.currencyCode': 'currency',
    'shippingAddress.country': 'country',
} as const;

function tokenize(predicate: string) {
    const tokens: string[] = [];
    TOKEN.lastIndex = 0;
    while (TOKEN.lastIndex < predicate.length) {
        if (!predicate.slice(TOKEN.lastIndex).trim()) break;
        const match = TOKEN.exec(predicate);
        if (!match) return undefined;
        tokens.push(match[1]);
    }
    return tokens;
}

/**
 * Parses the Order Predicate subset produced by the storefront's Approval Rule
 * builder. Any other syntax returns undefined so callers can fail closed.
 */
export function parseApprovalPredicate(predicate: string): Node | undefined {
    const tokens = tokenize(predicate);
    if (!tokens?.length) return undefined;
    let index = 0;
    const peek = () => tokens[index]?.toLowerCase();

    function primary(): Node | undefined {
        if (tokens![index] === '(') {
            index += 1;
            const node = or();
            if (!node || tokens![index] !== ')') return undefined;
            index += 1;
            return node;
        }
        const field = FIELDS[tokens![index] as keyof typeof FIELDS];
        const operator = tokens![index + 1];
        const literal = tokens![index + 2];
        if (!field || !operator || !literal?.startsWith('"')) return undefined;
        const allowed = field === 'totalPrice' ? ['=', '>', '>=', '<', '<='] : ['=', '!='];
        if (!allowed.includes(operator)) return undefined;
        index += 3;
        return { type: 'compare', field, operator, value: JSON.parse(literal) as string };
    }

    function and(): Node | undefined {
        let node = primary();
        while (node && peek() === 'and') {
            index += 1;
            const right = primary();
            node = right && { type: 'and', left: node, right };
        }
        return node;
    }

    function or(): Node | undefined {
        let node = and();
        while (node && peek() === 'or') {
            index += 1;
            const right = and();
            node = right && { type: 'or', left: node, right };
        }
        return node;
    }

    const node = or();
    return node && index === tokens.length ? node : undefined;
}

function toMinorUnits(amount: string, fractionDigits: number) {
    const [whole, fraction = ''] = amount.split('.');
    if (fraction.length > fractionDigits) return undefined;
    return BigInt(whole + fraction.padEnd(fractionDigits, '0'));
}

function evaluateNode(node: Node, cart: EvaluatedCart): boolean | undefined {
    if (node.type !== 'compare') {
        const left = evaluateNode(node.left, cart);
        const right = evaluateNode(node.right, cart);
        if (left === undefined || right === undefined) return undefined;
        return node.type === 'and' ? left && right : left || right;
    }
    if (node.field === 'currency' || node.field === 'country') {
        const actual = node.field === 'currency'
            ? cart.totalPrice.currencyCode
            : cart.shippingAddress?.country;
        if (!actual) return undefined;
        return node.operator === '=' ? actual === node.value : actual !== node.value;
    }

    const match = /^(\d{1,15}(?:\.\d{1,12})?) ([A-Z]{3})$/.exec(node.value);
    if (!match) return undefined;
    if (match[2] !== cart.totalPrice.currencyCode) return false;
    const limit = toMinorUnits(match[1], cart.totalPrice.fractionDigits);
    if (limit === undefined) return undefined;
    const total = BigInt(cart.totalPrice.centAmount);
    switch (node.operator) {
        case '=': return total === limit;
        case '>': return total > limit;
        case '>=': return total >= limit;
        case '<': return total < limit;
        default: return total <= limit;
    }
}

/**
 * Mirrors commercetools rule selection for an Order created by the Associate:
 * an Active rule applies when the Associate holds a requester role and the
 * rule predicate matches the cart that becomes the Order.
 */
export function evaluateApprovalRules(
    rules: Pick<ApprovalRule, 'id' | 'status' | 'predicate' | 'requesters'>[],
    associateRoleKeys: ReadonlySet<string>,
    cart: EvaluatedCart,
): ApprovalEvaluation {
    const matched: string[] = [];
    const unsupported: string[] = [];
    for (const rule of rules) {
        if (rule.status !== 'Active') continue;
        if (!rule.requesters.some(({ associateRole }) => associateRoleKeys.has(associateRole.key))) continue;
        const node = parseApprovalPredicate(rule.predicate);
        const result = node && evaluateNode(node, cart);
        if (result === undefined) unsupported.push(rule.id);
        else if (result) matched.push(rule.id);
    }
    if (matched.length) return { status: 'approval-required', ruleIds: matched };
    if (unsupported.length) return { status: 'unsupported', ruleIds: unsupported };
    return { status: 'no-approval-required' };
}
