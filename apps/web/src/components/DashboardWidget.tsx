'use client';

import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon, XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

export type WidgetSize = '1x1' | '2x1' | '2x2' | '1x2';

export interface DashboardWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  children: ReactNode;
  onRemove?: () => void;
  onSettings?: () => void;
  isDraggable?: boolean;
}

export function DashboardWidget({
  id,
  title,
  size,
  children,
  onRemove,
  onSettings,
  isDraggable = true,
}: DashboardWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Map size to grid column/row spans
  const sizeClass = {
    '1x1': 'col-span-1 row-span-1',
    '2x1': 'col-span-2 row-span-1',
    '2x2': 'col-span-2 row-span-2',
    '1x2': 'col-span-1 row-span-2',
  }[size];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'card-premium hover-lift relative group',
        sizeClass,
        isDragging && 'opacity-50 scale-105 z-50',
        !isDraggable && 'cursor-default'
      )}
    >
      {/* Header with drag handle and controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isDraggable && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing theme-text-secondary hover:theme-text p-1 rounded-lg hover:theme-bg-tertiary transition-all flex-shrink-0"
              aria-label="Drag to reorder"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          )}
          <h3 className="theme-text font-semibold text-lg truncate">{title}</h3>
        </div>

        {/* Widget controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onSettings && (
            <button
              onClick={onSettings}
              className="theme-text-secondary hover:theme-text p-1.5 rounded-lg hover:theme-bg-tertiary transition-all"
              aria-label="Widget settings"
            >
              <Cog6ToothIcon className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="theme-text-secondary hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-all"
              aria-label="Remove widget"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Widget content */}
      <div className="overflow-auto h-full">{children}</div>
    </div>
  );
}
