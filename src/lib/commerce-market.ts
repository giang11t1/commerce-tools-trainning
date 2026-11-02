import { getLocalizationInfo } from '../../project.config';

export type CommerceMarket = {
    locale: string;
    currency: string;
    country: string;
    fractionDigits: number;
};

export function getCommerceMarket(locale = 'en-US'): CommerceMarket {
    const localeKey = locale.split('-')[0];
    const localization = getLocalizationInfo(localeKey);

    return {
        locale: localization.locale,
        currency: localization.currency,
        country: localization.countryCode,
        fractionDigits:
            new Intl.NumberFormat(localization.locale, {
                style: 'currency',
                currency: localization.currency,
            }).resolvedOptions().maximumFractionDigits ?? 2,
    };
}

export function toMinorAmount(amount: number, market: CommerceMarket): number {
    return Math.round(amount * 10 ** market.fractionDigits);
}

export function formatMarketPrice(amount: number, market: CommerceMarket): string {
    return new Intl.NumberFormat(market.locale, {
        style: 'currency',
        currency: market.currency,
    }).format(amount);
}
