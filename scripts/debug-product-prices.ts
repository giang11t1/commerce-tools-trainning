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
        .products()
        .withId('2b414ea5-c1ca-4a19-9ec0-bb2feff1e8dd')
        .get()
        .execute();

    const prices =
        response.body.masterData.current.masterVariant.prices;

    console.log('RAW PRODUCT PRICES:');
    console.log(JSON.stringify(prices, null, 2));
}

main().catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
});
