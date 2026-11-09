'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastComponent({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsVisible(true), 10);
    
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300); // Wait for fade out
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const bgColor = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-yellow-500',
    info: 'bg-accent',
  }[toast.type];

  const borderColor = {
    success: 'border-positive',
    error: 'border-negative',
    warning: 'border-yellow-500',
    info: 'border-accent',
  }[toast.type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 shadow-2xl border-2 ${borderColor} flex items-center space-x-3 min-w-[300px] max-w-md`}
      style={{
        borderRadius: 'var(--glass-radius-md, 8px)',
        backdropFilter: 'var(--glass-blur, blur(20px) saturate(180%))',
        WebkitBackdropFilter: 'var(--glass-blur, blur(20px) saturate(180%))',
        animation: isVisible 
          ? 'slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' 
          : 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {toast.type === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="flex-shrink-0 hover:bg-white/20 active:bg-white/30 rounded p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 space-y-2 flex flex-col items-end">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
