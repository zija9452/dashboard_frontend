// Payment methods shown on Customer Invoice and Customer Payment (one list, so
// both pages offer the same accounts).
export const PAYMENT_METHODS = [
  'Cash',
  'Easypaisa Zohaib',
  'Easypaisa Yasir',
  'Faysal Bank',
  'Islami Bank',
  'Credit',
  'Other',
];

// Methods that need no screenshot; every other method is an online payment.
// Same rule as the backend (models/payment_proof.py).
const OFFLINE_METHODS = ['', 'cash', 'credit', 'other'];

export const isOnlineMethod = (method: string | null | undefined) =>
  !OFFLINE_METHODS.includes((method || '').trim().toLowerCase());

export const MAX_PROOF_IMAGES = 3;
export const PROOF_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const PROOF_MAX_BYTES = 10 * 1024 * 1024; // backend MAX_UPLOAD_SIZE

export type ProofStatus = 'MISSING' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PaymentProof {
  type: string;
  id: string;
  invoice_id: string;
  invoice_no: string;
  customer_name: string | null;
  payment_id: string;
  amount: number;
  payment_method: string;
  payment_date: string | null;
  status: ProofStatus;
  recorded_by_name: string | null;
  recorded_at: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  notes: string | null;
  images: { id: string; file_url: string }[];
}

export const PROOF_STATUS_LABEL: Record<ProofStatus, string> = {
  MISSING: 'Pay slip not attached',
  PENDING: 'Pending verification',
  APPROVED: 'Verified',
  REJECTED: 'Rejected',
};

export const PROOF_STATUS_CLASS: Record<ProofStatus, string> = {
  MISSING: 'bg-orange-100 text-orange-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

/** First problem with the picked files (type / size / count), or null. */
export function proofFilesError(files: File[], alreadyKept = 0): string | null {
  if (files.length + alreadyKept > MAX_PROOF_IMAGES) return `Maximum ${MAX_PROOF_IMAGES} pay slips per payment`;
  for (const f of files) {
    if (!PROOF_IMAGE_TYPES.includes(f.type)) return `${f.name}: only JPG, PNG or WebP images`;
    if (f.size > PROOF_MAX_BYTES) return `${f.name}: must be less than 10MB`;
  }
  return null;
}

// Fired after a proof changes (upload / approve / reject) so badges refresh
export const PAYMENT_PROOFS_CHANGED = 'payment-proofs-changed';

/** Add screenshots to a proof (and optionally keep only some existing ones). */
export async function uploadProofImages(proofId: string, files: File[], keepImageIds?: string[]): Promise<PaymentProof> {
  const form = new FormData();
  if (keepImageIds) form.append('keep_image_ids', JSON.stringify(keepImageIds));
  files.forEach(f => form.append('files', f));
  const response = await fetch(`/api/payment-proofs/${encodeURIComponent(proofId)}/images`, {
    method: 'PUT',
    credentials: 'include',
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.detail || 'Pay slip upload failed');
  try { window.dispatchEvent(new Event(PAYMENT_PROOFS_CHANGED)); } catch { /* ignore */ }
  return data as PaymentProof;
}
