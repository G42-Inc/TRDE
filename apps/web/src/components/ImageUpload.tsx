'use client';

import { useState, useRef, useEffect } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import Image from 'next/image';

export interface ImageAttachment {
  id: string;
  type: 'image';
  uri: string;
  caption?: string;
}

interface ImageUploadProps {
  attachments: ImageAttachment[];
  onAttachmentsChange: (attachments: ImageAttachment[]) => void;
  maxImages?: number;
  className?: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function ImageUpload({ attachments, onAttachmentsChange, maxImages = 10, className, disabled = false, onBusyChange }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { onBusyChange?.(reading); }, [reading, onBusyChange]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (!selected.length) return;
    setError(null);
    const files = selected.filter(file => /^image\/(png|jpeg|webp|gif)$/.test(file.type)).slice(0, maxImages - attachments.length);
    if (files.length !== selected.length) setError('Choose PNG, JPEG, WebP or GIF files within the screenshot limit.');
    if (files.some(file => file.size > 2 * 1024 * 1024)) {
      setError('Each screenshot must be 2 MB or smaller.');
      return;
    }
    setReading(true);
    try {
      const additions = await Promise.all(files.map(file => new Promise<ImageAttachment>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Unable to read a screenshot. Please try again.'));
        reader.onload = () => resolve({ id: crypto.randomUUID(), type: 'image', uri: String(reader.result) });
        reader.readAsDataURL(file);
      })));
      onAttachmentsChange([...attachments, ...additions]);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to load screenshots.'); }
    finally { setReading(false); }
  };

  const handleRemove = (id: string) => {
    const updated = attachments.filter((a) => a.id !== id);
    onAttachmentsChange(updated);

  };

  const handleCaptionChange = (id: string, caption: string) => {
    const updated = attachments.map((a) =>
      a.id === id ? { ...a, caption } : a
    );
    onAttachmentsChange(updated);
  };

  const canAddMore = attachments.length < maxImages;

  return (
    <div className={clsx('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-black/60 dark:text-white/60">
          Screenshots ({attachments.length}/{maxImages})
        </label>
        {canAddMore && (
          <button
            type="button"
            disabled={reading || disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg border border-black/10 dark:border-white/10 text-black dark:text-white transition-colors"
          >
            <PhotoIcon className="h-4 w-4" />
            <span>{reading ? 'Loading screenshots…' : 'Add Screenshot'}</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        disabled={reading || disabled}
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <p className="text-xs theme-text-secondary">PNG, JPEG, WebP or GIF, up to 2 MB each. Save the trade to keep your screenshots.</p>
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {attachments.map((attachment) => {
            const previewUrl = attachment.uri;
            return (
              <div
                key={attachment.id}
                className="relative group bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden"
              >
                <Image
                  src={previewUrl}
                  alt={attachment.caption || 'Screenshot'}
                  width={400}
                  height={128}
                  className="w-full h-32 object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  disabled={reading || disabled}
                  onClick={() => handleRemove(attachment.id)}
                  className="absolute top-2 right-2 p-1 bg-danger text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Remove screenshot" aria-label="Remove screenshot"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <div className="p-2">
                  <input
                    type="text"
                    disabled={reading || disabled}
                    value={attachment.caption || ''}
                    onChange={(e) => handleCaptionChange(attachment.id, e.target.value)}
                    aria-label="Screenshot caption"
                    placeholder="Add caption..."
                    className="w-full text-xs bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded px-2 py-1 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {attachments.length === 0 && (
        <button
          type="button" disabled={reading || disabled}
          onClick={() => canAddMore && fileInputRef.current?.click()}
          className={clsx(
            'w-full border-2 border-dashed rounded-lg p-8 text-center',
            canAddMore
              ? 'border-black/20 dark:border-white/20 cursor-pointer hover:border-accent dark:hover:border-accent-light transition-colors'
              : 'border-black/10 dark:border-white/10 cursor-not-allowed opacity-50'
          )}
        >
          <PhotoIcon className="h-12 w-12 mx-auto text-black/40 dark:text-white/40 mb-2" />
          <p className="text-sm text-black/60 dark:text-white/60">
            {canAddMore ? 'Click to add screenshots' : 'Maximum images reached'}
          </p>
        </button>
      )}
    </div>
  );
}
