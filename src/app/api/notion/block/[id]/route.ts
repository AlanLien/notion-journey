import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateToDoBlock } from '@/lib/notion';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('journey_auth')?.value === 'true';

    if (!isAuthenticated) {
        return NextResponse.json(
            { error: '未登入，無法更新頁面內容' },
            { status: 401 }
        );
    }

    const { id } = await params;
    const body = await request.json();

    if (typeof body.checked !== 'boolean') {
        return NextResponse.json(
            { error: 'checked 必須是 true 或 false' },
            { status: 400 }
        );
    }

    try {
        await updateToDoBlock(id, body.checked);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Block API Route Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update block' },
            { status: 500 }
        );
    }
}
