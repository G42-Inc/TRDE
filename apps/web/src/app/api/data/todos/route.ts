import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import { saveOwnedRecords, RecordConflictError, InvalidRecordError } from '@/lib/db/owned-records';
import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { Todo } from '@trde/core';

/**
 * GET /api/data/todos
 * Fetch all todos for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching todos:', error);
      return NextResponse.json(
        { error: 'Failed to fetch todos' },
        { status: 500 }
      );
    }

    const todos: Todo[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      category: row.category,
      completed: row.completed || false,
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
      dueDate: row.due_date ?? undefined,
    }));

    return NextResponse.json({ todos });
  } catch (error: any) {
    console.error('Error in GET /api/data/todos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/todos
 * Create or update todos
 * Body: { todos: Todo[] }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const demo = await checkDemoStatus(userId);
    if (demo.error) return NextResponse.json({ error: 'Could not verify journal access. Please retry.' }, { status: 503 });
    if (demo.isDemo) return createDemoBlockedResponse('saving journal data');

    const body = await request.json();
    const { todos, deletedIds = [] } = body;

    if (!Array.isArray(todos)) {
      return NextResponse.json(
        { error: 'todos must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    if (!Array.isArray(deletedIds) || deletedIds.length > 5000 || deletedIds.some((id: unknown) => typeof id !== 'string' || !id || id.length > 300) || todos.some((todo: Todo) => deletedIds.includes(todo.id))) {
      return NextResponse.json({ error: 'Invalid deleted task identifiers' }, { status: 400 });
    }

    const dbTodos = todos.map((todo: Todo) => ({
      id: todo.id,
      user_id: userId,
      title: todo.title,
      description: todo.description || null,
      category: todo.category,
      completed: todo.completed || false,
      completed_at: todo.completedAt ?? null,
      created_at: todo.createdAt,
      due_date: todo.dueDate ?? null,
      updated_at: Date.now(),
      metadata: {},
    }));

    await saveOwnedRecords(supabase, 'todos', userId, dbTodos);
    for (let offset = 0; offset < deletedIds.length; offset += 100) {
      const { error } = await supabase.from('todos').delete().eq('user_id', userId).in('id', deletedIds.slice(offset, offset + 100));
      if (error) throw error;
    }

    return NextResponse.json({ success: true, count: todos.length });
  } catch (error: any) {
    if (error instanceof RecordConflictError || error instanceof InvalidRecordError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof RecordConflictError ? 409 : 400 });
    }
    console.error('Error in POST /api/data/todos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
