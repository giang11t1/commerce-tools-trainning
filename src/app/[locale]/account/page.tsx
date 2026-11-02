import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession, logout } from '../../../lib/auth';
import { getCustomerById } from '../../../lib/customer';
import { getMyOrders } from '@/lib/orders';
import AccountSidebar from '@/components/AccountSidebar';
import { getCustomerGroupById } from '@/lib/customer-groups';
import PriceDisplay from '@/components/PriceDisplay';

export default async function AccountPage() {
    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const [customer, ordersResult] = await Promise.all([
        getCustomerById(customerId),
        getMyOrders(5),
    ]);

    const customerGroup = customer?.customerGroup?.id
        ? await getCustomerGroupById(customer.customerGroup.id)
        : null;

    const recentOrders = ordersResult.success ? ordersResult.orders || [] : [];

    if (!customer) {
        // Session exists but customer not found in CT, clear session and redirect
        // We can't call logout() here as it's a server action meant for client calls or POST
        // But we can just redirect to login for now
        redirect('/login');
    }

    async function handleLogout() {
        'use server';
        await logout();
        redirect('/login');
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">My Account</h1>
                    <form action={handleLogout}>
                        <button
                            type="submit"
                            className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
                        >
                            Sign Out
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1">
                        <AccountSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Account Information</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">First Name</p>
                                    <p className="font-medium">{customer.firstName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Last Name</p>
                                    <p className="font-medium">{customer.lastName || 'N/A'}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-sm text-gray-500">Email Address</p>
                                    <p className="font-medium">{customer.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Customer Number</p>
                                    <p className="font-medium text-gray-400">{customer.customerNumber || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Customer Group</p>
                                    <p className="text-base">
                                        {customerGroup?.name ?? 'N/A'}
                                    </p>
                                </div>

                            </div>
                        </section>

                        <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex justify-between items-center">
                                Recent Orders
                                <Link href="/account/orders" className="text-sm font-normal text-blue-600 hover:underline">
                                    View all
                                </Link>
                            </h2>
                            {recentOrders.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>You haven&apos;t placed any orders yet.</p>
                                    <Link href="/categories" className="text-blue-600 hover:underline mt-2 inline-block">
                                        Start shopping
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Order #</th>
                                                <th className="px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                                                <th className="px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {recentOrders.map((order: { id: string, orderNumber?: string, createdAt: string, orderState: string, totalPrice: { centAmount: number, currencyCode: string } }) => (
                                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                                                        {order.orderNumber || order.id.substring(0, 8)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                            ${order.orderState === 'Complete' ? 'bg-green-100 text-green-800' :
                                                              order.orderState === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                              'bg-yellow-100 text-yellow-800'}`}>
                                                            {order.orderState}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        <PriceDisplay money={order.totalPrice} />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                        <Link
                                                            href={`/account/orders/${order.id}`}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            View
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
