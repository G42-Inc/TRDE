/**
 * Widget Configuration API Route
 * CRUD operations for user's dashboard widget configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { FlowWidgetType, FlowWidget } from '@/lib/flow/types';

// Allowlist of valid widget types
const VALID_WIDGET_TYPES: FlowWidgetType[] = [
  'FUTURES_SNAPSHOT',
  'INDEX_SNAPSHOT',
  'INTRADAY_SERIES',
  'SESSION_LEVELS',
  'VOLATILITY_RANGE',
  'FLOW_FEED',
];

/**
 * GET - Fetch user's widget configurations
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    
    const { data: widgets, error } = await supabase
      .from('flow_widgets')
      .select('*')
      .eq('user_id', userId)
      .order('position_y', { ascending: true })
      .order('position_x', { ascending: true });

    if (error) {
      console.error('Error fetching widgets:', error);
      return NextResponse.json({ error: 'Failed to fetch widgets' }, { status: 500 });
    }

    return NextResponse.json({ widgets: widgets || [] });
  } catch (error: any) {
    console.error('Widget fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Create a new widget
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { widget_type, symbol, position_x, position_y, width, height, config } = body;

    // Validate required fields
    if (!widget_type || !symbol) {
      return NextResponse.json(
        { error: 'Missing required fields: widget_type, symbol' },
        { status: 400 }
      );
    }

    // Validate widget type (allowlist)
    if (!VALID_WIDGET_TYPES.includes(widget_type)) {
      return NextResponse.json(
        { error: `Invalid widget type. Allowed: ${VALID_WIDGET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate symbol
    if (typeof symbol !== 'string' || symbol.length > 20) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    // Check if widget already exists for this user/type/symbol
    const { data: existing } = await supabase
      .from('flow_widgets')
      .select('id')
      .eq('user_id', userId)
      .eq('widget_type', widget_type)
      .eq('symbol', symbol.toUpperCase().trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Widget with this type and symbol already exists' },
        { status: 409 }
      );
    }

    // Create widget
    const { data: widget, error } = await supabase
      .from('flow_widgets')
      .insert({
        user_id: userId,
        widget_type,
        symbol: symbol.toUpperCase().trim(),
        position_x: position_x ?? 0,
        position_y: position_y ?? 0,
        width: Math.min(Math.max(width ?? 1, 1), 4),
        height: Math.min(Math.max(height ?? 1, 1), 4),
        config: config ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating widget:', error);
      // Check if it's a table not found error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Flow tables not initialized. Please run the database migration.' 
        }, { status: 503 });
      }
      return NextResponse.json({ error: `Failed to create widget: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ widget }, { status: 201 });
  } catch (error: any) {
    console.error('Widget create error:', error);
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}

/**
 * PUT - Update multiple widgets (batch update for drag-drop reordering)
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { widgets } = body;

    if (!Array.isArray(widgets)) {
      return NextResponse.json({ error: 'widgets must be an array' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const errors: string[] = [];
    const updated: FlowWidget[] = [];

    for (const widgetUpdate of widgets) {
      const { id, position_x, position_y, width, height, config } = widgetUpdate;

      if (!id) {
        errors.push('Widget update missing id');
        continue;
      }

      // Build update object with only provided fields
      const updateData: Partial<FlowWidget> = {};
      if (position_x !== undefined) updateData.position_x = position_x;
      if (position_y !== undefined) updateData.position_y = position_y;
      if (width !== undefined) updateData.width = Math.min(Math.max(width, 1), 4);
      if (height !== undefined) updateData.height = Math.min(Math.max(height, 1), 4);
      if (config !== undefined) updateData.config = config;

      const { data, error } = await supabase
        .from('flow_widgets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId) // Ensure user owns the widget
        .select()
        .single();

      if (error) {
        errors.push(`Failed to update widget ${id}: ${error.message}`);
      } else if (data) {
        updated.push(data);
      }
    }

    return NextResponse.json({
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Widget batch update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete a widget
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const widgetId = url.searchParams.get('id');

    if (!widgetId) {
      return NextResponse.json({ error: 'Missing widget id' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    const { error } = await supabase
      .from('flow_widgets')
      .delete()
      .eq('id', widgetId)
      .eq('user_id', userId); // Ensure user owns the widget

    if (error) {
      console.error('Error deleting widget:', error);
      return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Widget delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
