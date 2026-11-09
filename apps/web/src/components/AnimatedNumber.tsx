'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatOptions?: Intl.NumberFormatOptions;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 0.8,
  formatOptions,
  prefix = '',
  suffix = '',
  decimals,
  className = '',
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Spring animation for the number
  const spring = useSpring(0, {
    stiffness: 75,
    damping: 25,
    duration: duration * 1000,
  });
  
  // Build format options with decimals if specified
  const mergedFormatOptions: Intl.NumberFormatOptions = {
    ...formatOptions,
    ...(decimals !== undefined ? {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    } : {}),
  };
  
  // Transform the spring value to formatted string
  const display = useTransform(spring, (current) => {
    const formatter = new Intl.NumberFormat('en-US', mergedFormatOptions);
    const formattedValue = decimals !== undefined ? current : Math.round(current);
    return `${prefix}${formatter.format(formattedValue)}${suffix}`;
  });

  // Intersection Observer to start animation when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  // Update spring when value changes or becomes visible
  useEffect(() => {
    if (isVisible) {
      spring.set(value);
    }
  }, [spring, value, isVisible]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}

// Currency-specific animated number
export function AnimatedCurrency({
  value,
  showSign = false,
  className = '',
}: {
  value: number;
  showSign?: boolean;
  className?: string;
}) {
  const prefix = showSign && value > 0 ? '+$' : value < 0 ? '-$' : '$';
  const absValue = Math.abs(value);

  return (
    <AnimatedNumber
      value={absValue}
      prefix={prefix}
      formatOptions={{
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }}
      className={className}
    />
  );
}

// Percentage-specific animated number
export function AnimatedPercentage({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      suffix="%"
      formatOptions={{
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }}
      className={className}
    />
  );
}

// Simple counter (whole numbers)
export function AnimatedCounter({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      className={className}
    />
  );
}
