import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import { clearUserJournal } from '@/lib/data/clear-journal';

export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || body.confirmation !== 'DELETE JOURNAL DATA' || Object.keys(body).length !== 1) {
      return NextResponse.json({ error: 'Confirm deletion of journal data' }, { status: 400 });
    }
    if ((await checkDemoStatus(userId)).isDemo) return createDemoBlockedResponse('deleting journal data');
    await clearUserJournal(getSupabaseServiceClient(), userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Journal deletion could not finish. Refresh and retry.' }, { status: 500 });
  }
}
