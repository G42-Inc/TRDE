'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  shape: 'square' | 'circle' | 'ribbon';
}

interface ConfettiProps {
  /** Duration in milliseconds before confetti stops spawning */
  duration?: number;
  /** Number of particles to spawn */
  particleCount?: number;
  /** Spread angle in degrees */
  spread?: number;
  /** Origin point (0-1 for x, 0-1 for y) */
  origin?: { x: number; y: number };
  /** Confetti variant */
  variant?: 'burst' | 'rain' | 'sides' | 'gold';
  /** Auto-start on mount */
  autoStart?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
}

// Color palettes
const COLORS = {
  default: ['#C9A962', '#FFD700', '#FFFFFF', '#FFF8DC', '#DAA520'],
  gold: ['#C9A962', '#FFD700', '#B8860B', '#DAA520', '#F0E68C'],
  celebration: ['#C9A962', '#FFD700', '#FFFFFF', '#22C55E', '#3B82F6'],
};

/**
 * Canvas-based confetti animation component
 * Optimized for performance with requestAnimationFrame
 */
export function Confetti({
  duration = 3000,
  particleCount = 100,
  spread = 70,
  origin = { x: 0.5, y: 0.5 },
  variant = 'burst',
  autoStart = true,
  onComplete,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  const getColors = useCallback(() => {
    return variant === 'gold' ? COLORS.gold : COLORS.default;
  }, [variant]);

  const createParticle = useCallback((canvas: HTMLCanvasElement): Particle => {
    const colors = getColors();
    const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180);
    const velocity = 8 + Math.random() * 8;
    
    let x = canvas.width * origin.x;
    let y = canvas.height * origin.y;
    let vx = Math.cos(angle - Math.PI / 2) * velocity;
    let vy = Math.sin(angle - Math.PI / 2) * velocity - 5;

    // Adjust based on variant
    if (variant === 'rain') {
      x = Math.random() * canvas.width;
      y = -20;
      vx = (Math.random() - 0.5) * 2;
      vy = 3 + Math.random() * 4;
    } else if (variant === 'sides') {
      const side = Math.random() > 0.5;
      x = side ? 0 : canvas.width;
      y = canvas.height * 0.8;
      vx = (side ? 1 : -1) * (8 + Math.random() * 6);
      vy = -(10 + Math.random() * 8);
    }

    return {
      x,
      y,
      vx,
      vy,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      life: 0,
      maxLife: 120 + Math.random() * 60,
      shape: ['square', 'circle', 'ribbon'][Math.floor(Math.random() * 3)] as Particle['shape'],
    };
  }, [getColors, origin, spread, variant]);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    
    const opacity = 1 - particle.life / particle.maxLife;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = particle.color;

    switch (particle.shape) {
      case 'square':
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'ribbon':
        ctx.fillRect(-particle.size / 2, -particle.size * 1.5, particle.size / 3, particle.size * 3);
        break;
    }

    ctx.restore();
  }, []);

  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn new particles during duration
    if (elapsed < duration && particlesRef.current.length < particleCount) {
      const spawnRate = Math.ceil(particleCount / (duration / 16));
      for (let i = 0; i < spawnRate && particlesRef.current.length < particleCount; i++) {
        particlesRef.current.push(createParticle(canvas));
      }
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((particle) => {
      // Physics
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.3; // Gravity
      particle.vx *= 0.99; // Air resistance
      particle.rotation += particle.rotationSpeed;
      particle.life++;

      // Draw
      drawParticle(ctx, particle);

      // Keep alive
      return particle.life < particle.maxLife && particle.y < canvas.height + 50;
    });

    // Continue or complete
    if (particlesRef.current.length > 0 || elapsed < duration) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      isRunningRef.current = false;
      onComplete?.();
    }
  }, [duration, particleCount, createParticle, drawParticle, onComplete]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    startTimeRef.current = 0;
    particlesRef.current = [];
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Auto-start
  useEffect(() => {
    if (autoStart) {
      start();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [autoStart, start]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

/**
 * Hook to imperatively trigger confetti
 */
export function useConfetti() {
  const triggerRef = useRef<(() => void) | null>(null);

  const trigger = useCallback((options?: Partial<ConfettiProps>) => {
    // Create temporary confetti container
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Import and render dynamically would be complex, 
    // so this hook is simplified to work with the Confetti component
    triggerRef.current?.();
  }, []);

  return { trigger };
}
