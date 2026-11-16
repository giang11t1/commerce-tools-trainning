import {
    ClientResponse,
    createApiBuilderFromCtpClient,
    InventoryEntry,
    InventoryPagedQueryResponse
} from '@commercetools/platform-sdk';
import { ctpClient } from './client';
import { getChannelByKey, CHANNEL_KEYS } from './channels';
import {
    computeSkuAvailability,
    type SkuAvailability,
} from './inventory-availability';

const projectKey = process.env.CT_PROJECT_KEY ?? '';

if (!projectKey) {
    throw new Error('Missing CT_PROJECT_KEY');
}

const apiRoot = createApiBuilderFromCtpClient(ctpClient);

/**
 * Get inventory entries by SKU
 */
export async function getInventoryBySku(sku: string) {
    const response = await apiRoot
        .withProjectKey({
            projectKey,
        })
        .inventory()
        .get({
            queryArgs: {
                where: [`sku="${sku}"`],
            },
        })
        .execute();

    return response.body.results;
}

export async function createInventory({
                                          sku,
                                          quantityOnStock,
                                      }: {
    sku: string;
    quantityOnStock: number;
}) {
    const channel = await getChannelByKey(
        CHANNEL_KEYS.inventory
    );

    const response = await apiRoot
        .withProjectKey({
            projectKey,
        })
        .inventory()
        .post({
            body: {
                sku,
                quantityOnStock,
                supplyChannel: {
                    typeId: 'channel',
                    id: channel.id,
                },
            },
        })
        .execute();

    return response.body;
}


export async function getAvailableQuantity(
    sku: string
) {
    const inventoryEntries = await getInventoryBySku(sku);

    const inventoryChannel = await getChannelByKey(
        CHANNEL_KEYS.inventory
    );

    const inventory = inventoryEntries.find(
        (entry) =>
            entry.supplyChannel?.id === inventoryChannel.id
    );

    return inventory?.availableQuantity ?? 0;
}

export async function updateInventoryQuantity({
                                                  sku,
                                                  quantityOnStock,
                                              }: {
    sku: string;
    quantityOnStock: number;
}) {
    const inventoryEntries = await getInventoryBySku(sku);

    const inventoryChannel = await getChannelByKey(
        CHANNEL_KEYS.inventory
    );

    const inventory = inventoryEntries.find(
        (entry) =>
            entry.supplyChannel?.id === inventoryChannel.id
    );

    if (!inventory) {
        throw new Error(
            `Inventory not found for SKU "${sku}" on channel "${CHANNEL_KEYS.inventory}"`
        );
    }

    const currentQuantity = inventory.quantityOnStock;

    const quantityDelta =
        quantityOnStock - currentQuantity;

    if (quantityDelta === 0) {
        return inventory;
    }

    const response = await apiRoot
        .withProjectKey({
            projectKey,
        })
        .inventory()
        .withId({
            ID: inventory.id,
        })
        .post({
            body: {
                version: inventory.version,
                actions: [
                    {
                        action: 'changeQuantity',
                        quantity: quantityDelta,
                    },
                ],
            },
        })
        .execute();

    return response.body;
}


const SKU_QUERY_CHUNK_SIZE = 50;
const INVENTORY_PAGE_SIZE = 500;
// TEMP diagnostics for the reported stock issue; remove once verified.
const DIAGNOSTIC_SKU = 'oo789-uv-2015';

export type InventorySupplyContext = {
    storeKey?: string;
    // Inventory supply channels the current Store may sell from.
    supplyChannelIds: string[];
};

/**
 * All inventory entries for the SKUs, across every supply channel.
 */
export async function getInventoryBySkus(
    skus: string[]
): Promise<InventoryEntry[]> {
    const uniqueSkus = [...new Set(skus.filter(Boolean))];
    const entries: InventoryEntry[] = [];

    for (let index = 0; index < uniqueSkus.length; index += SKU_QUERY_CHUNK_SIZE) {
        const where = `sku in (${uniqueSkus
            .slice(index, index + SKU_QUERY_CHUNK_SIZE)
            .map((sku) => JSON.stringify(sku))
            .join(',')})`;

        for (let offset = 0; ; offset += INVENTORY_PAGE_SIZE) {
            const response: ClientResponse<InventoryPagedQueryResponse> =
                await apiRoot
                    .withProjectKey({
                        projectKey,
                    })
                    .inventory()
                    .get({
                        queryArgs: {
                            where,
                            sort: ['id asc'],
                            limit: INVENTORY_PAGE_SIZE,
                            offset,
                            withTotal: false,
                        },
                    })
                    .execute();

            entries.push(...response.body.results);
            if (response.body.results.length < INVENTORY_PAGE_SIZE) break;
        }
    }

    return entries;
}

export async function getInventoryAvailabilityBySkus(
    skus: string[],
    context: InventorySupplyContext
): Promise<Record<string, SkuAvailability>> {
    const uniqueSkus = [...new Set(skus.filter(Boolean))];
    if (!uniqueSkus.length) {
        return {};
    }

    const entries = await getInventoryBySkus(uniqueSkus);
    const availability = computeSkuAvailability(
        uniqueSkus,
        entries,
        context.supplyChannelIds
    );

    if (uniqueSkus.includes(DIAGNOSTIC_SKU)) {
        console.info('[inventory-diagnostic]', {
            sku: DIAGNOSTIC_SKU,
            storeKey: context.storeKey ?? null,
            eligibleChannelIds: context.supplyChannelIds,
            entries: entries
                .filter((entry) => entry.sku === DIAGNOSTIC_SKU)
                .map((entry) => ({
                    id: entry.id,
                    supplyChannelId: entry.supplyChannel?.id ?? null,
                    quantityOnStock: entry.quantityOnStock,
                    availableQuantity: entry.availableQuantity,
                })),
            finalAvailableQuantity: availability[DIAGNOSTIC_SKU].availableQuantity,
            selectedSupplyChannelId: availability[DIAGNOSTIC_SKU].supplyChannelId ?? null,
        });
    }

    return availability;
}

export async function getInventoryMapBySkus(
    skus: string[],
    context: InventorySupplyContext
): Promise<Record<string, number>> {
    const availability = await getInventoryAvailabilityBySkus(skus, context);

    return Object.fromEntries(
        Object.entries(availability).map(([sku, value]) => [
            sku,
            value.availableQuantity,
        ])
    );
}
