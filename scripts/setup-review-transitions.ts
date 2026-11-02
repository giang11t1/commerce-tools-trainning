import 'dotenv/config';

import { ClientBuilder } from '@commercetools/ts-client';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const projectKey = process.env.CT_PROJECT_KEY!;
const clientId = process.env.CT_CLIENT_ID!;
const clientSecret = process.env.CT_CLIENT_SECRET!;
const authUrl = process.env.CT_AUTH_URL!;
const apiUrl = process.env.CT_API_URL!;

if (
    !projectKey ||
    !clientId ||
    !clientSecret ||
    !authUrl ||
    !apiUrl
) {
    throw new Error('Missing commercetools environment variables');
}

const client = new ClientBuilder()
    .withClientCredentialsFlow({
        host: authUrl,
        projectKey,
        credentials: {
            clientId,
            clientSecret,
        },
    })
    .withHttpMiddleware({
        host: apiUrl,
    })
    .build();

const apiRoot = createApiBuilderFromCtpClient(client);

async function getStateByKey(key: string) {
    const response = await apiRoot
        .withProjectKey({ projectKey })
        .states()
        .withKey({ key })
        .get()
        .execute();

    return response.body;
}

async function main() {
    const pending = await getStateByKey('review-pending');
    const approved = await getStateByKey('review-approved');
    const rejected = await getStateByKey('review-rejected');

    console.log('Pending:', pending.id);
    console.log('Approved:', approved.id);
    console.log('Rejected:', rejected.id);

    const response = await apiRoot
        .withProjectKey({ projectKey })
        .states()
        .withId({
            ID: pending.id,
        })
        .post({
            body: {
                version: pending.version,
                actions: [
                    {
                        action: 'setTransitions',
                        transitions: [
                            {
                                typeId: 'state',
                                id: approved.id,
                            },
                            {
                                typeId: 'state',
                                id: rejected.id,
                            },
                        ],
                    },
                ],
            },
        })
        .execute();

    console.log('\n✅ Review transitions configured');
    console.log({
        state: response.body.key,
        transitions: response.body.transitions,
    });
}

main().catch((error) => {
    console.error('\n❌ Failed to configure transitions');
    console.error(error?.body || error?.message || error);
    process.exit(1);
});
