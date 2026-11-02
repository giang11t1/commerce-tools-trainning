export default function BrandsLoading() {
    return (
        <section aria-label="Loading brands" className="container mx-auto animate-pulse px-4 pb-10 pt-8">
            <div className="mb-8 h-36 w-full rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 5 }, (_, index) => <div key={index} className="aspect-square rounded-lg bg-white" />)}
            </div>
        </section>
    );
}
