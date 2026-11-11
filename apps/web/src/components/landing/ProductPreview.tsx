'use client';

import { useRef, useState } from 'react';
import styles from './landing.module.css';

const tabs = ['Trade journal', 'Performance', 'Risk review'];
const trades = [
  { symbol: 'ES', setup: 'Opening range', session: 'New York', result: '+$490', r: '+4.90R', win: true },
  { symbol: 'NQ', setup: 'Pullback', session: 'New York', result: '−$150', r: '−1.50R', win: false },
  { symbol: 'MES', setup: 'Breakout', session: 'London', result: '+$225', r: '+2.25R', win: true },
  { symbol: 'SPY', setup: 'Support bounce', session: 'New York', result: '+$85', r: '+0.85R', win: true },
];

export function ProductPreview() {
  const [active, setActive] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div className={styles.preview}>
      <div className={styles.previewToolbar}>
        <span className={styles.previewBrand}>TRDE <span>/ workspace</span></span>
        <span className={styles.sampleLabel}>Illustrative preview · sample data</span>
      </div>
      <div role="tablist" aria-label="Explore the workspace" className={styles.previewTabs}>
        {tabs.map((tab, index) => <button key={tab} ref={element => { buttons.current[index] = element; }} type="button" role="tab" id={`preview-tab-${index}`} aria-controls="preview-panel" aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => {
          let next: number;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault(); setActive(next); buttons.current[next]?.focus();
        }}>{tab}</button>)}
      </div>
      <div className={styles.previewPanel} role="tabpanel" id="preview-panel" aria-labelledby={`preview-tab-${active}`} tabIndex={0}>
        {active === 0 && <>
          <div className={styles.previewHeading}><div><p>Your trading, at a glance</p><h3>Trade journal</h3></div><span className={styles.previewBadge}>4 example trades</span></div>
          <div className={styles.journalPreview}>
            <div className={styles.tableScroll} role="region" aria-label="Sample trades" tabIndex={0}><table><thead><tr><th>Instrument</th><th>Setup</th><th>Net P&amp;L</th><th>Result in R</th></tr></thead><tbody>{trades.map(trade => <tr key={trade.symbol}><td><strong>{trade.symbol}</strong><small>{trade.session}</small></td><td>{trade.setup}</td><td className={trade.win ? styles.positive : styles.negative}>{trade.result}</td><td className={trade.win ? styles.positive : styles.negative}>{trade.r}</td></tr>)}</tbody></table></div>
            <aside className={styles.previewNote}><span className={styles.noteIcon} aria-hidden="true">↗</span><p className={styles.previewKicker}>Behind the trade</p><h4>More than the outcome.</h4><p>“Waited for my setup. Followed the planned risk. Review the exit at the end of the week.”</p><span className={styles.previewTag}>Example journal note</span></aside>
          </div>
        </>}
        {active === 1 && <>
          <div className={styles.previewHeading}><div><p>Look beyond the individual trade</p><h3>Performance overview</h3></div><span className={styles.previewBadge}>Sample results</span></div>
          <div className={styles.previewMetrics}><div><span>Net P&amp;L</span><strong>+$650</strong></div><div><span>Win rate</span><strong>75<span>%</span></strong></div><div><span>Average result</span><strong>+1.63<span>R</span></strong></div></div>
          <figure className={styles.previewChart}><figcaption>Equity curve <span>4 example trades · USD</span></figcaption><svg viewBox="0 0 800 180" role="img" aria-label="Sample cumulative results: zero, 490, 340, 565, then 650 dollars."><defs><linearGradient id="preview-equity-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c8a24a" stopOpacity=".25" /><stop offset="1" stopColor="#c8a24a" stopOpacity="0" /></linearGradient></defs><path d="M0 40H800M0 90H800M0 140H800" stroke="#303332" strokeDasharray="4 6" /><path d="M0 170 200 55 400 90 600 37 800 17V180H0Z" fill="url(#preview-equity-fill)" /><path d="M0 170 200 55 400 90 600 37 800 17" stroke="#d2b471" strokeWidth="3" fill="none" strokeLinejoin="round" /></svg></figure>
        </>}
        {active === 2 && <>
          <div className={styles.previewHeading}><div><p>Keep the process in view</p><h3>Risk &amp; discipline review</h3></div><span className={styles.previewBadge}>Example review</span></div>
          <div className={styles.riskPreview}><div><p className={styles.previewKicker}>Review checklist</p><ul><li><span aria-hidden="true">✓</span><div><strong>Planned risk recorded</strong><p>Compare the plan with the final result.</p></div></li><li><span aria-hidden="true">✓</span><div><strong>Setup and session captured</strong><p>Keep useful context alongside the numbers.</p></div></li><li><span aria-hidden="true">○</span><div><strong>Weekly reflection</strong><p>Note what to repeat and what to adjust.</p></div></li></ul></div><aside className={styles.previewNote}><p className={styles.previewKicker}>A repeatable routine</p><h4>Review your decisions.</h4><p>Track risk and discipline in your journal. Use your own rules and notes to guide the next review.</p><span className={styles.previewTag}>Plan → trade → reflect</span></aside></div>
        </>}
      </div>
      <div className={styles.previewCaption}><span aria-hidden="true">↳</span> A simplified preview of TRDE. These examples are illustrative, not live results.</div>
    </div>
  );
}
