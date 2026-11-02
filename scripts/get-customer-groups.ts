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
        .customerGroups()
        .get({
            queryArgs: {
                limit: 100,
            },
        })
        .execute();

    console.log('Customer Groups:');

    for (const group of response.body.results) {
        console.log({
            id: group.id,
            key: group.key,
            name: group.name,
        });
    }
}

main().catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
});
