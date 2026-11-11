import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_NAVIGATION, isNavigationActive } from '../src/lib/app-navigation';
import { resolveKeyboardShortcut } from '../src/lib/keyboard-shortcuts';
import { isTodoOverdue } from '../src/lib/todos';

test('phone navigation exposes the same journal, review and analysis destinations as the workspace', () => {
  const routes = new Set<string>(APP_NAVIGATION.map((item) => item.href));
  for (const route of ['/app', '/trades', '/trades/timeline', '/journal', '/review', '/risk', '/analytics', '/strategies', '/performance', '/edge', '/settings']) {
    assert.equal(routes.has(route), true, `Missing phone navigation destination ${route}`);
  }
  assert.equal(routes.has('/flow'), false, 'Unfinished Flow is not presented as a working destination');
  assert.equal(routes.size, APP_NAVIGATION.length);
});

test('navigation marks nested pages without selecting unrelated prefixes or both trade destinations', () => {
  assert.equal(isNavigationActive('/strategies/new', '/strategies'), true);
  assert.equal(isNavigationActive('/trades/id/edit', '/trades'), true);
  assert.equal(isNavigationActive('/trades/timeline', '/trades'), false);
  assert.equal(isNavigationActive('/trades/timeline', '/trades/timeline'), true);
  assert.equal(isNavigationActive('/application', '/app'), false);
});

test('workspace shortcuts support both platforms, navigation sequences and international question-mark keys', () => {
  assert.equal(resolveKeyboardShortcut({ key: 'k', metaKey: true }, null), 'palette');
  assert.equal(resolveKeyboardShortcut({ key: 'k', ctrlKey: true }, null), 'palette');
  assert.equal(resolveKeyboardShortcut({ key: '?', shiftKey: true }, null), 'help');
  assert.equal(resolveKeyboardShortcut({ key: '?' }, null), 'help');
  assert.equal(resolveKeyboardShortcut({ key: 'g' }, null), 'prefix');
  assert.deepEqual(resolveKeyboardShortcut({ key: 'j' }, 'g'), { href: '/journal' });
  assert.deepEqual(resolveKeyboardShortcut({ key: 'n' }, null), { href: '/trades/new' });
});

test('pending G never steals browser shortcuts or ordinary unmatched keys', () => {
  for (const input of [
    { key: 't', ctrlKey: true }, { key: 'r', metaKey: true },
    { key: 's', altKey: true }, { key: 'T', shiftKey: true },
    { key: 'Tab' }, { key: 'Escape' }, { key: 'x' },
  ]) assert.equal(resolveKeyboardShortcut(input, 'g'), null);
  assert.equal(resolveKeyboardShortcut({ key: 'n', ctrlKey: true }, null), null);
  assert.equal(resolveKeyboardShortcut({ key: 'k', metaKey: true, ctrlKey: true }, null), null);
});

test('tasks due today remain current for the whole local date, while older deadlines are overdue', () => {
  const now = new Date(2026, 10, 9, 23, 59);
  assert.equal(isTodoOverdue({ completed: false, dueDate: '2026-11-09' }, now), false);
  assert.equal(isTodoOverdue({ completed: false, dueDate: '2026-11-08' }, now), true);
  assert.equal(isTodoOverdue({ completed: true, dueDate: '2026-11-08' }, now), false);
  assert.equal(isTodoOverdue({ completed: false }, now), false);
  assert.equal(isTodoOverdue({ completed: false, dueDate: 'invalid' }, now), false);
});
