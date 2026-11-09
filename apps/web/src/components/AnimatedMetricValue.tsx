'use client';

import { AnimatedNumber } from './AnimatedNumber';

interface AnimatedMetricValueProps {
  value: string;
  positive?: boolean;
  className?: string;
}

export function AnimatedMetricValue({ value, positive = true, className = '' }: AnimatedMetricValueProps) {
  // Parse the value string to extract number, prefix, and suffix
  const parseValue = (val: string) => {
    // First check if value contains commas, K, M - these are pre-formatted and should render directly
    // This handles "+$27,391", "$212K", "-$1.5M", etc.
    if (val.includes(',') || val.includes('K') || val.includes('M')) {
      return { prefix: '', number: 0, suffix: val, decimals: 0, useRaw: true };
    }
    
    // Match patterns like: "$123.45", "$-123.45", "+$123.45", "50.5%", "-50.5%", "123.45R", "-123.45R", "∞"
    const infinityMatch = val.match(/^∞$/);
    // Handle dollar amounts with optional +/- prefix: +$123.45, -$123.45, $123.45, $-123.45
    const dollarMatch = val.match(/^([+-]?)\$(-?[\d.]+)$/) || val.match(/^\$([+-]?)([\d.]+)$/);
    const percentMatch = val.match(/^([+-]?)([\d.]+)%$/);
    const rMatch = val.match(/^([+-]?)([\d.]+)R$/);
    const plainNumber = val.match(/^([+-]?)([\d.]+)$/);
    
    if (infinityMatch) {
      return { prefix: '', number: Infinity, suffix: '∞', decimals: 0, useRaw: false };
    }
    
    if (dollarMatch) {
      const sign = dollarMatch[1] === '-' ? -1 : 1;
      const num = parseFloat(dollarMatch[2]) * sign;
      const prefix = dollarMatch[1] === '+' ? '+$' : '$';
      return { prefix, number: num, suffix: '', decimals: 2, useRaw: false };
    }
    
    if (percentMatch) {
      const sign = percentMatch[1] === '-' ? -1 : 1;
      const num = parseFloat(percentMatch[2]) * sign;
      const prefix = percentMatch[1] === '+' ? '+' : '';
      return { prefix, number: num, suffix: '%', decimals: 1, useRaw: false };
    }
    
    if (rMatch) {
      const sign = rMatch[1] === '-' ? -1 : 1;
      const num = parseFloat(rMatch[2]) * sign;
      const prefix = rMatch[1] === '+' ? '+' : '';
      return { prefix, number: num, suffix: 'R', decimals: 2, useRaw: false };
    }
    
    if (plainNumber) {
      const sign = plainNumber[1] === '-' ? -1 : 1;
      const num = parseFloat(plainNumber[2]) * sign;
      const prefix = plainNumber[1] === '+' ? '+' : '';
      return { prefix, number: num, suffix: '', decimals: 2, useRaw: false };
    }
    
    // For any other pre-formatted values, render directly
    return { prefix: '', number: 0, suffix: val, decimals: 0, useRaw: true };
  };

  const parsed = parseValue(value);
  
  if (parsed.number === Infinity) {
    return (
      <span className={className}>∞</span>
    );
  }

  // For pre-formatted values, render directly without animation
  if (parsed.useRaw) {
    return <span className={className}>{value}</span>;
  }

  return (
    <AnimatedNumber
      value={parsed.number}
      prefix={parsed.prefix}
      suffix={parsed.suffix}
      decimals={parsed.decimals}
      className={className}
    />
  );
}
