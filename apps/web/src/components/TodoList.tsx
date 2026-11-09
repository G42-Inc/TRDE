'use client';

import { useEffect, useRef, useState } from 'react';
import { ModalDialog } from './ModalDialog';
import { isTodoOverdue } from '@/lib/todos';
import { useAppData } from '@/hooks/useAppData';
import type { Todo } from '@trde/core';
import { TodoCategory } from '@trde/core';
import { XMarkIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

export function TodoList() {
  const { todos, saveTodos, isLoading, isDemo } = useAppData();
  const panelRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    category: TodoCategory.VIDEO as TodoCategory,
    dueDate: '',
  });
  const updateTodo = (changes: Partial<typeof newTodo>) => setNewTodo(previous => ({ ...previous, ...changes }));

  useEffect(() => {
    if (isLoading) return;
    // Dashboard data can mount this panel after Next's initial hash scroll.
    // Retry once after layout, and also support in-page hash navigation.
    let frame = 0;
    const scrollToTasks = () => {
      cancelAnimationFrame(frame);
      if (window.location.hash !== '#todos') return;
      frame = requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({ block: 'start' });
      });
    };
    scrollToTasks();
    window.addEventListener('hashchange', scrollToTasks);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', scrollToTasks);
    };
  }, [isLoading]);

  const persist = async (updated: Todo[], after?: () => void) => {
    if (saving || isDemo) return;
    setSaving(true);
    setError(null);
    try { await saveTodos(updated); after?.(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save the task. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) return;

    const todo: Todo = {
      id: crypto.randomUUID(),
      title: newTodo.title.trim(),
      description: newTodo.description.trim() || undefined,
      category: newTodo.category,
      completed: false,
      createdAt: Date.now(),
      dueDate: newTodo.dueDate || undefined,
    };

    const updated = [...todos, todo];
    await persist(updated, () => {
      setShowAddModal(false);
      setNewTodo({ title: '', description: '', category: TodoCategory.VIDEO, dueDate: '' });
    });
  };

  const handleToggleComplete = async (id: string) => {
    const updated = todos.map((todo) => {
      if (todo.id === id) {
        return {
          ...todo,
          completed: !todo.completed,
          completedAt: !todo.completed ? Date.now() : undefined,
        };
      }
      return todo;
    });
    await persist(updated);
  };

  const handleDeleteTodo = async (id: string) => {
    const updated = todos.filter((todo) => todo.id !== id);
    await persist(updated);
  };

  if (isLoading) return <p role="status" className="py-6 theme-text-secondary">Loading tasks…</p>;

  const activeTodos = todos.filter((t) => !t.completed).sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt - a.createdAt;
  });

  const completedTodos = todos.filter((t) => t.completed).sort((a, b) => {
    return (b.completedAt || 0) - (a.completedAt || 0);
  });

  const getCategoryColor = (category: TodoCategory) => {
    const colors: Record<TodoCategory, string> = {
      [TodoCategory.VIDEO]: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      [TodoCategory.NEWS]: 'bg-accent/20 text-accent border-accent/30',
      [TodoCategory.EDUCATION]: 'bg-success/20 text-success border-success/30',
      [TodoCategory.REVIEW]: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
      [TodoCategory.PLANNING]: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
      [TodoCategory.OTHER]: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
    };
    return colors[category];
  };

  const getCategoryLabel = (category: TodoCategory) => {
    return category.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <div ref={panelRef} className="glass-surface scroll-mt-4 p-4 sm:p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-black dark:text-white">To-Do</h2>
        <button
          onClick={() => { setError(null); setShowAddModal(true); }}
          disabled={isDemo || saving}
          aria-label="Add task"
          className="min-h-11 min-w-11 p-2 rounded-lg disabled:opacity-50 bg-accent hover:bg-accent-dark text-white transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {isDemo && <p className="mb-3 text-sm theme-text-secondary">Tasks are available in your own journal. Demo data is read-only.</p>}
      {error && !showAddModal && <p role="alert" className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activeTodos.length === 0 && completedTodos.length === 0 ? (
          <p className="text-black/60 dark:text-white/60 text-center py-8 text-sm">No to-dos yet</p>
        ) : (
          <>
            {activeTodos.map((todo) => {
              const isOverdue = isTodoOverdue(todo);
              
              return (
                <div
                  key={todo.id}
                  className={`p-3 bg-black/5 dark:bg-white/5 rounded-lg border transition-colors ${
                    isOverdue ? 'border-danger/50 bg-danger/5' : 'border-black/10 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(todo.id)}
                      disabled={saving || isDemo}
                      aria-label={`Complete ${todo.title}`}
                      aria-pressed={todo.completed}
                      className={`mt-0.5 flex-shrink-0 w-11 h-11 rounded border-2 flex items-center justify-center transition-colors ${
                        todo.completed
                          ? 'bg-success border-success'
                          : 'border-black/30 dark:border-white/30 hover:border-accent'
                      }`}
                    >
                      {todo.completed && <CheckIcon className="h-3 w-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium border ${getCategoryColor(todo.category)}`}>
                              {getCategoryLabel(todo.category)}
                            </span>
                            {isOverdue && (
                              <span className="text-xs text-danger font-medium">Overdue</span>
                            )}
                          </div>
                          <p className={`break-words text-sm font-medium ${todo.completed ? 'line-through text-black/50 dark:text-white/50' : 'text-black dark:text-white'}`}>
                            {todo.title}
                          </p>
                          {todo.description && (
                            <p className="break-words text-xs text-black/60 dark:text-white/60 mt-1">{todo.description}</p>
                          )}
                          {todo.dueDate && (
                            <p className={`text-xs mt-1 ${isOverdue ? 'text-danger' : 'text-black/50 dark:text-white/50'}`}>
                              Due: {format(parseISO(todo.dueDate), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                        disabled={saving || isDemo}
                        aria-label={`Delete ${todo.title}`}
                          className="flex-shrink-0 min-h-11 min-w-9 flex items-center justify-center text-black/40 dark:text-white/40 hover:text-danger transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {completedTodos.length > 0 && (
              <div className="pt-4 border-t border-black/10 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-medium theme-text-secondary mb-2">Completed ({completedTodos.length})</h3>{completedTodos.length > 3 && <button type="button" className="min-h-11 text-xs theme-text" onClick={() => setShowAllCompleted(!showAllCompleted)}>{showAllCompleted ? 'Show fewer' : 'Show all'}</button>}</div>
                {(showAllCompleted ? completedTodos : completedTodos.slice(0, 3)).map((todo) => (
                  <div
                    key={todo.id}
                    className="p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleComplete(todo.id)}
                        disabled={saving || isDemo}
                        aria-label={`Reopen ${todo.title}`}
                        aria-pressed={todo.completed}
                        className="mt-0.5 flex-shrink-0 w-11 h-11 rounded border-2 bg-success border-success flex items-center justify-center"
                      >
                        <CheckIcon className="h-3 w-3 text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium border ${getCategoryColor(todo.category)}`}>
                            {getCategoryLabel(todo.category)}
                          </span>
                        </div>
                        <p className="break-words text-sm font-medium line-through text-black/50 dark:text-white/50">
                          {todo.title}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        disabled={saving || isDemo}
                        aria-label={`Delete ${todo.title}`}
                        className="flex-shrink-0 min-h-11 min-w-9 flex items-center justify-center text-black/40 dark:text-white/40 hover:text-danger transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Todo Modal */}
      {showAddModal && (
        <ModalDialog isOpen onClose={() => { if (!saving) setShowAddModal(false); }} labelledBy="new-task-title" className="items-center justify-center">
          <div
            className="glass-surface-strong rounded-xl shadow-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h2 id="new-task-title" className="text-lg font-semibold text-black dark:text-white">New To-Do</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                  aria-label="Close new task"
                  className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  aria-label="Task title"
                  maxLength={200} disabled={saving}
                  value={newTodo.title}
                  onChange={(e) => updateTodo({ title: e.target.value })}
                  className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Watch market analysis video"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">
                  Category
                </label>
                <select aria-label="Task category" disabled={saving}
                  value={newTodo.category}
                  onChange={(e) => updateTodo({ category: e.target.value as TodoCategory })}
                  className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(TodoCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">
                  Description
                </label>
                <textarea aria-label="Task description" maxLength={2000} disabled={saving}
                  value={newTodo.description}
                  onChange={(e) => updateTodo({ description: e.target.value })}
                  className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  aria-label="Task due date" disabled={saving}
                  value={newTodo.dueDate}
                  onChange={(e) => updateTodo({ dueDate: e.target.value })}
                  className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleAddTodo}
                  disabled={saving || !newTodo.title.trim()}
                  className="flex-1 px-4 py-2.5 theme-button rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Add To-Do'}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-black/10 dark:bg-white/10 text-black dark:text-white rounded-lg hover:bg-black/20 dark:hover:bg-white/20 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
