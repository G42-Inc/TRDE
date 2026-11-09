'use client';

import { useEffect } from 'react';

// Public routes layout (no sidebar/header)
// Isolated from theme system - uses default mono styling
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Ensure dashboard theme is removed for public pages
    // Root layout script handles the rest, but we ensure cleanup here
    const root = document.documentElement;
    root.removeAttribute('data-dashboard-theme');
    root.removeAttribute('data-theme'); // Remove old attribute if present
  }, []);

  return (
    <div 
      className="font-sans min-h-screen" 
      style={{ 
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {children}
    </div>
  );
}
