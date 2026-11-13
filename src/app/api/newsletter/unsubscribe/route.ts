
import { NextResponse } from 'next/server';
import { unsubscribeNewsletter } from '@/lib/newsletter/unsubscribe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, message: 'Invalid request.' },
            { status: 400 }
        );
    }

    const token =
        body && typeof body === 'object' && 'token' in body &&
        typeof body.token === 'string'
            ? body.token
            : '';

    if (!token || token.length > 512) {
        return NextResponse.json(
            { success: false, message: 'Invalid link.' },
            { status: 400 }
        );
    }

    try {
        const success = await unsubscribeNewsletter(token);

        return NextResponse.json(
            {
                success,
                message: success
                    ? 'You have unsubscribed successfully.'
                    : 'This link is invalid, expired, or already used.',
            },
            {
                status: success ? 200 : 400,
                headers: { 'Cache-Control': 'no-store' },
            }
        );
    } catch {
        return NextResponse.json(
            { success: false, message: 'Please try again later.' },
            { status: 503 }
        );
    }
}
