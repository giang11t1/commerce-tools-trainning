export type ApprovalCondition =
    | {
          field: 'totalPrice';
          operator: '=' | '>' | '>=' | '<' | '<=';
          value: string;
          currency: string;
      }
    | { field: 'currency'; value: string }
    | { field: 'country'; value: string };

export function isValidApprovalCondition(
    condition: unknown,
): condition is ApprovalCondition {
    if (!condition || typeof condition !== 'object') return false;
    const candidate = condition as Partial<ApprovalCondition>;

    if (candidate.field === 'totalPrice') {
        return (
            typeof candidate.value === 'string' &&
            /^\d{1,10}(\.\d{1,2})?$/.test(candidate.value) &&
            typeof candidate.currency === 'string' &&
            /^[A-Z]{3}$/.test(candidate.currency) &&
            ['=', '>', '>=', '<', '<='].includes(candidate.operator ?? '')
        );
    }

    if (candidate.field === 'currency') {
        return typeof candidate.value === 'string' && /^[A-Z]{3}$/.test(candidate.value);
    }

    if (candidate.field === 'country') {
        return typeof candidate.value === 'string' && /^[A-Z]{2}$/.test(candidate.value);
    }

    return false;
}

export function buildApprovalPredicate(
    conditions: ApprovalCondition[],
    operator: 'and' | 'or',
) {
    const predicates = conditions.map((condition) => {
        if (condition.field === 'totalPrice') {
            return `totalPrice ${condition.operator} "${condition.value} ${condition.currency}"`;
        }
        if (condition.field === 'currency') {
            return `totalPrice.currencyCode = "${condition.value}"`;
        }
        return `shippingAddress.country = "${condition.value}"`;
    });

    return predicates.map((predicate) => `(${predicate})`).join(` ${operator} `);
}
