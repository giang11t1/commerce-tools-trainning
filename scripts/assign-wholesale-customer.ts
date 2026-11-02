import { config } from 'dotenv';

config({
    path: '.env.local',
});

async function main() {
    try {
        const {
            getCustomerByEmail,
            getWholesaleCustomerGroup,
            setCustomerGroup,
        } = await import('../src/lib/customer-groups');

        const email = 'giang.tran@digitas.com.au';

        const customer = await getCustomerByEmail(email);

        if (!customer) {
            throw new Error(`Customer not found: ${email}`);
        }

        console.log('Customer found:');
        console.log('ID:', customer.id);
        console.log('Version:', customer.version);

        const group = await getWholesaleCustomerGroup();

        console.log('Wholesale group:');
        console.log('ID:', group.id);
        console.log('Key:', group.key);
        console.log('Name:', group.name);

        const updatedCustomer = await setCustomerGroup(
            customer.id,
            customer.version,
            group.id,
        );

        console.log('');
        console.log('Customer updated successfully!');
        console.log('Customer ID:', updatedCustomer.id);
        console.log(
            'Customer Group:',
            updatedCustomer.customerGroup,
        );
    } catch (error) {
        console.error(
            'Failed to assign customer group:',
            error,
        );

        process.exit(1);
    }
}

main();
