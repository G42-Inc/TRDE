'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  fadeIn?: boolean;
  slideIn?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export function AnimatedView({ 
  children, 
  delay = 0, 
  duration = 300, 
  fadeIn = true, 
  slideIn,
  className = '',
}: AnimatedViewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getTransform = () => {
    if (!slideIn || !isVisible) return '';
    
    const transforms: Record<string, string> = {
      up: 'translateY(20px)',
      down: 'translateY(-20px)',
      left: 'translateX(20px)',
      right: 'translateX(-20px)',
    };
    
    return transforms[slideIn] || '';
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0, 0)' : getTransform(),
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}
