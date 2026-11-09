import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

// This endpoint should be protected by an API key for cron job access
const CRON_SECRET = process.env.CRON_SECRET;

interface DigestData {
  userId: string;
  email: string;
  firstName: string;
  stats: {
    tradesLogged: number;
    winRate: number;
    totalPnL: number;
    streakDays: number;
    achievementsUnlocked: number;
  };
  insights: Array<{
    type: string;
    title: string;
    description: string;
  }>;
}

/**
 * POST /api/notifications/digest
 * Generate and send email digests to users
 * 
 * Body: { type: 'daily' | 'weekly' }
 * 
 * This endpoint is meant to be called by a cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret - ALWAYS require secret, fail closed if not configured
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const digestType: 'daily' | 'weekly' = body.type || 'daily';

    const supabase = getSupabaseServiceClient();

    // Get users who have this digest type enabled
    const preferencesField = digestType === 'daily' ? 'daily_digest' : 'weekly_summary';
    
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq(preferencesField, true);

    if (prefError) {
      console.error('[Digest] Error fetching preferences:', prefError);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    if (!preferences || preferences.length === 0) {
      return NextResponse.json({ message: 'No users subscribed', sent: 0 });
    }

    const userIds = preferences.map(p => p.user_id);

    // Get user profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, name')
      .in('user_id', userIds);

    if (profileError) {
      console.error('[Digest] Error fetching profiles:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // Generate digests for each user
    const digestsToSend: DigestData[] = [];

    for (const profile of profiles || []) {
      // Get user's trading stats
      const timeRange = digestType === 'daily' 
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get trades in time range
      const { data: trades } = await supabase
        .from('trades')
        .select('outcome, result_usd')
        .eq('user_id', profile.user_id)
        .gte('created_at', timeRange);

      // Get engagement stats
      const { data: engagementStats } = await supabase
        .from('user_engagement_stats')
        .select('current_streak, total_xp')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      // Get recent achievements
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', profile.user_id)
        .gte('unlocked_at', timeRange);

      // Get active insights
      const { data: insights } = await supabase
        .from('user_insights')
        .select('insight_type, title, description')
        .eq('user_id', profile.user_id)
        .eq('dismissed', false)
        .order('relevance', { ascending: false })
        .limit(3);

      // Calculate stats
      const tradesLogged = trades?.length || 0;
      const wins = trades?.filter(t => t.outcome === 'win').length || 0;
      const winRate = tradesLogged > 0 ? (wins / tradesLogged) * 100 : 0;
      const totalPnL = trades?.reduce((sum, t) => sum + (t.result_usd || 0), 0) || 0;

      // Only send digest if there's something to report
      if (tradesLogged > 0 || achievements?.length || insights?.length) {
        digestsToSend.push({
          userId: profile.user_id,
          email: profile.email,
          firstName: profile.name?.split(' ')[0] || 'Trader',
          stats: {
            tradesLogged,
            winRate,
            totalPnL,
            streakDays: engagementStats?.current_streak || 0,
            achievementsUnlocked: achievements?.length || 0,
          },
          insights: (insights || []).map(i => ({
            type: i.insight_type,
            title: i.title,
            description: i.description,
          })),
        });
      }
    }

    // In production, you would send emails here using a service like:
    // - Resend
    // - SendGrid
    // - AWS SES
    // - Postmark
    
    // For now, we'll just log what would be sent
    console.log(`[Digest] Would send ${digestType} digest to ${digestsToSend.length} users`);
    
    // Example with Resend (you'd need to install and configure it):
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // for (const digest of digestsToSend) {
    //   await resend.emails.send({
    //     from: 'TRDE <digest@trde.io>',
    //     to: digest.email,
    //     subject: digestType === 'daily' ? 'Your Daily Trading Summary' : 'Your Weekly Trading Recap',
    //     html: generateDigestHtml(digest, digestType),
    //   });
    // }

    return NextResponse.json({
      message: `${digestType} digests queued`,
      count: digestsToSend.length,
      // Include digests in response for debugging (remove in production)
      digests: process.env.NODE_ENV === 'development' ? digestsToSend : undefined,
    });
  } catch (error: any) {
    console.error('[Digest] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generate HTML for email digest
 * In production, you'd use a proper email template system
 */
