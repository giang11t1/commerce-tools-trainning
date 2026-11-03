import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { BusinessUnit } from '@commercetools/platform-sdk';
import { getSession } from '@/lib/auth';
import { getMyBusinessUnits } from '@/lib/business-units';
import AccountSidebar from '@/components/AccountSidebar';
import CompanyDetailsForm from '@/components/CompanyDetailsForm';
import DeleteAddressButton from '@/components/DeleteAddressButton';
import EffectiveBusinessUnitAssociates from '@/components/account/EffectiveBusinessUnitAssociates';
import { deleteCompanyAddress, saveCompanyDetails } from './actions';

interface CompanyPageProps {
    searchParams: Promise<{ unit?: string; error?: string }>;
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-sm text-gray-500 uppercase font-semibold">{label}</dt>
            <dd className="mt-1 text-gray-900">{children}</dd>
        </div>
    );
}

function unitHref(businessUnit: BusinessUnit, path = '') {
    return `/account/company${path}?unit=${encodeURIComponent(businessUnit.key)}`;
}

export default async function CompanyPage({ searchParams }: CompanyPageProps) {
    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const { unit, error } = await searchParams;
    const result = await getMyBusinessUnits();
    const businessUnits = result.success ? result.businessUnits : [];
    const businessUnit = businessUnits.find((item) => item.key === unit) ?? businessUnits[0];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Company</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1">
                        <AccountSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-3 space-y-6">
                        {!result.success && (
                            <div className="p-4 rounded-md bg-red-50 text-red-700 text-sm">{result.error}</div>
                        )}

                        {error && (
                            <div className="p-4 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
                        )}

                        {result.success && !businessUnit && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                                <p>Your account is not associated with a company yet. Please contact our sales team.</p>
                            </div>
                        )}

                        {businessUnits.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                                {businessUnits.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={unitHref(item)}
                                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                                            item.id === businessUnit?.id
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-200 text-gray-700 hover:bg-gray-50 bg-white'
                                        }`}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {businessUnit && (
                            <>
                                {/* Overview */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-start border-b border-gray-100 pb-4 mb-4 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 uppercase font-semibold">{businessUnit.unitType}</p>
                                            <p className="text-2xl font-bold">{businessUnit.name}</p>
                                        </div>
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            businessUnit.status === 'Active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {businessUnit.status}
                                        </span>
                                    </div>

                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <Detail label="Company Key">{businessUnit.key}</Detail>
                                        <Detail label="Contact Email">
                                            {businessUnit.contactEmail || <span className="text-gray-400">—</span>}
                                        </Detail>
                                        {businessUnit.unitType === 'Division' && (
                                            <Detail label="Parent Unit">{businessUnit.parentUnit.key}</Detail>
                                        )}
                                        <Detail label="Stores">
                                            {businessUnit.stores?.length
                                                ? businessUnit.stores.map((store) => store.key).join(', ')
                                                : <span className="text-gray-400">All stores</span>}
                                        </Detail>
                                        <Detail label="Customer Since">{formatDate(businessUnit.createdAt)}</Detail>
                                    </dl>
                                </div>

                                {/* Edit details */}
                                <CompanyDetailsForm
                                    key={`${businessUnit.id}-${businessUnit.version}`}
                                    name={businessUnit.name}
                                    contactEmail={businessUnit.contactEmail}
                                    action={saveCompanyDetails.bind(null, businessUnit.key)}
                                />

                                {/* Addresses */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-semibold">Company Addresses</h2>
                                        <Link
                                            href={unitHref(businessUnit, '/addresses/add')}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Add New Address
                                        </Link>
                                    </div>

                                    {businessUnit.addresses.length === 0 ? (
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                                            <p>This company has no saved addresses yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {businessUnit.addresses.map((address) => {
                                                const isDefaultShipping = address.id === businessUnit.defaultShippingAddressId;
                                                const isDefaultBilling = address.id === businessUnit.defaultBillingAddressId;

                                                return (
                                                    <div
                                                        key={address.id}
                                                        className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col h-full"
                                                    >
                                                        <div className="flex gap-2 flex-wrap justify-end mb-4">
                                                            {isDefaultShipping && (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    Default Shipping
                                                                </span>
                                                            )}
                                                            {isDefaultBilling && (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    Default Billing
                                                                </span>
                                                            )}
                                                            {!isDefaultShipping && !isDefaultBilling && (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                                    Saved Address
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="text-sm text-gray-900 space-y-1 flex-grow">
                                                            <p className="font-bold text-base">
                                                                {address.firstName} {address.lastName}
                                                            </p>
                                                            {address.company && <p>{address.company}</p>}
                                                            <p>{address.streetName} {address.streetNumber}</p>
                                                            {address.additionalStreetInfo && <p>{address.additionalStreetInfo}</p>}
                                                            <p>{address.postalCode} {address.city}</p>
                                                            {(address.state || address.region) && (
                                                                <p>{[address.state, address.region].filter(Boolean).join(', ')}</p>
                                                            )}
                                                            <p>{address.country}</p>
                                                            {address.phone && <p className="mt-2">📞 {address.phone}</p>}
                                                            {address.email && <p>{address.email}</p>}
                                                        </div>

                                                        <div className="mt-6 pt-4 border-t border-gray-50 flex gap-4 items-center justify-end">
                                                            <Link
                                                                href={unitHref(businessUnit, `/addresses/${address.id}/edit`)}
                                                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                                            >
                                                                Edit
                                                            </Link>
                                                            {!isDefaultShipping && !isDefaultBilling && (
                                                                <DeleteAddressButton
                                                                    addressId={address.id!}
                                                                    action={deleteCompanyAddress.bind(null, businessUnit.key)}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <EffectiveBusinessUnitAssociates
                                    key={businessUnit.id}
                                    businessUnitId={businessUnit.id}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
