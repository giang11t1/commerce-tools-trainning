
import { NextRequest, NextResponse } from 'next/server';
import { subscribeNewsletter } from '@/lib/newsletter/newsletter-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { message: 'Invalid request body.' },
            { status: 400 }
        );
    }

    if (!body || typeof body !== 'object') {
        return NextResponse.json(
            { message: 'Invalid request body.' },
            { status: 400 }
        );
    }

    const input = body as Record<string, unknown>;

    const email =
        typeof input.email === 'string'
            ? input.email.trim().toLowerCase()
            : '';

    const locale = input.locale === 'de' ? 'de' : 'en';

    if (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        return NextResponse.json(
            { message: 'Enter a valid email address.' },
            { status: 400 }
        );
    }

    if (input.consent !== true) {
        return NextResponse.json(
            { message: 'Consent is required.' },
            { status: 400 }
        );
    }

    try {
        const result = await subscribeNewsletter(email, locale);

        if (result.status === 'already_subscribed') {
            return NextResponse.json(
                {
                    success: false,
                    code: 'ALREADY_SUBSCRIBED',
                    message: 'This email is already subscribed to our newsletter.',
                },
                { status: 409 }
            );
        }

        if (result.status === 'unsubscribed') {
            return NextResponse.json(
                {
                    success: false,
                    code: 'PREVIOUSLY_UNSUBSCRIBED',
                    message:
                        'This email was previously unsubscribed. Please contact support to subscribe again.',
                },
                { status: 409 }
            );
        }

        return NextResponse.json({
            success: true,
            message:
                'Please check your inbox to confirm your subscription.',
        });
    } catch (error) {
        console.error('[Newsletter] Subscribe failed', {
            errorType:
                error instanceof Error ? error.name : 'Unknown',
        });

        return NextResponse.json(
            { message: 'Unable to subscribe right now.' },
            { status: 503 }
        );
    }
}
