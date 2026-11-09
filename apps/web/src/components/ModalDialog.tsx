'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Native modal focus containment, Escape handling and focus restoration. */
export function ModalDialog({ isOpen, onClose, labelledBy, children, className = '' }: {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [isOpen]);

  return (
    <dialog ref={ref} aria-labelledby={labelledBy}
      className={`fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-4 text-inherit backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex [&:not([open])]:hidden ${className}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >{children}</dialog>
  );
}
