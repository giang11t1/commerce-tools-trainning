import { NextResponse } from 'next/server';
import { getChannels } from '@/lib/channels';

export async function GET() {
    try {
        const channels = await getChannels();

        return NextResponse.json({
            channels,
        });
    } catch (error: any) {
        console.error('Failed to get channels:', error);

        return NextResponse.json(
            {
                error: error?.message || 'Failed to get channels',
                body: error?.body,
                statusCode: error?.statusCode,
            },
            {
                status: 500,
            }
        );
    }
}
