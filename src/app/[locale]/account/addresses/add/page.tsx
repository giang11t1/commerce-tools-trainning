import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '../../../../../lib/auth';
import { addCustomerAddress } from '../../../../../lib/customer';
import AccountSidebar from '@/components/AccountSidebar';
import AddressForm from '@/components/AddressForm';

async function createAddress(formData: FormData) {
    'use server';

    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const result = await addCustomerAddress(
        customerId,
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

export default function AddAddressPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">
                    Add New Address
                </h1>

                <Link
                    href="/account/addresses"
                    className="text-sm font-medium text-blue-600"
                >
                    Back to Addresses
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <AccountSidebar />
                </div>

                <div className="md:col-span-2">
                    <AddressForm action={createAddress} />
                </div>
            </div>
        </div>
    );
}
