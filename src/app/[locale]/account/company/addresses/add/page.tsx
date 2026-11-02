import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getMyBusinessUnit } from '@/lib/business-units';
import AccountSidebar from '@/components/AccountSidebar';
import AddressForm from '@/components/AddressForm';
import { addCompanyAddress } from '../../actions';

interface AddCompanyAddressPageProps {
    searchParams: Promise<{ unit?: string; error?: string }>;
}

export default async function AddCompanyAddressPage({ searchParams }: AddCompanyAddressPageProps) {
    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const { unit, error } = await searchParams;

    if (!unit) {
        notFound();
    }

    const result = await getMyBusinessUnit(unit);

    if (!result.success) {
        notFound();
    }

    const businessUnit = result.businessUnit;
    const backHref = `/account/company?unit=${encodeURIComponent(businessUnit.key)}`;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Add Company Address</h1>

                <Link href={backHref} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    Back to Company
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <AccountSidebar />
                </div>

                <div className="md:col-span-2 space-y-4">
                    <p className="text-sm text-gray-500">{businessUnit.name}</p>

                    {error && (
                        <div className="p-4 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
                    )}

                    <AddressForm action={addCompanyAddress.bind(null, businessUnit.key)} />
                </div>
            </div>
        </div>
    );
}
