import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import 'server-only';
import {
    ClientBuilder,
    type AuthMiddlewareOptions,
    type HttpMiddlewareOptions,
} from '@commercetools/ts-client';

const authMiddlewareOptions: AuthMiddlewareOptions = {
    host: process.env.CT_AUTH_URL!,
    projectKey: process.env.CT_PROJECT_KEY!,
    credentials: {
        clientId: process.env.CT_CLIENT_ID!,
        clientSecret: process.env.CT_CLIENT_SECRET!,
    },
    scopes: [
        `view_products:${process.env.CT_PROJECT_KEY!}`,
        // `view_categories:${process.env.CT_PROJECT_KEY!}`,
        `manage_customers:${process.env.CT_PROJECT_KEY!}`,
        `manage_sessions:${process.env.CT_PROJECT_KEY!}`,
        `manage_orders:${process.env.CT_PROJECT_KEY!}`,
        `manage_shopping_lists:${process.env.CT_PROJECT_KEY}`,
        `manage_quotes:${process.env.CT_PROJECT_KEY}`,
        `manage_quote_requests:${process.env.CT_PROJECT_KEY}`,
        `manage_customers:${process.env.CT_PROJECT_KEY}`,
        // Needed to read store distribution channels for store customers' carts.
        // The API client does not allow view_stores.
        `manage_stores:${process.env.CT_PROJECT_KEY}`,
        `manage_associate_roles:${process.env.CT_PROJECT_KEY!}`,
    ]
};

const httpMiddlewareOptions: HttpMiddlewareOptions = {
    host: process.env.CT_API_URL!,
    enableRetry: false,
};

export const client = new ClientBuilder()
    .withClientCredentialsFlow(authMiddlewareOptions)
    .withHttpMiddleware(httpMiddlewareOptions)
    .build();

export const apiRoot = createApiBuilderFromCtpClient(client);

// Business unit (As Associate) requests run on a separate client that doesn't pin scopes,
// so the token carries whatever business-unit scopes the API client was granted. If they
// are missing, only the company pages fail instead of every request on apiRoot.
const associateAuthMiddlewareOptions: AuthMiddlewareOptions = {
    ...authMiddlewareOptions,
    scopes: undefined,
};

export const associateApiRoot = createApiBuilderFromCtpClient(
    new ClientBuilder()
        .withClientCredentialsFlow(associateAuthMiddlewareOptions)
        .withHttpMiddleware(httpMiddlewareOptions)
        .build()
);
