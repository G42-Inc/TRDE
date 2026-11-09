'use client';

import { ModalDialog } from './ModalDialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ALL_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const categories = {
    actions: ALL_SHORTCUTS.filter(s => s.category === 'actions'),
    navigation: ALL_SHORTCUTS.filter(s => s.category === 'navigation'),
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} labelledBy="keyboard-shortcuts-title" className="items-center justify-center">
      <section className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-2xl border border-white/15 bg-slate-950 text-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 id="keyboard-shortcuts-title" className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
              <button
                onClick={onClose}
                aria-label="Close keyboard shortcuts"
                autoFocus
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/70 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Actions */}
              <div>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-3">
                  Actions
                </h3>
                <div className="space-y-2">
                  {categories.actions.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-white/5"
                    >
                      <span className="text-white/80">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <kbd
                            key={j}
                            className="px-2 py-1 rounded bg-white/10 text-xs text-white/70 font-mono min-w-[28px] text-center"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-3">
                  Navigation
                </h3>
                <p className="text-xs text-white/50 mb-3">
                  Press G then the letter to navigate
                </p>
                <div className="space-y-2">
                  {categories.navigation.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-white/5"
                    >
                      <span className="text-white/80">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <kbd
                            key={j}
                            className="px-2 py-1 rounded bg-white/10 text-xs text-white/70 font-mono min-w-[28px] text-center"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <p className="text-xs text-white/40 text-center">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Esc</kbd> to close
              </p>
            </div>
      </section>
    </ModalDialog>
  );
}
