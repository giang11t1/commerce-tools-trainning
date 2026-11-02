import Link from 'next/link';

export function EmptyCart() {
    return (
        <div className="max-w-4xl mx-auto py-16 px-4 text-center">
            <h1 className="text-3xl font-bold mb-8">Checkout</h1>
            <p className="text-xl text-gray-600 mb-8">Your cart is empty.</p>
            <Link href="/" className="text-blue-600 hover:underline">
                Return to Shop
            </Link>
        </div>
    );
}
