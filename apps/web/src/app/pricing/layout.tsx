'use client';

import { useEffect } from 'react';

// Pricing page layout - isolated from theme system, mono white/black theme
export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Force mono white/black theme for pricing page
    const root = document.documentElement;
    
    // Remove all theme attributes
    root.removeAttribute('data-dashboard-theme');
    root.removeAttribute('data-theme');
    
    // Remove dark mode class to force light mode (white background)
    root.classList.remove('dark');
    root.classList.add('light');
    
    // Set mono white/black theme variables
    root.style.setProperty('--font-family', "'Inter', sans-serif");
    root.style.setProperty('--theme-primary', '#000000');
    root.style.setProperty('--theme-bg', '#ffffff');
    root.style.setProperty('--theme-bg-secondary', '#ffffff');
    root.style.setProperty('--theme-text', '#000000');
    root.style.setProperty('--theme-text-secondary', '#1a1a1a');
    root.style.setProperty('--theme-border', '#d4d4d4');
    root.style.setProperty('background-color', '#ffffff');
    root.style.setProperty('color', '#000000');
    
    // Ensure body also has white background
    if (document.body) {
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
    }
  }, []);

  return (
    <div className="font-sans bg-white text-black" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#ffffff', color: '#000000' }}>
      {children}
    </div>
  );
}
