import { LandingAction } from './LandingAction';
import styles from './landing.module.css';

// Retain the gold candlestick identity without an always-running WebGL scene.
const candles = [[330,390],[385,358],[360,418],[416,449],[447,415],[412,370],[372,394],[390,335],[332,270],[272,306],[308,260],[260,198],[195,238],[240,295],[292,264],[265,228],[226,184],[185,150],[148,180],[180,218],[220,198],[196,158],[160,115],[116,142]];

export function LandingHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroArt} aria-hidden="true">
        <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" focusable="false">
          <defs>
            <linearGradient id="landing-candle" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e3c57e" /><stop offset="1" stopColor="#9d7938" /></linearGradient>
            <linearGradient id="landing-chart-fade"><stop stopColor="#0d0f10" stopOpacity=".95" /><stop offset="1" stopColor="#0d0f10" stopOpacity="0" /></linearGradient>
            <pattern id="landing-chart-grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="#fff" strokeOpacity=".045" /></pattern>
          </defs>
          <rect width="1000" height="600" fill="url(#landing-chart-grid)" />
          {candles.map(([open, close], index) => {
            const x = 40 + index * 40;
            return <g key={index} opacity={close < open ? .9 : .35}><path d={`M${x} ${Math.min(open, close) - 15} V${Math.max(open, close) + 20}`} stroke="#c8a24a" strokeWidth="2" /><rect x={x - 10} y={Math.min(open, close)} width="20" height={Math.max(8, Math.abs(open - close))} rx="1" fill={close < open ? 'url(#landing-candle)' : '#9d824c'} /></g>;
          })}
          <rect width="1000" height="600" fill="url(#landing-chart-fade)" />
        </svg>
      </div>
      <div className={styles.container}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}><span aria-hidden="true" /> Your trading process, in focus</p>
          <h1 id="hero-title">Precision tools for<br /><span>serious traders.</span></h1>
          <p className={styles.heroDescription}>Record the trade. Understand the outcome. Build a clearer picture of your performance with a journal for futures and options.</p>
          <div className={styles.heroActions}><LandingAction className={styles.primaryButton} /><a href="#platform" className={styles.secondaryButton}>Explore the platform <span aria-hidden="true">↓</span></a></div>
          <p className={styles.heroNote}>Your trades. Your context. Your Edge.</p>
        </div>
        <div className={styles.heroTopics} aria-label="Platform tools"><span>Trade journal</span><span>Performance analytics</span><span>Risk review</span><span>EDGE backtesting</span></div>
      </div>
    </section>
  );
}
