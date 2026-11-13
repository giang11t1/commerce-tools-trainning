
import { NextRequest, NextResponse } from 'next/server';
import { confirmNewsletter } from '@/lib/newsletter/newsletter-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');

    const siteUrl = process.env.SITE_URL;

    if (!siteUrl) {
        return NextResponse.json(
            { message: 'Server configuration missing.' },
            { status: 503 }
        );
    }

    const redirectUrl = new URL(
        '/en/newsletter/confirmed',
        siteUrl
    );

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        redirectUrl.searchParams.set('status', 'invalid');
        return NextResponse.redirect(redirectUrl);
    }

    try {
        const confirmed = await confirmNewsletter(token);

        redirectUrl.searchParams.set(
            'status',
            confirmed ? 'success' : 'invalid'
        );
    } catch {
        redirectUrl.searchParams.set('status', 'error');
    }

    return NextResponse.redirect(redirectUrl);
}
