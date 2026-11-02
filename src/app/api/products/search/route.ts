import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/product-search';
import { getLocalizationInfo, i18nConfig } from '@/../project.config';

export async function GET(request: NextRequest) {
    try {
        const q = request.nextUrl.searchParams.get('q')?.trim();

        if (!q) {
            return NextResponse.json({
                results: [],
                total: 0,
            });
        }

        const requestedLocale = request.nextUrl.searchParams.get('locale') ?? i18nConfig.defaultLocale;
        const locale = i18nConfig.locales.includes(requestedLocale)
            ? requestedLocale
            : i18nConfig.defaultLocale;
        const response = await searchProducts({
            query: q,
            locale: getLocalizationInfo(locale).locale,
            limit: 10,
        });

        return NextResponse.json({
            results: response.results,
            total: response.total,
        });
    } catch {
        return NextResponse.json(
            {
                results: [],
                total: 0,
                error: 'Search failed',
            },
            { status: 500 }
        );
    }
}
