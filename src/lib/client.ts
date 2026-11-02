import 'server-only';
import { ClientBuilder } from '@commercetools/sdk-client-v2';

const projectKey = process.env.CT_PROJECT_KEY;
const clientId = process.env.CT_CLIENT_ID;
const clientSecret = process.env.CT_CLIENT_SECRET;
const authUrl = process.env.CT_AUTH_URL;
const apiUrl = process.env.CT_API_URL;

if (!projectKey) {
    throw new Error('Missing CT_PROJECT_KEY');
}

if (!clientId) {
    throw new Error('Missing CT_CLIENT_ID');
}

if (!clientSecret) {
    throw new Error('Missing CT_CLIENT_SECRET');
}

if (!authUrl) {
    throw new Error('Missing CT_AUTH_URL');
}

if (!apiUrl) {
    throw new Error('Missing CT_API_URL');
}

export const ctpClient = new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow({
        host: authUrl,
        projectKey,
        credentials: {
            clientId,
            clientSecret,
        },
        scopes: [
            `manage_customers:${projectKey}`,
            `view_products:${projectKey}`,
        ],
    })
    .withHttpMiddleware({
        host: apiUrl,
    })
    .build();
