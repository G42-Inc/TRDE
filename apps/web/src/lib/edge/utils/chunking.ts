// Chunking utilities for handling 20k bar limit

import { MAX_BARS_PER_REQUEST } from '../constants';
import { timeframeToMs } from './timeframe';
import type { ChartTimeframe } from '../types';

export interface ChunkRequest {
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  limit: number;
}

/**
 * Calculate number of chunks needed for a date range
 */
export function calculateChunks(
  startTime: string,
  endTime: string,
  timeframe: ChartTimeframe
): ChunkRequest[] {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const msPerBar = timeframeToMs(timeframe);
  const totalBars = Math.ceil((end - start) / msPerBar);
  
  if (totalBars <= MAX_BARS_PER_REQUEST) {
    return [{ startTime, endTime, limit: totalBars }];
  }
  
  const chunks: ChunkRequest[] = [];
  const msPerChunk = MAX_BARS_PER_REQUEST * msPerBar;
  let currentStart = start;
  
  while (currentStart < end) {
    const chunkEnd = Math.min(currentStart + msPerChunk, end);
    chunks.push({
      startTime: new Date(currentStart).toISOString(),
      endTime: new Date(chunkEnd).toISOString(),
      limit: MAX_BARS_PER_REQUEST,
    });
    currentStart = chunkEnd;
  }
  
  return chunks;
}
