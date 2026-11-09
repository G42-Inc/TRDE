import styles from './landing.module.css';

const features = [
  { number: '01', title: 'Every trade, in context.', body: 'Bring entries, exits, fees, screenshots and journal notes together. Capture the reasoning as well as the result.', label: 'Trade journaling', path: 'M4 5h16v14H4z M8 9h8 M8 13h5' },
  { number: '02', title: 'See what shapes your results.', body: 'Explore win rate, expectancy and performance by strategy or session. Turn a list of trades into a useful review.', label: 'Performance analytics', path: 'M4 19h16 M6 15v-4 M12 15V5 M18 15V8' },
  { number: '03', title: 'Keep your process visible.', body: 'Record planned risk, review rule violations, and reflect on discipline. Build a routine you can come back to.', label: 'Risk & discipline', path: 'M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6z M8 12l3 3 5-6' },
];

export function FeatureCards() {
  return (
    <section id="features" className={styles.features} aria-labelledby="features-title">
      <div className={styles.container}>
        <div className={styles.sectionIntro}><p className={styles.eyebrow}>Built for the review</p><h2 id="features-title">Less guesswork.<br />More perspective.</h2><p>Keep the details that matter close, so your next review starts with a clearer picture.</p></div>
        <div className={styles.featureGrid}>
          {features.map(feature => <article key={feature.number} className={styles.featureCard}>
            <div className={styles.featureTop}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={feature.path} /></svg><span>{feature.number}</span></div>
            <p className={styles.featureLabel}>{feature.label}</p><h3>{feature.title}</h3><p>{feature.body}</p>
            <a href="#platform" className={styles.textLink}>Explore the platform <span aria-hidden="true">↗</span><span className={styles.srOnly}>: {feature.label}</span></a>
          </article>)}
        </div>
      </div>
    </section>
  );
}
