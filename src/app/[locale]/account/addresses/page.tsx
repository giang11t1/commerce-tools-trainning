import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '../../../../lib/auth';
import {getCustomerById, setDefaultAddresses, deleteCustomerAddress} from '../../../../lib/customer';
import AccountSidebar from '@/components/AccountSidebar';
import DeleteAddressButton from '@/components/DeleteAddressButton';

async function deleteAddress(formData: FormData) {
    'use server';

    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const addressId = String(
        formData.get('addressId') || ''
    );

    if (!addressId) {
        throw new Error('Address ID is required');
    }

    const customer = await getCustomerById(customerId);

    if (!customer) {
        redirect('/login');
    }

    // Don't allow deleting the current default address
    const isBilling =
        customer.defaultBillingAddressId === addressId;

    const isShipping =
        customer.defaultShippingAddressId === addressId;

    if (isBilling || isShipping) {
        throw new Error(
            'This address is currently used as a default billing or shipping address. Please select another address before deleting it.'
        );
    }

    const result = await deleteCustomerAddress(
        customerId,
        addressId
    );

    if (!result.success) {
        throw new Error(result.error);
    }

    redirect('/account/addresses');
}

export default async function AddressesPage() {
    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const customer = await getCustomerById(customerId);

    await setDefaultAddresses(customerId, 'iE_VPFjt');

    if (!customer) {
        redirect('/login');
    }

    const addresses = customer.addresses || [];
    const defaultShippingId = customer.defaultShippingAddressId;
    const defaultBillingId = customer.defaultBillingAddressId;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">My Addresses</h1>
                    <Link
                        href="/account"
                        className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                        Back to Account
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1">
                        <AccountSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Addresses Book</h2>
                            <Link
                                href="/account/addresses/add"
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Add New Address
                            </Link>
                        </div>

                        {addresses.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                                <p className="text-gray-500 mb-6">You don't have any saved addresses yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {addresses.map((address) => {
                                    const isDefaultShipping = address.id === defaultShippingId;
                                    const isDefaultBilling = address.id === defaultBillingId;

                                    return (
                                        <div
                                            key={address.id}
                                            className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col h-full relative"
                                        >
                                            {/* Address Type */}
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-lg">
                                                    {isDefaultShipping && isDefaultBilling
                                                        ? 'Shipping & Billing Address'
                                                        : isDefaultShipping
                                                            ? 'Shipping Address'
                                                            : isDefaultBilling
                                                                ? 'Billing Address'
                                                                : 'Saved Address'}
                                                </h3>

                                                <div className="flex gap-2 flex-wrap justify-end">
                                                    {isDefaultShipping && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Shipping
                                                    </span>
                                                    )}

                                                    {isDefaultBilling && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Billing
                                                    </span>
                                                    )}

                                                    {!isDefaultShipping && !isDefaultBilling && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        Saved Address
                                                    </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Address Information */}
                                            <div className="text-sm text-gray-900 space-y-1 flex-grow">
                                                <p className="font-bold text-base">
                                                    {address.firstName} {address.lastName}
                                                </p>

                                                {address.company && (
                                                    <p>{address.company}</p>
                                                )}

                                                <p>
                                                    {address.streetName} {address.streetNumber}
                                                </p>

                                                {address.additionalStreetInfo && (
                                                    <p>{address.additionalStreetInfo}</p>
                                                )}

                                                <p>
                                                    {address.postalCode} {address.city}
                                                </p>

                                                {address.region && (
                                                    <p>{address.region}</p>
                                                )}

                                                <p>{address.country}</p>

                                                {address.phone && (
                                                    <p className="mt-2">
                                                        📞 {address.phone}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-6 pt-4 border-t border-gray-50 flex gap-4 items-center justify-end">
                                                <Link
                                                    href={`/account/addresses/${address.id}/edit`}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                                >
                                                    Edit
                                                </Link>

                                                <DeleteAddressButton
                                                    addressId={address.id!}
                                                    action={deleteAddress}
                                                />

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
