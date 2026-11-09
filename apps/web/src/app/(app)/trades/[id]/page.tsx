'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppData } from '@/hooks/useAppData';
import { useUser } from '@clerk/nextjs';
import type { Trade, Collection } from '@trde/core';
import { AssetClass } from '@trde/core';
import Link from 'next/link';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { ImageUpload, type ImageAttachment } from '@/components/ImageUpload';
import { format } from 'date-fns';
import { sanitizeText } from '@/lib/security/sanitize';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import Image from 'next/image';
import { ModalDialog } from '@/components/ModalDialog';
import { formatEnum, formatSetupTag } from '@/lib/utils/formatEnum';

export default function TradeDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const router = useRouter();
  const { trades, strategies, collections, saveTrades, isLoading, isDemo } = useAppData();
  const trade = useMemo(() => trades.find((t) => t.id === params.id) || null, [trades, params.id]);
  const [mounted, setMounted] = useState(false);
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [attachmentDraft, setAttachmentDraft] = useState<ImageAttachment[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [readingImages, setReadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageAttachment | null>(null);
  useEffect(() => {
    setIsEditingAttachments(false);
    setAttachmentDraft([]);
    setSaveError(null);
    setPreviewImage(null);
  }, [params.id, user?.id]);

  // Mark EDGE trade as viewed when detail page loads
  useEffect(() => {
    if (trade) {
      const edgeCollection = collections.find((c: any) => c.name === 'EDGE');
      const isEdgeTrade = (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
        trade.notes?.startsWith('[EDGE');
      
      if (isEdgeTrade) {
        // Mark as viewed
        try {
          const viewedData = localStorage.getItem('trde:viewedEdgeTrades');
          const viewed = viewedData ? new Set(JSON.parse(viewedData)) : new Set<string>();
          viewed.add(trade.id);
          localStorage.setItem('trde:viewedEdgeTrades', JSON.stringify(Array.from(viewed)));
        } catch {
          // Ignore errors
        }
      }
    }
  }, [trade, collections]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader width="200px" height="2rem" />
        <div className="theme-bg-secondary p-6 rounded-xl border theme-border space-y-6">
          <SkeletonLoader width="150px" height="1.5rem" />
          <SkeletonLoader width="100%" height="1rem" lines={8} />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonLoader width="100%" height="100px" />
            <SkeletonLoader width="100%" height="100px" />
          </div>
        </div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="text-center py-12">
        <p className="theme-text-secondary">Trade not found</p>
        <Link href="/trades" className="text-accent hover:text-accent dark:hover:text-accent-light mt-2 inline-flex items-center gap-1">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Trades
        </Link>
      </div>
    );
  }

  const toggleCollection = async (collectionId: string) => {
    if (!trade) return;
    const updated = trade.collections.includes(collectionId)
      ? trade.collections.filter((id) => id !== collectionId)
      : [...trade.collections, collectionId];

    const updatedTrades = trades.map((t) =>
      t.id === trade.id ? { ...t, collections: updated } : t
    );
    setSaving(true);
    setSaveError(null);
    try { await saveTrades(updatedTrades); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save collection. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {saveError && <p role="alert" className="text-red-500">{saveError}</p>}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/trades" className="text-accent hover:text-accent dark:hover:text-accent-light mb-2 inline-flex items-center gap-1 text-sm">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Trades
          </Link>
          <h1 className="text-3xl font-bold theme-text">
            {trade.assetClass === AssetClass.FUTURES ? trade.instrumentRoot : trade.underlying}
          </h1>
        </div>
        <Link
          href={`/trades/${trade.id}/edit`}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="theme-bg-secondary p-6 rounded-lg border theme-border">
          <h2 className="text-xl font-semibold mb-4 theme-text">Trade Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Date</dt>
              <dd className="text-sm font-medium theme-text">{trade.tradeDate}</dd>
            </div>
            {/* Show actual trade execution times for EDGE trades */}
            {(() => {
              const edgeCollection = collections.find((c: any) => c.name === 'EDGE');
              const isEdgeTrade = (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
                trade.notes?.startsWith('[EDGE');
              
              if (isEdgeTrade) {
                const entryDateTime = new Date(trade.entryTime);
                const exitDateTime = new Date(trade.exitTime);
                return (
                  <>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <dt className="text-sm theme-text-secondary">Trade Entry Time</dt>
                      <dd className="text-sm font-medium theme-text">
                        {format(entryDateTime, 'MM/dd HH:mm:ss')}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <dt className="text-sm theme-text-secondary">Trade Exit Time</dt>
                      <dd className="text-sm font-medium theme-text">
                        {format(exitDateTime, 'MM/dd HH:mm:ss')}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <dt className="text-sm theme-text-secondary">Journal Submitted</dt>
                      <dd className="text-sm font-medium theme-text">
                        {format(new Date(trade.createdAt), 'MM/dd HH:mm:ss')}
                      </dd>
                    </div>
                  </>
                );
              }
              return null;
            })()}
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Asset Class</dt>
              <dd className="text-sm font-medium theme-text">{formatEnum(trade.assetClass)}</dd>
            </div>
            {trade.assetClass === AssetClass.FUTURES && (
              <>
                <div className="flex justify-between items-center py-2 border-b theme-border">
                  <dt className="text-sm theme-text-secondary">Instrument</dt>
                  <dd className="text-sm font-medium theme-text">{trade.instrumentRoot}</dd>
                </div>
                <div className="flex justify-between items-center py-2 border-b theme-border">
                  <dt className="text-sm theme-text-secondary">Entry Price</dt>
                  <dd className="text-sm font-medium theme-text">{trade.entryPrice}</dd>
                </div>
                <div className="flex justify-between items-center py-2 border-b theme-border">
                  <dt className="text-sm theme-text-secondary">Exit Price</dt>
                  <dd className="text-sm font-medium theme-text">{trade.exitPrice}</dd>
                </div>
              </>
            )}
            {trade.assetClass === AssetClass.OPTIONS && (
              <>
                <div className="flex justify-between items-center py-2 border-b theme-border">
                  <dt className="text-sm theme-text-secondary">Underlying</dt>
                  <dd className="text-sm font-medium theme-text">{trade.underlying}</dd>
                </div>
                <div className="flex justify-between items-center py-2 border-b theme-border">
                  <dt className="text-sm theme-text-secondary">Strike</dt>
                  <dd className="text-sm font-medium theme-text">{trade.strike}</dd>
                </div>
                <div className="flex justify-between items-center py-2 border-b theme-border">
                  <dt className="text-sm theme-text-secondary">Type</dt>
                  <dd className="text-sm font-medium theme-text">{trade.optionType}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Direction</dt>
              <dd className={`text-sm font-medium ${
                trade.direction === 'LONG' ? 'text-accent' : 'text-orange-500'
              }`}>
                {formatEnum(trade.direction)}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Quantity</dt>
              <dd className="text-sm font-medium theme-text">{trade.quantity}</dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Result</dt>
              <dd
                className={`text-sm font-semibold ${
                  trade.resultUsd >= 0 ? 'text-positive' : 'text-negative'
                }`}
              >
                ${trade.resultUsd.toFixed(2)} ({trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R)
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Outcome</dt>
              <dd className={`text-sm font-medium ${
                trade.outcome === 'WIN' ? 'text-positive' :
                trade.outcome === 'LOSS' ? 'text-negative' :
                'theme-text-secondary'
              }`}>
                {formatEnum(trade.outcome)}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2">
              <dt className="text-sm theme-text-secondary">Grade</dt>
              <dd className="text-sm font-medium theme-text">{trade.grade}</dd>
            </div>
          </dl>
        </div>

        <div className="theme-bg-secondary p-6 rounded-lg border theme-border">
          <h2 className="text-xl font-semibold mb-4 theme-text">Context</h2>
          <dl className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Strategy</dt>
              <dd className="text-sm font-medium theme-text">
                {strategies.find(s => s.id === trade.strategyId)?.name || trade.strategyId}
              </dd>
            </div>
            <div className="py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary mb-1">Setups</dt>
              <dd className="flex flex-wrap gap-1.5">
                {trade.setupTags.length > 0 ? (
                  trade.setupTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 theme-bg-tertiary theme-text rounded text-xs border theme-border">
                      {formatSetupTag(tag)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm theme-text-tertiary">None</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Session</dt>
              <dd className="text-sm font-medium theme-text">{formatEnum(trade.session)}</dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary">Market Regime</dt>
              <dd className="text-sm font-medium theme-text">{formatEnum(trade.marketRegime)}</dd>
            </div>
            <div className="py-2 border-b theme-border">
              <dt className="text-sm theme-text-secondary mb-1">Mistakes</dt>
              <dd className="flex flex-wrap gap-1.5">
                {trade.mistakes.length > 0 ? (
                  trade.mistakes.map((mistake) => (
                    <span key={mistake} className="px-2 py-1 bg-negative/20 text-negative rounded text-xs border border-negative/30">
                      {mistake.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  ))
                ) : (
                  <span className="text-sm theme-text-tertiary">None</span>
                )}
              </dd>
            </div>
            <div className="py-2">
              <dt className="text-sm theme-text-secondary mb-1">Notes</dt>
              <dd className="text-sm theme-text whitespace-pre-wrap">{sanitizeText(trade.notes) || 'No notes'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Screenshots */}
      <div className="theme-bg-secondary p-6 rounded-lg border theme-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold theme-text">Screenshots</h2>
          <button
            disabled={saving || readingImages || isDemo}
            onClick={async () => {
              if (!isEditingAttachments) {
                setAttachmentDraft(trade.attachments || []);
                setIsEditingAttachments(true);
                return;
              }
              setSaving(true);
              setSaveError(null);
              try {
                await saveTrades(trades.map(t => t.id === trade.id ? { ...t, attachments: attachmentDraft, updatedAt: Date.now() } : t));
                setIsEditingAttachments(false);
              } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save screenshots. Try again.'); }
              finally { setSaving(false); }
            }}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm theme-bg-tertiary hover:theme-bg-tertiary rounded-lg border theme-border theme-text transition-colors"
          >
            <PencilIcon className="h-4 w-4" />
            <span>{saving ? 'Saving…' : isEditingAttachments ? 'Save screenshots' : 'Edit'}</span>
          </button>
        </div>
        {isEditingAttachments && <button disabled={saving || readingImages} onClick={() => setIsEditingAttachments(false)} className="mb-4 theme-text underline">Cancel screenshot changes</button>}
        {isEditingAttachments ? (
          <ImageUpload
            disabled={saving}
            onBusyChange={setReadingImages}
            attachments={attachmentDraft}
            onAttachmentsChange={setAttachmentDraft}
            maxImages={10}
          />
        ) : trade.attachments && trade.attachments.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {trade.attachments.map((attachment) => (
              <div key={attachment.id} className="relative group theme-bg-tertiary rounded-lg border theme-border overflow-hidden">
                <button type="button" className="block w-full" aria-label={`View ${attachment.caption || 'screenshot'}`} onClick={() => setPreviewImage(attachment)}>
                <Image
                  src={attachment.uri}
                  alt={sanitizeText(attachment.caption) || 'Screenshot'}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover cursor-pointer"
                  unoptimized
                />
                </button>
                {attachment.caption && (
                  <div className="p-2 bg-black/80 dark:bg-white/80 text-white dark:text-black text-xs">
                    {sanitizeText(attachment.caption)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm theme-text-secondary">No screenshots attached. Click Edit to add some.</p>
        )}
      </div>

      <div className="theme-bg-secondary p-6 rounded-lg border theme-border">
        <h2 className="text-xl font-semibold mb-4 theme-text">Collections</h2>
        <div className="space-y-2">
          {collections.length === 0 && <p className="theme-text-secondary text-sm">Create a collection in <Link href="/review" className="underline">Review</Link> to organize your trades.</p>}
          {collections.map((collection) => (
            <label key={collection.id} className="flex items-center space-x-3 p-3 theme-bg-tertiary rounded-lg hover:theme-bg-tertiary transition-colors cursor-pointer border theme-border">
              <input
                type="checkbox"
                disabled={saving || readingImages || isDemo}
                checked={trade.collections.includes(collection.id)}
                onChange={() => toggleCollection(collection.id)}
                className="w-4 h-4 rounded theme-bg-secondary border-black/20 dark:border-white/20 text-accent focus:ring-accent"
              />
              <span className="text-sm theme-text">{sanitizeText(collection.name)}</span>
            </label>
          ))}
        </div>
      </div>
      {previewImage && <ModalDialog isOpen onClose={() => setPreviewImage(null)} labelledBy="screenshot-preview-title" className="items-center justify-center">
        <div className="theme-bg-secondary rounded-xl p-4 max-w-5xl w-full max-h-[90dvh] overflow-auto">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 id="screenshot-preview-title" className="theme-text font-semibold">{previewImage.caption || 'Trade screenshot'}</h2>
            <button onClick={() => setPreviewImage(null)} className="theme-text underline">Close screenshot</button>
          </div>
          <Image src={previewImage.uri} alt={previewImage.caption || 'Trade screenshot'} width={1200} height={800} unoptimized className="w-full h-auto object-contain" />
        </div>
      </ModalDialog>}
    </div>
  );
}
