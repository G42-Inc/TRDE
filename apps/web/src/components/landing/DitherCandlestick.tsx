'use client';

/* eslint-disable react/no-unknown-property */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════
   VERTEX SHADER
   ═══════════════════════════════════════════════════════════════ */

const vertexShader = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

/* ═══════════════════════════════════════════════════════════════
   FRAGMENT SHADER — clean candlestick chart

   No dither. Full resolution. Anti-aliased edges via smoothstep.
   Subtle ambient glow on candles for depth.
   ═══════════════════════════════════════════════════════════════ */

const fragmentShader = `
precision highp float;

uniform vec2 resolution;
uniform float mouseX;
uniform float mouseY;
uniform float vel;

varying vec2 vUv;

/* ── Hash ── */
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

/* ── Random-walk price at candle idx ── */
float closeAt(int idx) {
  float p = 0.45;
  float mom = 0.0;
  for (int i = 0; i < 50; i++) {
    if (i >= idx) break;
    float fi = float(i);
    float r = hash(fi * 1.731 + 0.37) - 0.48;
    mom = mom * 0.3 + r * 0.7;
    float mv = mom * 0.13;
    float big = step(0.82, hash(fi * 5.17 + 0.9));
    mv *= 1.0 + big * 2.5;
    mv -= (p - 0.5) * 0.06;
    p += mv;
  }
  return clamp(p, 0.06, 0.94);
}

/* ── Smooth rectangle SDF ── */
float rectSDF(vec2 p, vec2 half_size) {
  vec2 d = abs(p) - half_size;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float aspect = resolution.x / resolution.y;
  vec2 st = vec2(uv.x * aspect, uv.y);

  // Pixel size in UV space (for anti-aliasing)
  float px = 1.0 / resolution.y;

  /* ── Background ── */
  // Subtle radial vignette
  float vign = 1.0 - 0.3 * length((uv - 0.5) * vec2(aspect, 1.0));
  vec3 col = vec3(0.025) * vign;

  // Grid lines
  float gy = fract(uv.y * 8.0);
  float gridH = 1.0 - smoothstep(0.0, px * 1.5, abs(gy - 0.5) - 0.498);
  col = mix(col, vec3(0.055), gridH * 0.5);

  float gx = fract(st.x * 3.0);
  float gridV = 1.0 - smoothstep(0.0, px * 1.5, abs(gx - 0.5) - 0.499);
  col = mix(col, vec3(0.045), gridV * 0.4);

  /* ── Chart params ── */
  const int N = 48;
  float totalW = aspect + 0.3;
  float sp = totalW / float(N);
  float bodyHW = sp * 0.34;    // body half-width
  float wickHW = sp * 0.045;   // wick half-width
  float sY = 0.80;
  float bY = 0.10;

  float drift = (0.5 - mouseY) * vel * 0.05;

  // Accumulate candle glow separately
  float glow = 0.0;

  for (int i = 0; i < 48; i++) {
    float fi = float(i);
    float cx = sp * (fi + 0.5) - 0.15;
    if (cx < -sp * 2.0 || cx > aspect + sp * 2.0) continue;

    /* ── OHLC ── */
    float o = closeAt(i) + drift;
    float c = closeAt(i + 1) + drift;

    /* ── Volume scaling ── */
    float normX = (fi + 0.5) / float(N);
    float dx = normX - mouseX;
    float prox = exp(-dx * dx * 5.0);
    float scale = 1.0 + vel * prox * 1.6;

    float mid = (o + c) * 0.5;
    float hb = abs(c - o) * 0.5 * scale;
    hb = max(hb, 0.008);
    float bTop = mid + hb;
    float bBot = mid - hb;
    float bull = step(o, c);

    // Wicks
    float wu = 0.01 + hash(fi * 3.71 + 0.1) * 0.04 + vel * prox * 0.025;
    float wd = 0.01 + hash(fi * 4.29 + 0.2) * 0.04 + vel * prox * 0.025;
    float hi = bTop + wu;
    float lo = bBot - wd;

    // To screen coords
    float scrBBot = bBot * sY + bY;
    float scrBTop = bTop * sY + bY;
    float scrH    = hi * sY + bY;
    float scrL    = lo * sY + bY;
    float scrMid  = (scrBBot + scrBTop) * 0.5;

    vec3 bullCol = vec3(0.82, 0.66, 0.30);
    vec3 bearCol = vec3(0.38, 0.30, 0.20);
    vec3 candleCol = mix(bearCol, bullCol, bull);

    /* ── Draw wick (smooth) ── */
    float wickDist = rectSDF(
      vec2(st.x - cx, uv.y - (scrL + scrH) * 0.5),
      vec2(wickHW, (scrH - scrL) * 0.5)
    );
    float wickAlpha = 1.0 - smoothstep(0.0, px * 1.2, wickDist);
    col = mix(col, candleCol * 0.45, wickAlpha);

    /* ── Draw body (smooth) ── */
    float bodyDist = rectSDF(
      vec2(st.x - cx, uv.y - scrMid),
      vec2(bodyHW, (scrBTop - scrBBot) * 0.5)
    );
    float bodyAlpha = 1.0 - smoothstep(0.0, px * 1.2, bodyDist);

    // Inner gradient for 3D depth
    float yNorm = (uv.y - scrBBot) / max(0.001, scrBTop - scrBBot);
    float shade = 0.82 + 0.18 * (1.0 - abs(yNorm - 0.5) * 2.0);
    col = mix(col, candleCol * shade, bodyAlpha);

    // Subtle edge highlight on top of body
    float edgeDist = abs(bodyDist);
    float edge = exp(-edgeDist * edgeDist / (px * px * 6.0)) * 0.15;
    col += candleCol * edge * bodyAlpha;

    /* ── Glow around candle (soft bloom) ── */
    float glowDist = rectSDF(
      vec2(st.x - cx, uv.y - scrMid),
      vec2(bodyHW * 1.5, (scrBTop - scrBBot) * 0.7)
    );
    glow += exp(-glowDist * glowDist / (px * px * 800.0)) * bull * 0.08;
    glow += exp(-glowDist * glowDist / (px * px * 800.0)) * (1.0 - bull) * 0.03;
  }

  // Apply glow
  col += vec3(0.78, 0.63, 0.29) * glow;

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ═══════════════════════════════════════════════════════════════
   SCENE — reads mouse from shared ref, pushes uniforms
   ═══════════════════════════════════════════════════════════════ */

interface SceneProps {
  mouseRef: React.RefObject<{ x: number; y: number; vel: number }>;
}

function CandleScene({ mouseRef }: SceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport, size, gl } = useThree();
  const sm = useRef({ x: 0.5, y: 0.5, vel: 0 });

  const uniforms = useMemo(
    () => ({
      resolution: new THREE.Uniform(new THREE.Vector2()),
      mouseX: new THREE.Uniform(0.5),
      mouseY: new THREE.Uniform(0.5),
      vel: new THREE.Uniform(0),
    }),
    [],
  );

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    uniforms.resolution.value.set(
      Math.floor(size.width * dpr),
      Math.floor(size.height * dpr),
    );
  }, [size, gl, uniforms]);

  useFrame(() => {
    const raw = mouseRef.current;
    if (!raw) return;

    // Smooth position
    sm.current.x += (raw.x - sm.current.x) * 0.10;
    sm.current.y += (raw.y - sm.current.y) * 0.10;

    // Read velocity then immediately drain it.
    // mousemove events refill it; between events it drops to 0.
    const impulse = raw.vel;
    raw.vel = 0;

    // Smooth velocity: fast ramp, slow decay
    if (impulse > sm.current.vel) {
      sm.current.vel += (impulse - sm.current.vel) * 0.4;
    } else {
      sm.current.vel *= 0.90;
    }
    if (sm.current.vel < 0.003) sm.current.vel = 0;

    uniforms.mouseX.value = sm.current.x;
    uniforms.mouseY.value = sm.current.y;
    uniforms.vel.value = sm.current.vel;
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTED COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export interface DitherCandlestickProps {
  enableMouseInteraction?: boolean;
}

export default function DitherCandlestick({
  enableMouseInteraction = true,
}: DitherCandlestickProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const mouseRef = useRef({ x: 0.5, y: 0.5, vel: 0 });
  const prevPos = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setIsVisible(e.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!enableMouseInteraction) return;
    const onMove = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;

      const dx = nx - prevPos.current.x;
      const dy = ny - prevPos.current.y;
      prevPos.current.x = nx;
      prevPos.current.y = ny;

      mouseRef.current.x = nx;
      mouseRef.current.y = ny;
      mouseRef.current.vel = Math.min(Math.sqrt(dx * dx + dy * dy) * 25, 1.0);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [enableMouseInteraction]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
      <Canvas
        className="dither-candle-canvas"
        camera={{ position: [0, 0, 6] }}
        dpr={[1, 2]}
        frameloop={isVisible ? 'always' : 'never'}
        gl={{ antialias: true }}
      >
        <CandleScene mouseRef={mouseRef} />
      </Canvas>
    </div>
  );
}
