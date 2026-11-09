'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ModalDialog } from './ModalDialog';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ShieldExclamationIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  ArrowPathIcon,
  PresentationChartLineIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
interface Command {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigation' | 'actions' | 'settings';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Define commands
  const commands: Command[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      description: 'Go to dashboard',
      icon: <HomeIcon className="w-5 h-5" />,
      action: () => router.push('/app'),
      category: 'navigation',
      keywords: ['home', 'main'],
    },
    {
      id: 'nav-trades',
      title: 'Trades',
      description: 'View all trades',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      action: () => router.push('/trades'),
      category: 'navigation',
      keywords: ['list', 'history'],
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      description: 'View analytics',
      icon: <ChartBarIcon className="w-5 h-5" />,
      action: () => router.push('/analytics'),
      category: 'navigation',
      keywords: ['stats', 'charts', 'graphs'],
    },
    {
      id: 'nav-performance',
      title: 'Performance',
      description: 'Performance metrics',
      icon: <ChartPieIcon className="w-5 h-5" />,
      action: () => router.push('/performance'),
      category: 'navigation',
      keywords: ['metrics', 'results'],
    },
    {
      id: 'nav-journal',
      title: 'Journal',
      description: 'Trading journal',
      icon: <BookOpenIcon className="w-5 h-5" />,
      action: () => router.push('/journal'),
      category: 'navigation',
      keywords: ['notes', 'diary'],
    },
    {
      id: 'nav-strategies',
      title: 'Strategies',
      description: 'Manage strategies',
      icon: <PresentationChartLineIcon className="w-5 h-5" />,
      action: () => router.push('/strategies'),
      category: 'navigation',
      keywords: ['plans', 'systems'],
    },
    {
      id: 'nav-risk',
      title: 'Risk',
      description: 'Risk management',
      icon: <ShieldExclamationIcon className="w-5 h-5" />,
      action: () => router.push('/risk'),
      category: 'navigation',
      keywords: ['rules', 'limits'],
    },
    {
      id: 'nav-edge',
      title: 'Edge',
      description: 'ProjectX trading',
      icon: <ArrowRightOnRectangleIcon className="w-5 h-5" />,
      action: () => router.push('/edge'),
      category: 'navigation',
      keywords: ['projectx', 'sync'],
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      description: 'App settings',
      icon: <Cog6ToothIcon className="w-5 h-5" />,
      action: () => router.push('/settings'),
      category: 'navigation',
      keywords: ['preferences', 'config'],
    },

    // Actions
    {
      id: 'action-new-trade',
      title: 'New Trade',
      description: 'Log a new trade',
      icon: <PlusIcon className="w-5 h-5" />,
      action: () => router.push('/trades/new'),
      category: 'actions',
      keywords: ['add', 'create', 'log'],
    },
    {
      id: 'action-sync',
      title: 'Sync Trades',
      description: 'Sync from ProjectX',
      icon: <ArrowPathIcon className="w-5 h-5" />,
      action: () => router.push('/settings?tab=api'),
      category: 'actions',
      keywords: ['import', 'projectx', 'refresh'],
    },
    {
      id: 'action-review',
      title: 'Weekly Review',
      description: 'Start weekly review',
      icon: <ClockIcon className="w-5 h-5" />,
      action: () => router.push('/review'),
      category: 'actions',
      keywords: ['summary', 'report'],
    },

  ], [router]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    
    const query = search.toLowerCase();
    return commands.filter(cmd => {
      const titleMatch = cmd.title.toLowerCase().includes(query);
      const descMatch = cmd.description?.toLowerCase().includes(query);
      const keywordMatch = cmd.keywords?.some(k => k.includes(query));
      return titleMatch || descMatch || keywordMatch;
    });
  }, [commands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      actions: [],
      settings: [],
    };
    
    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });
    
    return groups;
  }, [filteredCommands]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.max(0, Math.min(i + 1, filteredCommands.length - 1)));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Execute command
  const executeCommand = (command: Command) => {
    command.action();
    onClose();
  };

  // Get flat index for a command
  let flatIndex = 0;

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} labelledBy="command-palette-title" className="items-start justify-center pt-[8dvh] sm:pt-[12dvh]">
      <section className="flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-white shadow-2xl" onKeyDown={handleKeyDown}>
        <h2 id="command-palette-title" className="sr-only">Search pages and actions</h2>
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <MagnifyingGlassIcon className="w-5 h-5 text-white/40" />
              <input
                ref={inputRef}
                type="text"
                aria-label="Search pages and actions"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or search..."
                className="min-w-0 flex-1 bg-transparent text-white placeholder-white/40 outline-none text-lg"
              />
              <kbd className="px-2 py-1 rounded bg-white/10 text-xs text-white/50 font-mono">
                ESC
              </kbd>
            </div>

            {/* Commands List */}
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-2">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/40">
                  No commands found for &quot;{search}&quot;
                </div>
              ) : (
                <>
                  {Object.entries(groupedCommands).map(([category, cmds]) => {
                    if (cmds.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wide">
                          {category}
                        </div>
                        {cmds.map((cmd) => {
                          const currentIndex = flatIndex++;
                          const isSelected = currentIndex === selectedIndex;
                          
                          return (
                            <button
                              key={cmd.id}
                              data-index={currentIndex}
                              onClick={() => executeCommand(cmd)}
                              onMouseEnter={() => setSelectedIndex(currentIndex)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                isSelected ? 'bg-accent/20' : 'hover:bg-white/5'
                              }`}
                            >
                              <div className={`${isSelected ? 'text-accent' : 'text-white/60'}`}>
                                {cmd.icon}
                              </div>
                              <div className="flex-1">
                                <div className={`font-medium ${isSelected ? 'text-white' : 'text-white/90'}`}>
                                  {cmd.title}
                                </div>
                                {cmd.description && (
                                  <div className="text-sm text-white/50">
                                    {cmd.description}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <kbd className="px-2 py-1 rounded bg-white/10 text-xs text-white/50 font-mono">
                                  Enter
                                </kbd>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="shrink-0 px-4 py-3 border-t border-white/10 flex flex-wrap gap-2 items-center justify-between text-xs text-white/60">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">↑↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Enter</kbd>
                  to select
                </span>
              </div>

            </div>
      </section>
    </ModalDialog>
  );
}
