import { NextResponse } from 'next/server';
import { requestPasswordRecovery } from '@/lib/password-recovery';
import { parseRecoveryRequest } from '@/lib/password-recovery-validation';

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    const parsed = parseRecoveryRequest(body);
    if (!parsed) {
        return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    try {
        await requestPasswordRecovery(parsed.email, parsed.locale);
        return NextResponse.json({ success: true });
    } catch {
        console.error('Password recovery request failed.');
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
