import Link from 'next/link';
import { Search } from 'lucide-react';

interface QuoteSearchFormProps {
    name: string;
    defaultValue?: string;
    placeholder: string;
    /** Other search params on the page that should survive a search submit. */
    preserve: Record<string, string | undefined>;
    basePath: string;
}

function buildHref(basePath: string, params: Record<string, string | undefined>) {
    const query = new URLSearchParams(
        Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ).toString();

    return query ? `${basePath}?${query}` : basePath;
}

export default function QuoteSearchForm({
    name,
    defaultValue,
    placeholder,
    preserve,
    basePath,
}: QuoteSearchFormProps) {
    return (
        <form method="get" className="flex items-center gap-2 mb-4">
            {Object.entries(preserve).map(([key, value]) =>
                value ? <input key={key} type="hidden" name={key} value={value} /> : null,
            )}
            <div className="relative flex-grow">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="search"
                    name={name}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
            </div>
            <button
                type="submit"
                className="px-4 py-2 h-12 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
                Search
            </button>
            {defaultValue && (
                <Link
                    href={buildHref(basePath, preserve)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    Clear
                </Link>
            )}
        </form>
    );
}
