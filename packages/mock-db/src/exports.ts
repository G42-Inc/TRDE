import type { Trade, WeeklyReview } from '@trde/core';
import { AssetClass } from '@trde/core';

function csvCell(value: string | number): string {
  // Spreadsheet programs treat leading formula characters as executable cells.
  // Numeric results remain numbers; user-entered text is always literal text.
  let text = String(value);
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function timestamp(value: number): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function exportTradesToCsv(trades: Trade[]): string {
  const headers = [
    'ID',
    'Asset Class',
    'Instrument',
    'Date',
    'Entry Time',
    'Exit Time',
    'Direction',
    'Quantity',
    'Result (USD)',
    'Result (R)',
    'Outcome',
    'Grade',
    'Strategy',
    'Setups',
    'Mistakes',
    'Session',
    'Regime',
    'Notes',
  ];

  const rows = trades.map((trade) => {
    const entryTime = timestamp(trade.entryTime);
    const exitTime = timestamp(trade.exitTime);

    let instrument = '';
    if (trade.assetClass === AssetClass.FUTURES) {
      instrument = trade.instrumentRoot;
    } else {
      instrument = `${trade.underlying} ${trade.strike}${trade.optionType}`;
    }

    return [
      trade.id,
      trade.assetClass,
      instrument,
      trade.tradeDate,
      entryTime,
      exitTime,
      trade.direction,
      trade.quantity,
      trade.resultUsd,
      trade.resultR,
      trade.outcome,
      trade.grade,
      trade.strategyId,
      trade.setupTags.join('; '),
      trade.mistakes.join('; '),
      trade.session,
      trade.marketRegime,
      trade.notes,
    ];
  });

  const csvContent = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n');
  return csvContent;
}

export function exportWeeklyReportText(
  weekStart: string,
  weekEnd: string,
  trades: Trade[],
  review?: WeeklyReview
): string {
  const weekTrades = trades.filter(
    (t) => t.tradeDate >= weekStart && t.tradeDate <= weekEnd
  );

  const wins = weekTrades.filter((t) => t.outcome === 'WIN');
  const losses = weekTrades.filter((t) => t.outcome === 'LOSS');
  const totalPnL = weekTrades.reduce((sum, t) => sum + t.resultUsd, 0);
  const totalR = weekTrades.reduce((sum, t) => sum + t.resultR, 0);
  const winRate = weekTrades.length > 0 ? (wins.length / weekTrades.length) * 100 : 0;
  const avgR = weekTrades.length > 0 ? totalR / weekTrades.length : 0;

  let report = `WEEKLY TRADING REPORT\n`;
  report += `========================\n\n`;
  report += `Week: ${weekStart} to ${weekEnd}\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += `SUMMARY\n`;
  report += `-------\n`;
  report += `Total Trades: ${weekTrades.length}\n`;
  report += `Wins: ${wins.length}\n`;
  report += `Losses: ${losses.length}\n`;
  report += `Win Rate: ${winRate.toFixed(1)}%\n`;
  report += `Total P&L: $${totalPnL.toFixed(2)}\n`;
  report += `Total R: ${totalR.toFixed(2)}R\n`;
  report += `Avg R: ${avgR.toFixed(2)}R\n\n`;

  if (review) {
    report += `REVIEW NOTES\n`;
    report += `------------\n`;
    report += `${review.summary}\n\n`;

    if (review.wins.length > 0) {
      report += `Wins:\n`;
      review.wins.forEach((win, i) => {
        report += `  ${i + 1}. ${win}\n`;
      });
      report += `\n`;
    }

    if (review.losses.length > 0) {
      report += `Losses:\n`;
      review.losses.forEach((loss, i) => {
        report += `  ${i + 1}. ${loss}\n`;
      });
      report += `\n`;
    }

    if (review.improvements.length > 0) {
      report += `Improvements:\n`;
      review.improvements.forEach((imp, i) => {
        report += `  ${i + 1}. ${imp}\n`;
      });
      report += `\n`;
    }

    if (review.nextWeekPlan) {
      report += `Next Week Plan:\n`;
      report += `${review.nextWeekPlan}\n\n`;
    }
  }

  report += `TRADE LIST\n`;
  report += `----------\n`;
  weekTrades.forEach((trade, i) => {
    report += `${i + 1}. ${trade.tradeDate} - ${trade.direction} - $${trade.resultUsd.toFixed(2)} (${trade.resultR.toFixed(2)}R) - ${trade.outcome} - ${trade.grade}\n`;
    if (trade.notes) {
      report += `   Notes: ${trade.notes}\n`;
    }
  });

  report += `\n`;
  report += `END OF REPORT\n`;

  return report;
}
