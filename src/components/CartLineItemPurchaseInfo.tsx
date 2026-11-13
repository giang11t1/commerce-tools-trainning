'use client';

import type { LineItem } from '@commercetools/platform-sdk';
import { getLocalizationInfo } from '@/../project.config';
import { useLocale, useTranslations } from 'use-intl';
import { getLineItemPurchaseType } from '@/lib/cart-line-item';
import PriceDisplay from '@/components/PriceDisplay';

function getScheduleTranslationKey(unit: string, value: number) {
    if (unit === 'Days') return value === 1 ? 'day' : 'days';
    if (unit === 'Weeks') return value === 1 ? 'week' : 'weeks';
    return value === 1 ? 'month' : 'months';
}

export default function CartLineItemPurchaseInfo({
    lineItem,
}: {
    lineItem: LineItem;
}) {
    const translate = useTranslations('subscriptions');
    const locale = useLocale();

    if (getLineItemPurchaseType(lineItem) === 'one-time') {
        return (
            <div className="mt-1 text-sm text-gray-600">
                <p>{translate('oneTimePurchase')}</p>
                <p>
                    {translate('unitPrice')}:{' '}
                    <PriceDisplay
                        money={lineItem.price.discounted?.value ?? lineItem.price.value}
                        locale={locale}
                    />
                </p>
            </div>
        );
    }

    const policy = lineItem.recurrenceInfo?.recurrencePolicy.obj;
    const policyName = policy?.name?.[getLocalizationInfo(locale).locale]
        ?? policy?.name?.[locale]
        ?? policy?.name?.en
        ?? policy?.key;
    const schedule = policy?.schedule;
    let frequency = translate('frequencyUnavailable');

    if (schedule?.type === 'dayOfMonth') {
        frequency = translate('dayOfMonth', { day: schedule.day });
    } else if (schedule?.type === 'standard') {
        const unit = translate(getScheduleTranslationKey(schedule.intervalUnit, schedule.value));
        frequency = schedule.value === 1
            ? translate('frequencyEveryOne', { unit })
            : translate('frequencyEvery', { count: schedule.value, unit });
    }

    return (
        <div className="mt-1 text-sm text-gray-600">
            <p className="font-medium text-blue-700">
                {translate('subscribeAndSave')}
            </p>
            <p>
                {policyName ? `${policyName} · ` : ''}
                {frequency}
            </p>
            <p>
                {translate('unitPrice')}:{' '}
                <PriceDisplay
                    money={lineItem.price.discounted?.value ?? lineItem.price.value}
                    locale={locale}
                />
            </p>
        </div>
    );
}
