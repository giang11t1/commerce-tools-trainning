'use client';

import { useEffect, useRef } from 'react';
import {
    trackViewItem,
    type GA4Item,
} from '@/helpers/analytics/ecommerce';

interface ProductViewTrackerProps {
    item: GA4Item;
    currency: string;
}

export default function ProductViewTracker({
                                               item,
                                               currency,
                                           }: ProductViewTrackerProps) {
    const trackedKey = useRef<string | null>(null);

    useEffect(() => {
        const key = `${item.item_id}:${currency}`;

        if (trackedKey.current === key) return;

        trackViewItem(item, currency);
        trackedKey.current = key;
    }, [item, currency]);

    return null;
}
