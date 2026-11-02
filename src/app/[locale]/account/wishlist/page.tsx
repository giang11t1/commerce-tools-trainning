import { getWishlistProducts } from '@/lib/products';
import { WishlistProvider } from '@/context/WishlistContext';
import WishlistPage from './WishlistPage';
import { getSession } from '@/lib/auth';
import { getCustomerById } from '@/lib/customer';

export default async function Page({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const customerId = await getSession();

    // Customer is not logged in
    if (!customerId) {
        return (
            <WishlistPage />
        );
    }

    const customer = await getCustomerById(customerId);

    if (!customer) {
        return (
            <WishlistPage />
        );
    }

    const wishlists = await getWishlistProducts(customer.id, locale);

    return (
        <WishlistPage />
    );
}
