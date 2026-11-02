import { getSession } from '@/lib/auth';
import { getCustomerById } from '@/lib/customer';
import CheckoutClient from './CheckoutClient';

export default async function CheckoutPage() {
    const customerId = await getSession();
    const customer = customerId ? await getCustomerById(customerId) : null;
    const shippingAddress = customer?.addresses.find(
        (address) => address.id === customer.defaultShippingAddressId,
    ) ?? null;
    const billingAddress = customer?.addresses.find(
        (address) => address.id === customer.defaultBillingAddressId,
    ) ?? null;

    return (
        <CheckoutClient
            shippingAddress={shippingAddress}
            billingAddress={billingAddress}
            customerEmail={customer?.email ?? null}
        />
    );
}
