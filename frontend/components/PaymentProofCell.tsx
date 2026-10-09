'use client';

import React, { useRef, useState } from 'react';
import ImageZoomViewer from '@/components/ui/ImageZoomViewer';
import {
  MAX_PROOF_IMAGES, PROOF_STATUS_CLASS, PROOF_STATUS_LABEL, PaymentProof, proofFilesError, uploadProofImages,
} from '@/lib/paymentMethods';

interface PaymentProofCellProps {
  proof: PaymentProof;
  onChanged: (proof: PaymentProof) => void;
  onError: (message: string) => void;
}

/**
 * Status + screenshots of one online payment, with "Upload" while it is still
 * missing / pending (anyone who records payments can add the screenshot later).
 */
const PaymentProofCell: React.FC<PaymentProofCellProps> = ({ proof, onChanged, onError }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  // A rejected payment is resubmitted by attaching a new pay slip (like a cash deposit)
  const canUpload = proof.status !== 'APPROVED' && proof.images.length < MAX_PROOF_IMAGES;

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const error = proofFilesError(files, proof.images.length);
    if (error) {
      onError(error);
      return;
    }
    setUploading(true);
    try {
      onChanged(await uploadProofImages(proof.id, files));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Pay slip upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${PROOF_STATUS_CLASS[proof.status]}`}>
        {PROOF_STATUS_LABEL[proof.status]}
      </span>
      {proof.status === 'REJECTED' && proof.reject_reason && (
        <span className="text-xs text-red-700">Reason: {proof.reject_reason}</span>
      )}
      {(proof.images.length > 0 || canUpload) && (
        <div className="flex flex-wrap items-center gap-1 no-print">
          {proof.images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setZoomSrc(img.file_url)}
              className="h-10 w-10 rounded border border-gray-300 overflow-hidden"
              title={`Pay slip ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.file_url} alt={`Pay slip ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
          {canUpload && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium px-2 py-1 rounded border border-regal-yellow bg-regal-yellow text-regal-black disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Attach Pay Slip'}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={upload}
          />
        </div>
      )}
      {zoomSrc && <ImageZoomViewer src={zoomSrc} alt="Pay slip" onClose={() => setZoomSrc(null)} />}
    </div>
  );
};

export default PaymentProofCell;
