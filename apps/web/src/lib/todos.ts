import { format, isValid, parseISO } from 'date-fns';

/** A date-only deadline lasts through that local calendar day. */
export function isTodoOverdue(todo: { completed: boolean; dueDate?: string }, now = new Date()): boolean {
  if (todo.completed || !todo.dueDate) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(todo.dueDate)) return todo.dueDate < format(now, 'yyyy-MM-dd');
  const due = parseISO(todo.dueDate);
  return isValid(due) && due.getTime() < now.getTime();
}
