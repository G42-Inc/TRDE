'use client';

import React, { useEffect } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';

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
  const reducedMotion = useReducedMotion();
  
  // Spring animation for the number
  const spring = useSpring(value, {
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
  
  const formatValue = (current: number) => {
    const formatter = new Intl.NumberFormat('en-US', mergedFormatOptions);
    const formattedValue = decimals !== undefined || formatOptions ? current : Math.round(current);
    return `${prefix}${formatter.format(formattedValue)}${suffix}`;
  };
  const display = useTransform(spring, formatValue);

  // Show the actual result immediately; animate only subsequent value changes.
  // Screen readers always receive the final value, including offscreen metrics.
  useEffect(() => {
    if (reducedMotion) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reducedMotion]);

  return (
    <span className={className}>
      <span className="sr-only">{formatValue(value)}</span>
      <motion.span aria-hidden="true">{display}</motion.span>
    </span>
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
