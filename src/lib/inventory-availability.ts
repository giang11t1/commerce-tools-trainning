export type InventoryEntryLike = {
    sku: string;
    availableQuantity: number;
    supplyChannel?: { id: string };
};

export type SkuAvailability = {
    availableQuantity: number;
    // Supply channel a line item for this SKU should be fulfilled from.
    supplyChannelId?: string;
};

/**
 * Store supply channels limit which inventory a Store may sell. A Store
 * without supply channels falls back to the storefront's default warehouse.
 */
export function resolveEligibleSupplyChannelIds(
    storeSupplyChannelIds: readonly string[] | undefined,
    defaultChannelId: string | undefined,
): string[] {
    const ids = (storeSupplyChannelIds ?? []).filter(Boolean);
    if (ids.length) return [...new Set(ids)];
    return defaultChannelId ? [defaultChannelId] : [];
}

/**
 * A line item is fulfilled from a single supply channel, so quantities are not
 * summed across warehouses: each SKU uses its eligible channel with the most
 * available stock. Entries on other channels or without a channel are ignored.
 */
export function computeSkuAvailability(
    skus: readonly string[],
    entries: readonly InventoryEntryLike[],
    eligibleChannelIds: readonly string[],
): Record<string, SkuAvailability> {
    const eligible = new Set(eligibleChannelIds);
    const result: Record<string, SkuAvailability> = {};

    for (const sku of skus) {
        result[sku] = { availableQuantity: 0 };
    }

    for (const entry of entries) {
        const channelId = entry.supplyChannel?.id;
        if (!channelId || !eligible.has(channelId) || !(entry.sku in result)) continue;

        const quantity = Math.max(0, entry.availableQuantity ?? 0);
        const current = result[entry.sku];
        if (!current.supplyChannelId || quantity > current.availableQuantity) {
            result[entry.sku] = { availableQuantity: quantity, supplyChannelId: channelId };
        }
    }

    return result;
}

/** Channel to use when adding a SKU to the cart. */
export function selectLineItemSupplyChannelId(
    availability: SkuAvailability | undefined,
    eligibleChannelIds: readonly string[],
): string | undefined {
    return availability?.supplyChannelId ?? eligibleChannelIds[0];
}
