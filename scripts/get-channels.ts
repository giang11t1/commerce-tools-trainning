import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');

async function main() {
    const { ctpClient } = await import('../src/lib/client');
    const { createApiBuilderFromCtpClient } =
        await import('@commercetools/platform-sdk');

    const apiRoot = createApiBuilderFromCtpClient(ctpClient);

    const response = await apiRoot
        .withProjectKey({
            projectKey: process.env.CT_PROJECT_KEY!,
        })
        .channels()
        .get({
            queryArgs: {
                limit: 100,
            },
        })
        .execute();

    console.log('Channels:');

    for (const channel of response.body.results) {
        console.log({
            id: channel.id,
            key: channel.key,
            name: channel.name,
            roles: channel.roles,
        });
    }
}

main().catch((error) => {
    console.error('Failed to get channels:', error);
    process.exit(1);
});
