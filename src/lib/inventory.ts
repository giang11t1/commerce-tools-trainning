import {
    ClientResponse,
    createApiBuilderFromCtpClient,
    InventoryEntry,
    InventoryPagedQueryResponse
} from '@commercetools/platform-sdk';
import { ctpClient } from './client';
import { getChannelByKey, CHANNEL_KEYS } from './channels';

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


export async function getInventoryBySkus(
    skus: string[]
): Promise<InventoryEntry[]> {
    if (!skus.length) {
        return [];
    }

    const where = `sku in (${skus
        .map((sku) => JSON.stringify(sku))
        .join(',')})`;

    console.log('INVENTORY WHERE:', where);

    const inventoryEntries: ClientResponse<InventoryPagedQueryResponse> =
        await apiRoot
            .withProjectKey({
                projectKey,
            })
            .inventory()
            .get({
                queryArgs: {
                    where,
                    limit: 500,
                },
            })
            .execute();

    console.log(
        'RAW INVENTORY RESULTS:',
        inventoryEntries.body.results
    );

    const inventoryChannel = await getChannelByKey(
        CHANNEL_KEYS.inventory
    );

    console.log(
        'INVENTORY CHANNEL:',
        inventoryChannel
    );

    const filtered = inventoryEntries.body.results.filter(
        (entry) =>
            entry.supplyChannel?.id === inventoryChannel.id || !entry.supplyChannel
    );

    console.log(
        'FILTERED INVENTORY:',
        filtered
    );

    return filtered;
}

export async function getInventoryMapBySkus(
    skus: string[]
) {

    console.log('INPUT SKUS:', skus);

    const inventories =
        await getInventoryBySkus(skus);

    return inventories.reduce<
        Record<string, number>
    >((map, inventory) => {
        map[inventory.sku] =
            inventory.availableQuantity;

        return map;
    }, {});
}
