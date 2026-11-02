import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

import { getSession } from '../../../../../../lib/auth';
import {
    getCustomerById,
    updateCustomerAddress,
} from '../../../../../../lib/customer';

import AccountSidebar from '@/components/AccountSidebar';
import EditAddressForm from '@/components/EditAddressForm';

interface EditAddressPageProps {
    params: Promise<{
        addressId: string;
    }>;
}

async function updateAddress(formData: FormData) {
    'use server';

    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const addressId = String(formData.get('addressId'));

    const result = await updateCustomerAddress(
        customerId,
        addressId,
        {
            firstName: String(formData.get('firstName') || ''),
            lastName: String(formData.get('lastName') || ''),
            company: String(formData.get('company') || ''),
            streetName: String(formData.get('streetName') || ''),
            streetNumber: String(formData.get('streetNumber') || ''),
            additionalStreetInfo: String(
                formData.get('additionalStreetInfo') || ''
            ),
            city: String(formData.get('city') || ''),
            postalCode: String(formData.get('postalCode') || ''),
            state: String(formData.get('state') || ''),
            region: String(formData.get('region') || ''),
            country: String(formData.get('country') || ''),
            phone: String(formData.get('phone') || ''),
            email: String(formData.get('email') || ''),
        },
        {
            isBilling: formData.get('isBilling') === 'on',
            isShipping: formData.get('isShipping') === 'on',
        }
    );

    if (!result.success) {
        throw new Error(result.error);
    }

    redirect('/account/addresses');
}

export default async function EditAddressPage({
                                                  params,
                                              }: EditAddressPageProps) {
    const { addressId } = await params;

    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const customer = await getCustomerById(customerId);

    if (!customer) {
        redirect('/login');
    }

    const address = customer.addresses.find(
        (item) => item.id === addressId
    );

    if (!address) {
        notFound();
    }

    const isBilling =
        customer.defaultBillingAddressId === addressId;

    const isShipping =
        customer.defaultShippingAddressId === addressId;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">
                    Edit Address
                </h1>

                <Link
                    href="/account/addresses"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                    Back to Addresses
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <AccountSidebar />
                </div>

                <div className="md:col-span-2">
                    <EditAddressForm
                        address={address}
                        addressId={addressId}
                        isBilling={isBilling}
                        isShipping={isShipping}
                        action={updateAddress}
                    />
                </div>
            </div>
        </div>
    );
}
