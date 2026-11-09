'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface NavItem {
  label: string;
  href: string;
}

interface NavDropdownProps {
  label: string;
  items: NavItem[];
}

export function NavDropdown({ label, items }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<'first' | 'last' | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const close = () => {
    clearCloseTimer();
    focusTargetRef.current = null;
    setIsOpen(false);
  };

  const handleMouseEnter = () => {
    clearCloseTimer();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    timeoutRef.current = setTimeout(() => {
      // Pointer movement must not remove links while a keyboard user is in them.
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 200);
  };

  useEffect(() => {
    if (!isOpen || !focusTargetRef.current) return;
    const links = dropdownRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]');
    const target = focusTargetRef.current === 'last' ? links?.[links.length - 1] : links?.[0];
    target?.focus();
    focusTargetRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        focusTargetRef.current = null;
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={dropdownRef} 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault();
          event.stopPropagation();
          close();
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          clearCloseTimer();
          setIsOpen((open) => !open);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          clearCloseTimer();
          const target = event.key === 'ArrowUp' ? 'last' : 'first';
          if (isOpen) {
            const links = dropdownRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]');
            (target === 'last' ? links?.[links.length - 1] : links?.[0])?.focus();
          } else {
            focusTargetRef.current = target;
            setIsOpen(true);
          }
        }}
        className="flex min-h-11 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:text-black transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        {label}
        <ChevronDownIcon
          aria-hidden="true"
          className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={panelId}
        hidden={!isOpen}
        className="absolute top-full left-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50"
      >
        <ul className="py-2">
          {items.map((item, index) => (
            <li key={`${item.label}-${item.href}-${index}`}>
              <Link
                href={item.href}
                onClick={close}
                className="block min-h-11 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black focus-visible:bg-gray-100 focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
