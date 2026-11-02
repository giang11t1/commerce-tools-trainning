import { config } from 'dotenv';

config({
    path: '.env.local',
});

async function main() {
    try {
        const { getWholesaleCustomerGroup } =
            await import('../src/lib/customer-groups');

        const group = await getWholesaleCustomerGroup();

        console.log('Wholesale Customer Group:');
        console.log('-------------------------');
        console.log('ID:', group.id);
        console.log('Key:', group.key);
        console.log('Name:', group.name);
    } catch (error) {
        console.error('Failed to get Customer Group:', error);
        process.exit(1);
    }
}

main();
