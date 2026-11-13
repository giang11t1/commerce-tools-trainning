import Link from 'next/link';

export default function InvalidNewsletterLinkPage() {
    return (
        <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
            <h1 className="text-3xl font-bold">
                Invalid or Expired Link
            </h1>

            <p className="mt-4 text-gray-600">
                Your confirmation link is invalid or has expired.
                Please subscribe again to receive a new link.
            </p>

            <Link
                href="/"
                className="mt-6 rounded bg-blue-600 px-6 py-3 text-white"
            >
                Back to Home
            </Link>
        </main>
    );
}
