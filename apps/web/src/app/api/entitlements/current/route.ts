import { NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { checkIsAdmin } from '@/lib/auth/admin.server';
import { getUserEntitlement } from '@/lib/entitlements/check.server';

/** Return only the verified session user's entitlement. */
export async function GET() {
  const userId = await getClerkUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (await checkIsAdmin(userId)) {
      return NextResponse.json({ entitlement: null, isAdmin: true });
    }
    const entitlement = await getUserEntitlement(userId);
    return NextResponse.json({ entitlement, isAdmin: false });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch entitlement' }, { status: 500 });
  }
}
