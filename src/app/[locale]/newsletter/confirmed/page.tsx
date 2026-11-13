import Link from 'next/link';

export default function NewsletterConfirmedPage() {
    return (
        <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
            <h1 className="text-3xl font-bold">
                Subscription Confirmed!
            </h1>

            <p className="mt-4 text-gray-600">
                Thank you for subscribing to our newsletter.
                You will now receive our latest updates and offers.
            </p>

            <Link
                href="/"
                className="mt-6 rounded bg-blue-600 px-6 py-3 text-white"
            >
                Continue Shopping
            </Link>
        </main>
    );
}
