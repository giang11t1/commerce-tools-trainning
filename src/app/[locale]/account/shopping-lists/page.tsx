import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ShoppingListsPage from './ShoppingListsPage';

export default async function Page() {
    const customerId = await getSession();

    if (!customerId) {
        redirect('/login?redirect=%2Faccount%2Fshopping-lists');
    }

    return <ShoppingListsPage />;
}
