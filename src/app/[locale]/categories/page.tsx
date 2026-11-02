import { getCategories } from '@/lib/categories';
import Link from 'next/link';

export default async function CategoriesPage() {
    const categories = await getCategories();

    return (
        <main className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Categories</h1>
                <Link href="/" className="text-blue-600 hover:underline">
                    Back to Products
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => {
                    return (
                        <Link
                            key={category.id}
                            href={`/categories/${category.slug['en-US'] ?? Object.values(category.slug)[0]}`}
                            className="border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow block bg-white hover:border-blue-300"
                        >
                            <h2 className="text-xl font-semibold mb-2 text-gray-900">
                                {category.name['en-US'] || Object.values(category.name)[0]}
                            </h2>
                            {category.description && (
                                <p className="text-gray-600 mb-4 line-clamp-2">
                                    {category.description['en-US'] || Object.values(category.description)[0]}
                                </p>
                            )}
                            <div className="text-sm text-gray-500 mt-auto">
                                <span className="text-blue-600 font-medium group-hover:underline">View Products &rarr;</span>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {categories.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No categories found.</p>
                </div>
            )}
        </main>
    );
}
