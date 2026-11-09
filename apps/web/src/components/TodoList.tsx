'use client';

import { useState, useEffect } from 'react';
import { useStorage } from '@/contexts/StorageContext';
import type { Todo } from '@trde/core';
import { TodoCategory } from '@trde/core';
import { XMarkIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { format, isPast, parseISO } from 'date-fns';

export function TodoList() {
  const { todos, saveTodos } = useStorage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    category: TodoCategory.VIDEO as TodoCategory,
    dueDate: '',
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) return;

    const todo: Todo = {
      id: `todo-${Date.now()}`,
      title: newTodo.title.trim(),
      description: newTodo.description.trim() || undefined,
      category: newTodo.category,
      completed: false,
      createdAt: Date.now(),
      dueDate: newTodo.dueDate || undefined,
    };

    const updated = [...todos, todo];
    await saveTodos(updated);
    setShowAddModal(false);
    setNewTodo({ title: '', description: '', category: TodoCategory.VIDEO, dueDate: '' });
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
    await saveTodos(updated);
  };

  const handleDeleteTodo = async (id: string) => {
    const updated = todos.filter((todo) => todo.id !== id);
    await saveTodos(updated);
  };

  if (!mounted) {
    return null;
  }

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
    <div className="glass-surface p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-black dark:text-white">To-Do</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2 rounded-lg bg-accent hover:bg-accent-dark text-white transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activeTodos.length === 0 && completedTodos.length === 0 ? (
          <p className="text-black/60 dark:text-white/60 text-center py-8 text-sm">No to-dos yet</p>
        ) : (
          <>
            {activeTodos.map((todo) => {
              const isOverdue = todo.dueDate && isPast(parseISO(todo.dueDate)) && !todo.completed;
              
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
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        todo.completed
                          ? 'bg-success border-success'
                          : 'border-black/30 dark:border-white/30 hover:border-accent'
                      }`}
                    >
                      {todo.completed && <CheckIcon className="h-3 w-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium border ${getCategoryColor(todo.category)}`}>
                              {getCategoryLabel(todo.category)}
                            </span>
                            {isOverdue && (
                              <span className="text-xs text-danger font-medium">Overdue</span>
                            )}
                          </div>
                          <p className={`text-sm font-medium ${todo.completed ? 'line-through text-black/50 dark:text-white/50' : 'text-black dark:text-white'}`}>
                            {todo.title}
                          </p>
                          {todo.description && (
                            <p className="text-xs text-black/60 dark:text-white/60 mt-1">{todo.description}</p>
                          )}
                          {todo.dueDate && (
                            <p className={`text-xs mt-1 ${isOverdue ? 'text-danger' : 'text-black/50 dark:text-white/50'}`}>
                              Due: {format(parseISO(todo.dueDate), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="flex-shrink-0 text-black/40 dark:text-white/40 hover:text-danger transition-colors"
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
                <h3 className="text-xs font-medium text-black/60 dark:text-white/60 mb-2">Completed</h3>
                {completedTodos.slice(0, 3).map((todo) => (
                  <div
                    key={todo.id}
                    className="p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleComplete(todo.id)}
                        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 bg-success border-success flex items-center justify-center"
                      >
                        <CheckIcon className="h-3 w-3 text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium border ${getCategoryColor(todo.category)}`}>
                            {getCategoryLabel(todo.category)}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-through text-black/50 dark:text-white/50">
                          {todo.title}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="flex-shrink-0 text-black/40 dark:text-white/40 hover:text-danger transition-colors"
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-surface-strong rounded-xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-black dark:text-white">New To-Do</h2>
                <button
                  onClick={() => setShowAddModal(false)}
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
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Watch market analysis video"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-1.5">
                  Category
                </label>
                <select
                  value={newTodo.category}
                  onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value as TodoCategory })}
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
                <textarea
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
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
                  value={newTodo.dueDate}
                  onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                  className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleAddTodo}
                  disabled={!newTodo.title.trim()}
                  className="flex-1 px-4 py-2.5 theme-button rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add To-Do
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-black/10 dark:bg-white/10 text-black dark:text-white rounded-lg hover:bg-black/20 dark:hover:bg-white/20 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
