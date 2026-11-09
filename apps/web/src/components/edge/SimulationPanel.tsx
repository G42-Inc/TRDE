'use client';

import { useState } from 'react';
import { ChevronDownIcon, Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { SimSessionState, SimSettings } from '@/lib/edge/chart/sim/types';
import { calculateTotalPnL, calculateStats } from '@/lib/edge/chart/sim/pnl';
import { format } from 'date-fns';

type PanelPosition = 'right' | 'bottom';

interface SimulationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  session: SimSessionState | null;
  currentPrice: number | null;
  currentReplayIndex: number;
  contractMetadata: { tickSize: number; tickValue: number } | null;
  contractName?: string;
  onPlaceOrder: (side: 'BUY' | 'SELL', qty: number, immediate?: boolean) => void;
  onClosePosition: () => void;
  onReset: () => void;
  onUpdateSettings: (settings: Partial<SimSettings>) => void;
  onSaveToJournal: () => void;
  journalSaving?: boolean;
  position: PanelPosition;
  onPositionChange: (position: PanelPosition) => void;
}

export function SimulationPanel({
  isOpen,
  onClose,
  session,
  currentPrice,
  currentReplayIndex,
  contractMetadata,
  contractName,
  onPlaceOrder,
  onClosePosition,
  onReset,
  onUpdateSettings,
  onSaveToJournal,
  journalSaving = false,
  position,
  onPositionChange,
}: SimulationPanelProps) {
  const [qty, setQty] = useState(3);
  const [showSettings, setShowSettings] = useState(false);

  if (!isOpen) return null;

  // Show loading state if session/contract not ready
  if (!session || !contractMetadata) {
    return (
      <div className="bg-white dark:bg-black h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-black/10 dark:border-white/10">
          <span className="text-sm font-semibold text-black dark:text-white">Order</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
          >
            <XMarkIcon className="h-4 w-4 text-black/60 dark:text-white/60" />
          </button>
        </div>
        <div className="p-6 flex-1 flex items-center justify-center">
          <p className="text-sm text-black/60 dark:text-white/60 text-center">
            Waiting for contract selection...
          </p>
        </div>
      </div>
    );
  }

  const pnl = currentPrice
    ? calculateTotalPnL(session.position, currentPrice, session.closedTrades, contractMetadata)
    : null;
  const stats = calculateStats(session.closedTrades);

  const positionSide = session.position.qty > 0 ? 'LONG' : session.position.qty < 0 ? 'SHORT' : 'FLAT';
  const positionQty = Math.abs(session.position.qty);

  // Calculate bid/ask from current price (simplified - in real trading this comes from market data)
  const bid = currentPrice ? currentPrice - (contractMetadata.tickSize * 2) : 0;
  const ask = currentPrice ? currentPrice + (contractMetadata.tickSize * 2) : 0;
  const spread = ask - bid;

  const quickQtys = [1, 3, 5, 10, 15];

  return (
    <div className="bg-white dark:bg-black h-full w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-black dark:text-white">Order</span>
          <button
            onClick={() => onPositionChange(position === 'right' ? 'bottom' : 'right')}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
            title={`Move to ${position === 'right' ? 'bottom' : 'right'}`}
          >
            <ChevronDownIcon className={`h-4 w-4 text-black/60 dark:text-white/60 ${position === 'bottom' ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
        >
          <XMarkIcon className="h-4 w-4 text-black/60 dark:text-white/60" />
        </button>
      </div>

      <div className={position === 'right' ? 'p-4 space-y-4 overflow-y-auto h-[calc(100%-3rem)]' : 'p-4 grid grid-cols-2 gap-4 overflow-y-auto h-[calc(100%-3rem)]'}>
        {/* Contract */}
        <div>
          <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Contract</label>
          <div className="relative">
            <div className="w-2 h-2 bg-danger rounded-full absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={contractName || session.contractId}
              readOnly
              className="w-full pl-6 pr-8 py-2 border border-black/10 dark:border-white/10 rounded bg-white dark:bg-black text-sm"
            />
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
            <Cog6ToothIcon className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Order Type</label>
          <div className="relative">
            <input
              type="text"
              value="Market"
              readOnly
              className="w-full pr-8 py-2 border border-black/10 dark:border-white/10 rounded bg-white dark:bg-black text-sm"
            />
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
          </div>
        </div>

        {/* # of Contracts */}
        <div>
          <label className="block text-xs text-black/60 dark:text-white/60 mb-1"># of Contracts</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full py-2 border border-black/10 dark:border-white/10 rounded bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        {/* Bid/Ask/Spread */}
        <div className={position === 'right' ? '' : 'col-span-2'}>
          <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Bid/Ask</label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPlaceOrder('BUY', qty, true)}
              className="flex-1 border-2 border-positive/50 hover:border-positive hover:bg-success/10 rounded p-2 text-center transition-colors cursor-pointer"
            >
              <div className="text-xs text-black/60 dark:text-white/60">Bid:</div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">{bid.toFixed(2)}</div>
            </button>
            <div className="flex-1 border-2 border-black/10 dark:border-white/10 rounded p-2 text-center">
              <div className="text-sm font-semibold text-black dark:text-white">{currentPrice?.toFixed(2) || '—'}</div>
              <div className="text-xs text-black/60 dark:text-white/60">{spread.toFixed(2)}</div>
            </div>
            <button
              onClick={() => onPlaceOrder('SELL', qty, true)}
              className="flex-1 border-2 border-negative/50 hover:border-negative hover:bg-danger/10 rounded p-2 text-center transition-colors cursor-pointer"
            >
              <div className="text-xs text-black/60 dark:text-white/60">Ask:</div>
              <div className="text-sm font-semibold text-red-600 dark:text-red-400">{ask.toFixed(2)}</div>
            </button>
          </div>
        </div>

        {/* Active Position */}
        <div className={position === 'right' ? '' : 'col-span-2'}>
          <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Active Position</label>
          {session.position.qty === 0 ? (
            <div className="py-2 text-sm text-black/60 dark:text-white/60">No Active Position</div>
          ) : (
            <div className="py-2">
              <div className="text-sm font-semibold text-black dark:text-white">
                {positionSide} {positionQty}
              </div>
              {session.position.avgPrice !== null && (
                <div className="text-xs text-black/60 dark:text-white/60">
                  Avg: ${session.position.avgPrice.toFixed(2)}
                </div>
              )}
            </div>
          )}
          {/* Quick Quantity Buttons */}
          <div className="flex items-center space-x-1 mt-2">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-sm"
            >
              −
            </button>
            {quickQtys.map((quickQty) => (
              <button
                key={quickQty}
                onClick={() => setQty(quickQty)}
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-medium transition-colors ${
                  qty === quickQty
                    ? 'bg-accent text-white border-accent'
                    : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {quickQty}
              </button>
            ))}
            <button
              onClick={() => setQty(qty + 1)}
              className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Position Bracket */}
        <div>
          <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Position Bracket</label>
          <div className="relative">
            <input
              type="text"
              value="Disabled"
              readOnly
              className="w-full pr-8 py-2 border border-black/10 dark:border-white/10 rounded bg-white dark:bg-black text-sm"
            />
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
            <Cog6ToothIcon className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
          </div>
        </div>


        {/* Action Buttons */}
        <div className={position === 'right' ? 'space-y-2' : 'col-span-2 space-y-2'}>
          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onPlaceOrder('BUY', qty)}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm transition-colors"
            >
              BUY +{qty} @ MARKET
            </button>
            <button
              onClick={() => onPlaceOrder('SELL', qty)}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm transition-colors"
            >
              SELL -{qty} @ MARKET
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="px-3 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white rounded text-xs font-medium transition-colors"
            >
              JOIN BID
            </button>
            <button
              className="px-3 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white rounded text-xs font-medium transition-colors"
            >
              JOIN ASK
            </button>
          </div>

          {session.position.qty !== 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClosePosition}
                className="px-3 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white rounded text-xs font-medium transition-colors"
              >
                CLOSE POSITION
              </button>
              <button
                onClick={() => {
                  const reverseQty = Math.abs(session.position.qty);
                  onPlaceOrder(session.position.qty > 0 ? 'SELL' : 'BUY', reverseQty * 2);
                }}
                className="px-3 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white rounded text-xs font-medium transition-colors"
              >
                REVERSE POSITION
              </button>
            </div>
          )}

          <button
            className="w-full px-3 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white rounded text-xs font-medium transition-colors"
          >
            CANCEL ORDERS
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReset}
              className="px-3 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white rounded text-xs font-medium transition-colors"
            >
              FLATTEN ALL
            </button>
            <button
              className="px-3 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white rounded text-xs font-medium transition-colors"
            >
              CANCEL ALL
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <div className="border-t border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                Slippage (ticks)
              </label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={session.settings.slippageTicks}
                onChange={(e) => onUpdateSettings({ slippageTicks: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border border-black/10 dark:border-white/10 rounded bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                Commission per contract per side ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={session.settings.commissionPerContractPerSide}
                onChange={(e) => onUpdateSettings({ commissionPerContractPerSide: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border border-black/10 dark:border-white/10 rounded bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-3 py-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white rounded text-xs font-medium transition-colors"
            >
              Hide Settings
            </button>
          </div>
        </div>
      )}

      {/* Footer with stats and actions */}
      <div className="border-t border-black/10 dark:border-white/10 p-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4 text-black/60 dark:text-white/60">
          {stats.tradesClosed > 0 && (
            <>
              <span>Trades: {stats.tradesClosed}</span>
              <span>WR: {stats.winRate.toFixed(0)}%</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-2 py-1 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded text-xs transition-colors"
          >
            Settings
          </button>
          {session.closedTrades.length > 0 && (
            <button
              onClick={onSaveToJournal}
              disabled={journalSaving}
              className="px-2 py-1 bg-accent hover:bg-accent-dark text-white rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {journalSaving ? 'Saving…' : 'Save to Journal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
