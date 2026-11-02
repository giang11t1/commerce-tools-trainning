import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import { ctpClient } from './client';

const projectKey = process.env.CT_PROJECT_KEY ?? '';

if (!projectKey) {
    throw new Error('Missing CT_PROJECT_KEY');
}

const apiRoot = createApiBuilderFromCtpClient(ctpClient);

export const CHANNEL_KEYS = {
    inventory: 'inventory-channel',
    distribution: 'distribution-channel',
} as const;

export async function getChannels() {
    const response = await apiRoot
        .withProjectKey({
            projectKey,
        })
        .channels()
        .get()
        .execute();

    return response.body.results;
}

export async function getChannelByKey(key: string) {
    const response = await apiRoot
        .withProjectKey({
            projectKey,
        })
        .channels()
        .withKey({
            key,
        })
        .get()
        .execute();

    return response.body;
}
