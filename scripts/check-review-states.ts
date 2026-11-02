import 'dotenv/config';

import { ClientBuilder } from '@commercetools/ts-client';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const projectKey = process.env.CT_PROJECT_KEY!;
const clientId = process.env.CT_CLIENT_ID!;
const clientSecret = process.env.CT_CLIENT_SECRET!;
const authUrl = process.env.CT_AUTH_URL!;
const apiUrl = process.env.CT_API_URL!;

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

async function main() {
    const response = await apiRoot
        .withProjectKey({ projectKey })
        .states()
        .get({
            queryArgs: {
                where: 'type="ReviewState"',
                limit: 100,
            },
        })
        .execute();

    console.table(
        response.body.results.map((state) => ({
            id: state.id,
            key: state.key,
            type: state.type,
            initial: state.initial,
        }))
    );
}

main().catch((error) => {
    console.error(
        error?.body || error?.message || error
    );
});
