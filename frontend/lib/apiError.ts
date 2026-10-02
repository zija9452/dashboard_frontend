/**
 * Text for a failed API response. The backend's error handler sends
 * { error: { type, message, ... } }, a plain HTTPException sends { detail }, and some
 * Next routes send { error: "text" } - a toast needs the text, never the object.
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as { error?: unknown; detail?: unknown; message?: unknown };
  if (typeof b.error === 'string' && b.error) return b.error;
  if (b.error && typeof b.error === 'object' && typeof (b.error as { message?: unknown }).message === 'string') {
    return (b.error as { message: string }).message;
  }
  if (typeof b.detail === 'string' && b.detail) return b.detail;
  if (typeof b.message === 'string' && b.message) return b.message;
  return fallback;
}
