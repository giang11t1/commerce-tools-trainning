import type { TypedMoney } from '@commercetools/platform-sdk';
import { formatMoney, type MoneyValue } from '@/lib/checkout-utils';

interface PriceDisplayProps {
    money: MoneyValue | TypedMoney;
    locale?: string;
    className?: string;
}

export default function PriceDisplay({
    money,
    locale = 'en-US',
    className,
}: PriceDisplayProps) {
    return <span className={className}>{formatMoney(money, locale)}</span>;
}
