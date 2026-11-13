import { NextResponse } from 'next/server';
import { resetCustomerPassword } from '@/lib/password-recovery';
import { parsePasswordReset } from '@/lib/password-recovery-validation';

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    const parsed = parsePasswordReset(body);
    if (!parsed) {
        return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    try {
        await resetCustomerPassword(parsed.token, parsed.password, parsed.store);
        return NextResponse.json({ success: true });
    } catch (error) {
        const statusCode = error && typeof error === 'object' && 'statusCode' in error
            ? error.statusCode : undefined;
        if (statusCode === 404) {
            return NextResponse.json({ error: 'invalidToken' }, { status: 400 });
        }
        if (statusCode === 400) {
            return NextResponse.json({ error: 'invalidReset' }, { status: 400 });
        }
        console.error('Password reset failed.');
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
