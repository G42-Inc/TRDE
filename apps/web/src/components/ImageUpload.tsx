'use client';

import { useState, useRef } from 'react';
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
}

export function ImageUpload({ attachments, onAttachmentsChange, maxImages = 10, className }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: ImageAttachment[] = [];
    const newPreviewUrls: Record<string, string> = {};

    Array.from(files).slice(0, maxImages - attachments.length).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUri = event.target?.result as string;
          const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const attachment: ImageAttachment = {
            id,
            type: 'image',
            uri: dataUri,
          };
          
          newAttachments.push(attachment);
          newPreviewUrls[id] = dataUri;
          
          // Update state when all files are processed
          if (newAttachments.length === Math.min(files.length, maxImages - attachments.length)) {
            onAttachmentsChange([...attachments, ...newAttachments]);
            setPreviewUrls((prev) => ({ ...prev, ...newPreviewUrls }));
          }
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    const updated = attachments.filter((a) => a.id !== id);
    onAttachmentsChange(updated);
    setPreviewUrls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg border border-black/10 dark:border-white/10 text-black dark:text-white transition-colors"
          >
            <PhotoIcon className="h-4 w-4" />
            <span>Add Screenshot</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {attachments.map((attachment) => {
            const previewUrl = previewUrls[attachment.id] || attachment.uri;
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
                  onClick={() => handleRemove(attachment.id)}
                  className="absolute top-2 right-2 p-1 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <div className="p-2">
                  <input
                    type="text"
                    value={attachment.caption || ''}
                    onChange={(e) => handleCaptionChange(attachment.id, e.target.value)}
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
        <div
          onClick={() => canAddMore && fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-lg p-8 text-center',
            canAddMore
              ? 'border-black/20 dark:border-white/20 cursor-pointer hover:border-accent dark:hover:border-accent-light transition-colors'
              : 'border-black/10 dark:border-white/10 cursor-not-allowed opacity-50'
          )}
        >
          <PhotoIcon className="h-12 w-12 mx-auto text-black/40 dark:text-white/40 mb-2" />
          <p className="text-sm text-black/60 dark:text-white/60">
            {canAddMore ? 'Click to add screenshots' : 'Maximum images reached'}
          </p>
        </div>
      )}
    </div>
  );
}
