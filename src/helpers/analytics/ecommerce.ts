'use client';

import type { LineItem } from '@commercetools/platform-sdk';

export function trackAddToCart(
    lineItem: LineItem,
    quantity: number,
    currency: string
) {
    if (typeof window === 'undefined') return;

    const dataLayer = (
        window as typeof window & {
            dataLayer?: Record<string, unknown>[];
        }
    ).dataLayer;

    if (!dataLayer) return;

    const fractionDigits =
        lineItem.price.value.fractionDigits;

    const price =
        lineItem.price.value.centAmount /
        Math.pow(10, fractionDigits);

    dataLayer.push({ ecommerce: null });

    dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
            currency,
            value: price * quantity,
            items: [
                {
                    item_id: lineItem.variant.sku || lineItem.productId,
                    item_name:
                        lineItem.name['en-US'] ||
                        Object.values(lineItem.name)[0] ||
                        'Unknown Product',
                    price,
                    quantity,
                },
            ],
        },
    });
}


export interface GA4Item {
    item_id: string;
    item_name: string;
    price: number;
    quantity?: number;
    item_category?: string;
    item_brand?: string;
}

export function trackViewItem(
    item: GA4Item,
    currency: string
): void {
    if (typeof window === 'undefined') return;

    const win = window as typeof window & {
        dataLayer?: Record<string, unknown>[];
    };

    win.dataLayer ??= [];

    // Clear previous ecommerce object
    win.dataLayer.push({ ecommerce: null });

    win.dataLayer.push({
        event: 'view_item',
        ecommerce: {
            currency,
            value: item.price,
            items: [
                {
                    ...item,
                    quantity: 1
                }
            ]
        }
    });
}
