import Link from '@/components/commercetools-ui/atoms/link';

export default function Footer() {
    return (
        <footer className="w-full bg-white">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link link="/" className="text-xl font-bold tracking-tight text-[#4a0f0a">
                            MY STORE
                        </Link>
                        <p className="mt-4 text-sm text-gray-500 max-w-xs">
                            Your one-stop shop for all things commercetools. Experience the power of modern commerce.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-[#4a0f0a] tracking-wider uppercase">Shop</h3>
                        <ul className="mt-4 space-y-2">
                            <li>
                                <Link link="/" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link link="/categories" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                                    All Categories
                                </Link>
                            </li>
                            <li>
                                <Link link="/products" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                                    All Products
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-[#4a0f0a] tracking-wider uppercase">Account</h3>
                        <ul className="mt-4 space-y-2">
                            <li>
                                <Link link="/account" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                                    My Account
                                </Link>
                            </li>
                            <li>
                                <Link link="/cart" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                                    Shopping Cart
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t pt-8">
                    <p className="text-sm text-gray-400">
                        &copy; {new Date().getFullYear()} My Store. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
