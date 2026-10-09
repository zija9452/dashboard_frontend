'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MAX_PROOF_IMAGES, proofFilesError } from '@/lib/paymentMethods';

interface ProofImagePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

/**
 * Screenshots of an online payment, picked before saving (local preview only).
 * They are uploaded after the payment is saved; skipping is allowed (upload later).
 */
const ProofImagePicker: React.FC<ProofImagePickerProps> = ({ files, onChange, onError, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    const next = [...files, ...picked];
    const error = proofFilesError(next);
    if (error) {
      onError(error);
      return;
    }
    onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        Pay Slip <span className="text-gray-500 font-normal">(optional, up to {MAX_PROOF_IMAGES})</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {previews.map((url, i) => (
          <div key={url} className="relative h-16 w-16 rounded border border-gray-300 overflow-hidden bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Pay slip ${i + 1}`} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute top-0 right-0 bg-black/70 text-white text-xs leading-none px-1.5 py-1"
                title="Remove"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {files.length < MAX_PROOF_IMAGES && !disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-16 px-3 rounded border border-dashed border-gray-400 text-sm text-gray-600 hover:bg-gray-50"
          >
            + Attach Pay Slip
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={pick}
        />
      </div>
      {files.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">No pay slip yet? You can attach it later from Payments Record.</p>
      )}
    </div>
  );
};

export default ProofImagePicker;
