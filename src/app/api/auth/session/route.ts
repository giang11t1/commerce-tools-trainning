import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
    const customerId = await getSession();

    console.log('CUSTOMER ID:', customerId);

    return NextResponse.json({
        isLoggedIn: Boolean(customerId),
        customerId: customerId ?? null,
    });
}
