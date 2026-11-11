import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeatureCards } from '@/components/landing/FeatureCards';
import { ProductPreview } from '@/components/landing/ProductPreview';
import { LandingAction } from '@/components/landing/LandingAction';
import styles from '@/components/landing/landing.module.css';

export const metadata: Metadata = {
  title: 'TRDE — Track your trades. Find your Edge.',
  description: 'A trading journal for futures and options. Record your trades, understand your performance, and build a more consistent review routine.',
};

export default function LandingPage() {
  return (
    <div className={styles.site}>
      <LandingHeader />
      <main id="main-content" tabIndex={-1}>
        <LandingHero />
        <FeatureCards />
        <section id="platform" className={styles.platform} aria-labelledby="platform-title">
          <div className={styles.container}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>A closer look</p>
              <h2 id="platform-title">Your process. In perspective.</h2>
              <p>From the details of a single trade to the patterns behind your performance. Explore a sample of what you can track.</p>
            </div>
            <ProductPreview />
          </div>
        </section>
        <section className={styles.workflow} aria-labelledby="workflow-title">
          <div className={styles.container}>
            <div className={styles.workflowHeading}>
              <p className={styles.eyebrow}>Build a better routine</p>
              <h2 id="workflow-title">A journal that goes beyond the entry.</h2>
              <p>Make your review as intentional as your trade.</p>
              <Link href="/support?tab=guide" className={styles.textLink}>Read the user guide <span aria-hidden="true">↗</span></Link>
            </div>
            <ol className={styles.steps}>
              <li><span aria-hidden="true">01</span><div><h3>Capture the context</h3><p>Log your entry, exit, fees and planned risk. Add the setup, a screenshot, and what you were thinking.</p></div></li>
              <li><span aria-hidden="true">02</span><div><h3>Review the patterns</h3><p>Compare outcomes across instruments, sessions and strategies. See the details behind your P&amp;L.</p></div></li>
              <li><span aria-hidden="true">03</span><div><h3>Refine your process</h3><p>Use journal notes and risk reviews to decide what to repeat and what to work on next.</p></div></li>
            </ol>
          </div>
        </section>
        <section className={styles.closing} aria-labelledby="closing-title">
          <div className={styles.container}>
            <div><p className={styles.eyebrow}>Start with your next trade</p><h2 id="closing-title">Find your Edge.</h2><p>Bring your trades, context and review into one place.</p></div>
            <div className={styles.closingActions}><LandingAction className={styles.primaryButton} /><Link href="/pricing" className={styles.secondaryButton}>Explore plans <span aria-hidden="true">↗</span></Link></div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Link href="/" aria-label="TRDE home"><img src="/logos/trde-wordmark-black-256.webp" alt="TRDE" width="128" height="25" loading="lazy" /></Link>
              <p>Track your trades.<br />Find your Edge.</p>
            </div>
            <div><h3>Product</h3><ul><li><a href="#features">Features</a></li><li><a href="#platform">Platform preview</a></li><li><Link href="/pricing">Pricing</Link></li></ul></div>
            <div><h3>Support</h3><ul><li><Link href="/support">Help center</Link></li><li><Link href="/support?tab=faq">FAQ</Link></li><li><Link href="/support?tab=guide">User guide</Link></li></ul></div>
            <div><h3>Legal</h3><ul><li><Link href="/support?tab=terms">Terms of service</Link></li><li><Link href="/support?tab=privacy">Privacy policy</Link></li></ul></div>
          </div>
          <div className={styles.footerBottom}><p>TRDE is an educational tool. Past performance does not guarantee future results. Trading involves risk of loss.</p><p>© {new Date().getFullYear()} TRDE</p></div>
        </div>
      </footer>
    </div>
  );
}
