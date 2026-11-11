'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LandingAction } from './LandingAction';
import styles from './landing.module.css';

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return (
    <header ref={header} className={styles.header} onKeyDown={event => {
      if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); }
    }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <div className={styles.headerInner}>
        <Link href="/" aria-label="TRDE home" className={styles.brand}><img src="/logos/trde-wordmark-white-256.webp" alt="TRDE" width="128" height="25" /></Link>
        <nav aria-label="Main navigation" className={styles.desktopNav}><a href="#features">Features</a><a href="#platform">Platform</a><Link href="/pricing">Pricing</Link><Link href="/support">Support</Link></nav>
        <div className={styles.headerActions}><Link href="/sign-in" className={styles.signIn}>Sign in</Link><LandingAction className={styles.headerCta} /><button ref={toggle} type="button" className={styles.menuToggle} aria-expanded={open} aria-controls="landing-mobile-nav" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(value => !value)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d={open ? 'M6 6l12 12M6 18 18 6' : 'M4 7h16M4 12h16M4 17h16'} /></svg></button></div>
      </div>
      <nav id="landing-mobile-nav" aria-label="Mobile navigation" hidden={!open} className={styles.mobileNav} onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false); }}>
        <a href="#features">Features <span aria-hidden="true">↗</span></a><a href="#platform">Platform preview <span aria-hidden="true">↗</span></a><Link href="/pricing">Pricing <span aria-hidden="true">↗</span></Link><Link href="/support">Help &amp; support <span aria-hidden="true">↗</span></Link><Link href="/sign-in">Sign in <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
  );
}
