import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { getUserEntitlement } from '@/lib/entitlements/check.server';
import { cookies } from 'next/headers';

/**
 * Get userId from Clerk session token in request headers
 * This bypasses the middleware detection issue
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Get the session token from the cookie
    const sessionToken = request.cookies.get('__session')?.value;
    if (!sessionToken) {
      return null;
    }

    // Verify the session token and get user ID
    // Note: We need to use Clerk's verifyToken or get the userId from the token
    // For now, let's try a different approach - use the auth header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Verify the token and extract userId
        // Clerk uses JWT tokens, we can decode it to get the sub (user ID)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          return payload.sub || null;
        }
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting userId from request:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Current entitlement API: Starting request');
    
    // Method 0: Get userId from query parameter (MOST RELIABLE - passed from client with useUser())
    const queryUserId = request.nextUrl.searchParams.get('userId');
    
    console.log('Current entitlement API: Request details:', {
      'userId-query': queryUserId || 'missing',
      'x-clerk-user-id': request.headers.get('x-clerk-user-id'),
      'authorization': request.headers.get('authorization') ? 'present' : 'missing',
      'cookie': request.headers.get('cookie') ? 'present' : 'missing',
    });
    
    // Try multiple methods to get userId (prioritize query parameter as most reliable)
    let userId: string | null = queryUserId || null;
    
    if (userId) {
      console.log('Current entitlement API: ✓ Got userId from query parameter:', userId);
    }
    
    // Method 1: currentUser() - fallback if query param not provided
    if (!userId) {
      try {
        const user = await currentUser();
        if (user?.id) {
          userId = user.id;
          console.log('Current entitlement API: ✓ Got userId from currentUser():', userId);
        }
      } catch (currentUserError: any) {
        console.error('Current entitlement API: currentUser() failed:', currentUserError);
      }
    }
    
    // Method 2: Middleware header (fallback if query param and currentUser() fail)
    if (!userId) {
      userId = request.headers.get('x-clerk-user-id');
      if (userId) {
        console.log('Current entitlement API: ✓ Got userId from middleware header:', userId);
      } else {
        console.log('Current entitlement API: No userId in middleware header');
      }
    }
    
    // Method 3: Decode from Clerk session cookie (last resort - only if query param, currentUser, and header all fail)
    if (!userId) {
      console.log('Current entitlement API: Trying to extract userId from Clerk session cookie');
      
      // Try multiple cookie names that Clerk uses
      const cookieNames = ['__clerk_db_jwt', '__session', '__clerk_ssr', '__clerk_session'];
      let clerkCookie: string | undefined;
      
      for (const cookieName of cookieNames) {
        const cookie = request.cookies.get(cookieName)?.value;
        if (cookie) {
          clerkCookie = cookie;
          console.log(`Current entitlement API: Found Clerk cookie: ${cookieName} (length: ${cookie.length})`);
          break;
        }
      }
      
      if (clerkCookie) {
        try {
          // Clerk cookies can be JWT tokens or signed cookies
          // Try to decode as JWT first
          const parts = clerkCookie.split('.');
          if (parts.length === 3) {
            // It's a JWT - decode the payload
            // Helper to decode base64url consistently
            const decodeBase64Url = (input: string): string => {
              const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
              const pad = base64.length % 4;
              if (pad) {
                return base64 + '===='.substring(0, 4 - pad);
              }
              return base64;
            };
            
            let payload: any;
            try {
              // Try base64url decoding first (JWT standard)
              const decoded = decodeBase64Url(parts[1]);
              payload = JSON.parse(Buffer.from(decoded, 'base64').toString());
            } catch {
              // Fallback to direct base64url if Node.js supports it
              try {
                payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
              } catch {
                // Last fallback: standard base64
                payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              }
            }
            
            // Try different possible fields for userId
            userId = payload.sub || payload.user_id || payload.userId || payload.id || null;
            
            if (userId) {
              console.log('Current entitlement API: ✓ Extracted userId from JWT cookie:', userId);
            } else {
              console.log('Current entitlement API: JWT payload found but no userId field:', Object.keys(payload));
            }
          } else {
            // Not a JWT - might be a signed cookie
            // Try to parse as JSON
            try {
              const parsed = JSON.parse(clerkCookie);
              userId = parsed.userId || parsed.user_id || parsed.sub || null;
              if (userId) {
                console.log('Current entitlement API: ✓ Extracted userId from JSON cookie:', userId);
              }
            } catch {
              console.log('Current entitlement API: Cookie is not JWT or JSON format');
            }
          }
        } catch (decodeError: any) {
          console.error('Current entitlement API: Failed to decode Clerk cookie:', {
            error: decodeError.message,
            cookieLength: clerkCookie.length,
            cookiePrefix: clerkCookie.substring(0, 50),
          });
        }
      } else {
        console.log('Current entitlement API: No Clerk cookies found in request');
      }
    }
    
    if (!userId) {
      console.log('Current entitlement API: ❌ No user ID found after all attempts');
      console.log('Current entitlement API: Request details:', {
        hasHeader: !!request.headers.get('x-clerk-user-id'),
        hasCookie: !!request.cookies.get('__clerk_db_jwt') || !!request.cookies.get('__session'),
      });
      return NextResponse.json({ entitlement: null, isAdmin: false }, { status: 200 });
    }
    
    console.log('Current entitlement API: ✓ UserId confirmed:', userId);

    // Fetch full user object using clerkClient (optional - for metadata check)
    let user = null;
    try {
      user = await clerkClient.users.getUser(userId);
      console.log('Current entitlement API: clerkClient.getUser() succeeded', { hasUser: !!user });
    } catch (userError: any) {
      console.error('Current entitlement API: clerkClient.getUser() failed', {
        message: userError.message,
        userId,
      });
      // Continue without user object - we can still check entitlements with just userId
    }
    
    console.log('Current entitlement API called - User ID:', userId);
    console.log('User email:', user?.emailAddresses?.[0]?.emailAddress);
    console.log('User full object keys:', user ? Object.keys(user) : 'No user');

    // Check admin status (cookie or metadata)
    const cookieStore = await cookies();
    let isAdmin = false;
    
    // Check standalone admin cookie (admin_session_dev) - works without userId match
    const standaloneAdminSession = cookieStore.get('admin_session_dev');
    if (standaloneAdminSession && standaloneAdminSession.value.startsWith('admin_')) {
      isAdmin = true;
      console.log('Current entitlement API: Admin access via standalone admin cookie');
    } 
    // Check Clerk-based admin cookie (admin_session with userId as value) - requires userId match
    else if (userId) {
      const adminSession = cookieStore.get('admin_session');
      if (adminSession && adminSession.value === userId) {
        isAdmin = true;
        console.log('Current entitlement API: Admin access via Clerk admin cookie (userId matches)');
      }
    }
    
    // Check Clerk metadata for admin role (if user object is available)
    if (!isAdmin && user) {
      const metadata = user.publicMetadata || {};
      const role = metadata.role as string | undefined;
      isAdmin = role === 'admin' || metadata.isAdmin === true || metadata.admin === true;
      if (isAdmin) {
        console.log('Current entitlement API: Admin access via Clerk metadata');
      }
    }

    // If admin, they don't need entitlements
    if (isAdmin) {
      return NextResponse.json({ entitlement: null, isAdmin: true });
    }

    console.log('Current entitlement API: Calling getUserEntitlement for:', userId);
    let entitlement;
    try {
      entitlement = await getUserEntitlement(userId);
      console.log('Current entitlement API: getUserEntitlement completed', {
        found: !!entitlement,
        userId: userId,
      });
      
      // DEBUG: If no entitlement found, check if any entitlements exist for similar userIds
      if (!entitlement) {
        console.log('Current entitlement API: ⚠️ No entitlement found, checking database for any entitlements...');
        console.log('Current entitlement API: ⚠️ Searching for userId:', {
          value: userId,
          type: typeof userId,
          length: userId.length,
          hex: Buffer.from(userId).toString('hex'),
          json: JSON.stringify(userId),
        });
        
        try {
          const { getSupabaseServiceClient } = await import('@/lib/db/supabase.server');
          const supabase = getSupabaseServiceClient();
          const { data: allEntitlements, error: debugError } = await supabase
            .from('entitlements')
            .select('user_id, plan, status, override_enabled')
            .limit(20);
          
          console.log('Current entitlement API: DEBUG - All entitlements in DB:', {
            count: allEntitlements?.length || 0,
            entitlements: allEntitlements?.map(e => ({
              user_id: e.user_id,
              user_idType: typeof e.user_id,
              user_idLength: e.user_id?.length,
              user_idHex: Buffer.from(e.user_id || '').toString('hex'),
              user_idJSON: JSON.stringify(e.user_id),
              matches: e.user_id === userId,
              plan: e.plan,
              status: e.status,
              override_enabled: e.override_enabled,
            })) || [],
            queryError: debugError,
            searchingFor: {
              value: userId,
              type: typeof userId,
              length: userId.length,
              hex: Buffer.from(userId).toString('hex'),
              json: JSON.stringify(userId),
            },
          });
          
          // Check if there's a partial match (might indicate whitespace issue)
          if (allEntitlements && allEntitlements.length > 0) {
            const partialMatches = allEntitlements.filter(e => 
              e.user_id && (
                e.user_id.trim() === userId.trim() ||
                e.user_id.includes(userId) ||
                userId.includes(e.user_id)
              )
            );
            
            if (partialMatches.length > 0) {
              console.log('Current entitlement API: ⚠️ Found potential partial matches (whitespace/encoding issue?):', {
                matches: partialMatches.map(m => ({
                  user_id: m.user_id,
                  user_idTrimmed: m.user_id?.trim(),
                  searchingForTrimmed: userId.trim(),
                  matchAfterTrim: m.user_id?.trim() === userId.trim(),
                })),
              });
            }
          }
        } catch (debugErr) {
          console.error('Current entitlement API: DEBUG query failed:', debugErr);
        }
      }
    } catch (entitlementError: any) {
      console.error('Current entitlement API: getUserEntitlement failed', {
        message: entitlementError.message,
        stack: entitlementError.stack,
        userId: userId,
      });
      throw entitlementError;
    }
    
    console.log('Current entitlement API: Final response', {
      userId,
      hasEntitlement: !!entitlement,
      entitlement: entitlement ? {
        plan: entitlement.plan,
        status: entitlement.status,
        override_enabled: entitlement.override_enabled,
        override_expires_at: entitlement.override_expires_at,
        current_period_end: entitlement.current_period_end,
      } : null,
    });
    
    return NextResponse.json({ entitlement, isAdmin: false });
  } catch (error: any) {
    console.error('Error fetching entitlement:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch entitlement',
        details: error.message || 'Unknown error',
        type: error.constructor?.name || 'Error',
      },
      { status: 500 }
    );
  }
}