function generateDigestHtml(digest: DigestData, type: 'daily' | 'weekly'): string {
  const period = type === 'daily' ? 'yesterday' : 'this week';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${type === 'daily' ? 'Daily' : 'Weekly'} Trading Summary</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px; background: linear-gradient(135deg, #C9A962 0%, #b8944d 100%);">
                  <h1 style="margin: 0; color: #000; font-size: 24px; font-weight: 700;">
                    ${type === 'daily' ? 'Daily' : 'Weekly'} Summary
                  </h1>
                  <p style="margin: 8px 0 0; color: #000; opacity: 0.7;">
                    Hey ${digest.firstName}, here's your trading recap for ${period}.
                  </p>
                </td>
              </tr>
              
              <!-- Stats -->
              <tr>
                <td style="padding: 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="50%" style="padding: 16px; background-color: #1a1a1a; border-radius: 12px;">
                        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase;">Trades</p>
                        <p style="margin: 4px 0 0; color: #fff; font-size: 28px; font-weight: 700;">${digest.stats.tradesLogged}</p>
                      </td>
                      <td width="10"></td>
                      <td width="50%" style="padding: 16px; background-color: #1a1a1a; border-radius: 12px;">
                        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase;">Win Rate</p>
                        <p style="margin: 4px 0 0; color: ${digest.stats.winRate >= 50 ? '#22C55E' : '#EF4444'}; font-size: 28px; font-weight: 700;">${digest.stats.winRate.toFixed(1)}%</p>
                      </td>
                    </tr>
                    <tr><td colspan="3" height="10"></td></tr>
                    <tr>
                      <td width="50%" style="padding: 16px; background-color: #1a1a1a; border-radius: 12px;">
                        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase;">P&L</p>
                        <p style="margin: 4px 0 0; color: ${digest.stats.totalPnL >= 0 ? '#22C55E' : '#EF4444'}; font-size: 28px; font-weight: 700;">${digest.stats.totalPnL >= 0 ? '+' : ''}$${digest.stats.totalPnL.toFixed(2)}</p>
                      </td>
                      <td width="10"></td>
                      <td width="50%" style="padding: 16px; background-color: #1a1a1a; border-radius: 12px;">
                        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase;">Streak</p>
                        <p style="margin: 4px 0 0; color: #F97316; font-size: 28px; font-weight: 700;">${digest.stats.streakDays} days</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              ${digest.insights.length > 0 ? `
              <!-- Insights -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <h2 style="margin: 0 0 16px; color: #fff; font-size: 18px;">Key Insights</h2>
                  ${digest.insights.map(insight => `
                    <div style="padding: 16px; margin-bottom: 12px; background-color: #1a1a1a; border-radius: 12px; border-left: 3px solid ${
                      insight.type === 'warning' ? '#F59E0B' :
                      insight.type === 'improvement' ? '#22C55E' :
                      insight.type === 'pattern' ? '#3B82F6' : '#8B5CF6'
                    };">
                      <p style="margin: 0; color: #fff; font-weight: 600;">${insight.title}</p>
                      <p style="margin: 4px 0 0; color: #888; font-size: 14px;">${insight.description}</p>
                    </div>
                  `).join('')}
                </td>
              </tr>
              ` : ''}
              
              <!-- CTA -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <a href="https://app.trde.io/app" style="display: block; padding: 16px 24px; background: linear-gradient(135deg, #C9A962 0%, #b8944d 100%); color: #000; text-decoration: none; text-align: center; font-weight: 600; border-radius: 12px;">
                    View Full Analytics
                  </a>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #0a0a0a; border-top: 1px solid #222;">
                  <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                    You're receiving this because you enabled ${type} digests in your TRDE settings.
                    <br>
                    <a href="https://app.trde.io/settings" style="color: #888;">Manage preferences</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
